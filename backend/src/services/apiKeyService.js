import { v4 as uuidv4 } from 'uuid';

export class ApiKeyService {
  constructor(redis) {
    this.redis = redis;
  }

  /**
   * Create a new project with API keys
   */
  async createProject(name, config = {}) {
    const project = {
      id: `proj_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      name,
      createdAt: Date.now(),
      rules: config.rules || this.getDefaultRules(),
      plan: config.plan || 'free'
    };

    // Generate API keys
    const liveKey = this.generateApiKey('live');
    const testKey = this.generateApiKey('test');

    project.keys = {
      live: { key: liveKey, createdAt: Date.now() },
      test: { key: testKey, createdAt: Date.now() }
    };

    // Store project
    await this.redis.hset('projects', project.id, JSON.stringify(project));

    // Create key -> project mappings for fast lookup
    await this.redis.hset('api_keys', liveKey, project.id);
    await this.redis.hset('api_keys', testKey, project.id);

    return project;
  }

  /**
   * Generate a secure API key
   */
  generateApiKey(prefix = 'live') {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = `th_${prefix}_`;
    for (let i = 0; i < 32; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    return key;
  }

  /**
   * Validate API key and get project
   */
  async validateKey(apiKey) {
    const projectId = await this.redis.hget('api_keys', apiKey);
    if (!projectId) return null;

    const projectData = await this.redis.hget('projects', projectId);
    if (!projectData) return null;

    const project = JSON.parse(projectData);

    // Record usage
    await this.recordUsage(projectId, apiKey);

    return project;
  }

  /**
   * Record API key usage for analytics
   */
  async recordUsage(projectId, apiKey) {
    const now = Date.now();
    const hour = Math.floor(now / 3600000) * 3600000;

    // Increment hourly counter
    await this.redis.hincrby(`usage:${projectId}`, hour.toString(), 1);
    await this.redis.expire(`usage:${projectId}`, 2592000); // 30 days

    // Update last used
    await this.redis.hset(`key_stats:${apiKey}`, 'lastUsed', now);
    await this.redis.hincrby(`key_stats:${apiKey}`, 'totalRequests', 1);
  }

  /**
   * Get usage statistics for a project
   */
  async getUsageStats(projectId, days = 7) {
    const now = Date.now();
    const cutoff = now - days * 24 * 3600000;

    const usage = await this.redis.hgetall(`usage:${projectId}`);

    return Object.entries(usage)
      .filter(([timestamp]) => parseInt(timestamp) >= cutoff)
      .map(([timestamp, count]) => ({
        timestamp: parseInt(timestamp),
        count: parseInt(count)
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Update project rules
   */
  async updateRules(projectId, rules) {
    const projectData = await this.redis.hget('projects', projectId);
    if (!projectData) throw new Error('Project not found');

    const project = JSON.parse(projectData);
    project.rules = { ...project.rules, ...rules };
    project.updatedAt = Date.now();

    await this.redis.hset('projects', projectId, JSON.stringify(project));

    return project;
  }

  /**
   * Rotate API key
   */
  async rotateKey(projectId, keyType) {
    const projectData = await this.redis.hget('projects', projectId);
    if (!projectData) throw new Error('Project not found');

    const project = JSON.parse(projectData);
    const oldKey = project.keys[keyType].key;

    // Generate new key
    const newKey = this.generateApiKey(keyType);
    project.keys[keyType] = { key: newKey, createdAt: Date.now() };

    // Update mappings
    await this.redis.hdel('api_keys', oldKey);
    await this.redis.hset('api_keys', newKey, projectId);
    await this.redis.hset('projects', projectId, JSON.stringify(project));

    return { oldKey: oldKey.slice(0, 15) + '...', newKey };
  }

  /**
   * Get default rate limiting rules
   */
  getDefaultRules() {
    return {
      ip: {
        algorithm: 'sliding_window',
        limit: 100,
        window: 60000, // 1 minute
        burstAllowance: 20
      },
      apiKey: {
        algorithm: 'token_bucket',
        capacity: 1000,
        refillRate: 16.67, // 1000 per minute
        window: 60000
      },
      user: {
        algorithm: 'sliding_window',
        limit: 500,
        window: 60000,
        burstAllowance: 50
      }
    };
  }

  /**
   * Get project by ID
   */
  async getProject(projectId) {
    const data = await this.redis.hget('projects', projectId);
    return data ? JSON.parse(data) : null;
  }

  /**
   * List all projects
   */
  async listProjects() {
    const data = await this.redis.hgetall('projects');
    return Object.values(data).map((p) => JSON.parse(p));
  }

  /**
   * Delete project
   */
  async deleteProject(projectId) {
    const project = await this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    // Remove API keys
    if (project.keys) {
      for (const keyData of Object.values(project.keys)) {
        await this.redis.hdel('api_keys', keyData.key);
      }
    }

    // Remove project
    await this.redis.hdel('projects', projectId);
    await this.redis.del(`usage:${projectId}`);
  }
}

export default ApiKeyService;
