import { Router } from 'express';

export function createDashboardRouter(services) {
  const router = Router();
  const { rateLimiter, apiKeyService, webhookService, redis } = services;

  /**
   * Create new project
   * POST /dashboard/projects
   */
  router.post('/projects', async (req, res) => {
    try {
      const { name, plan } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Project name required' });
      }

      const project = await apiKeyService.createProject(name, { plan });
      res.status(201).json({ project });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * List all projects
   * GET /dashboard/projects
   */
  router.get('/projects', async (req, res) => {
    try {
      const projects = await apiKeyService.listProjects();
      res.json({ projects });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Get project details
   * GET /dashboard/projects/:id
   */
  router.get('/projects/:id', async (req, res) => {
    try {
      const project = await apiKeyService.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const usage = await apiKeyService.getUsageStats(project.id, 7);
      res.json({ project, usage });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Update project rules
   * PUT /dashboard/projects/:id/rules
   */
  router.put('/projects/:id/rules', async (req, res) => {
    try {
      const updated = await apiKeyService.updateRules(req.params.id, req.body);
      res.json({ project: updated });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Rotate API key
   * POST /dashboard/projects/:id/rotate
   */
  router.post('/projects/:id/rotate', async (req, res) => {
    try {
      const { keyType } = req.body;
      if (!['live', 'test'].includes(keyType)) {
        return res.status(400).json({ error: 'Invalid key type' });
      }

      const result = await apiKeyService.rotateKey(req.params.id, keyType);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Delete project
   * DELETE /dashboard/projects/:id
   */
  router.delete('/projects/:id', async (req, res) => {
    try {
      await apiKeyService.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get global analytics
   * GET /dashboard/analytics
   */
  router.get('/analytics', async (req, res) => {
    try {
      const topViolators = await rateLimiter.getTopViolators(20);
      const projects = await apiKeyService.listProjects();

      // Aggregate stats
      let totalRequests = 0;
      let totalViolations = 0;

      for (const project of projects) {
        const usage = await apiKeyService.getUsageStats(project.id, 1);
        totalRequests += usage.reduce((sum, u) => sum + u.count, 0);
      }

      totalViolations = topViolators.reduce((sum, v) => sum + v.count, 0);

      res.json({
        totalProjects: projects.length,
        totalRequests,
        totalViolations,
        topViolators,
        blockRate:
          totalRequests > 0
            ? ((totalViolations / totalRequests) * 100).toFixed(2)
            : 0
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Get real-time stats
   * GET /dashboard/realtime
   */
  router.get('/realtime', async (req, res) => {
    try {
      const now = Date.now();
      const minute = Math.floor(now / 60000) * 60000;

      // Get requests in last minute from all projects
      const projects = await apiKeyService.listProjects();
      let currentMinuteRequests = 0;

      for (const project of projects) {
        const count = await redis.hget(`usage:${project.id}`, minute.toString());
        currentMinuteRequests += parseInt(count) || 0;
      }

      // Get active violations
      const violationCounts = await redis.hgetall('violation_counts');
      const activeViolators = Object.keys(violationCounts).length;

      res.json({
        timestamp: now,
        requestsPerMinute: currentMinuteRequests,
        activeViolators,
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Get geographic distribution
   * GET /dashboard/geo
   */
  router.get('/geo', async (req, res) => {
    try {
      // This would be populated by actual request data
      // For now, return mock distribution
      res.json({
        distribution: {
          US: 45,
          EU: 30,
          APAC: 20,
          OTHER: 5
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

export default createDashboardRouter;
