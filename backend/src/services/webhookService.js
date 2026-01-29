import axios from 'axios';

export class WebhookService {
  constructor(redis) {
    this.redis = redis;
    this.retryDelays = [1000, 5000, 30000, 60000]; // Exponential backoff
  }

  /**
   * Register a webhook endpoint
   */
  async register(projectId, config) {
    const webhook = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      projectId,
      url: config.url,
      secret: config.secret || this.generateSecret(),
      events: config.events || ['threshold_reached', 'burst_detected'],
      thresholds: config.thresholds || { violations: 50, burst: 10 },
      enabled: true,
      createdAt: Date.now()
    };

    await this.redis.hset(
      `webhooks:${projectId}`,
      webhook.id,
      JSON.stringify(webhook)
    );

    return webhook;
  }

  /**
   * Send webhook notification
   */
  async send(projectId, event) {
    const webhooksData = await this.redis.hgetall(`webhooks:${projectId}`);
    const webhooks = Object.values(webhooksData).map((w) => JSON.parse(w));

    const relevantWebhooks = webhooks.filter(
      (w) => w.enabled && w.events.includes(event.type)
    );

    const results = await Promise.allSettled(
      relevantWebhooks.map((webhook) => this.deliver(webhook, event))
    );

    return results.map((r, i) => ({
      webhookId: relevantWebhooks[i].id,
      status: r.status,
      error: r.reason?.message
    }));
  }

  /**
   * Deliver webhook with retry logic
   */
  async deliver(webhook, event, attempt = 0) {
    const payload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: event.type,
      timestamp: Date.now(),
      data: event
    };

    const signature = this.sign(payload, webhook.secret);

    try {
      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Throttle-Signature': signature,
          'X-Throttle-Timestamp': payload.timestamp.toString()
        },
        timeout: 10000
      });

      // Log successful delivery
      await this.logDelivery(webhook.id, payload.id, 'success', response.status);

      return { success: true, status: response.status };
    } catch (error) {
      // Log failed attempt
      await this.logDelivery(
        webhook.id,
        payload.id,
        'failed',
        error.response?.status || 0,
        error.message
      );

      // Retry with exponential backoff
      if (attempt < this.retryDelays.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelays[attempt])
        );
        return this.deliver(webhook, event, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Sign payload with webhook secret
   */
  sign(payload, secret) {
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Log webhook delivery attempt
   */
  async logDelivery(webhookId, eventId, status, httpStatus, error = null) {
    const log = {
      webhookId,
      eventId,
      status,
      httpStatus,
      error,
      timestamp: Date.now()
    };

    await this.redis.lpush(`webhook_logs:${webhookId}`, JSON.stringify(log));
    await this.redis.ltrim(`webhook_logs:${webhookId}`, 0, 99);
    await this.redis.expire(`webhook_logs:${webhookId}`, 604800); // 7 days
  }

  /**
   * Get webhook delivery logs
   */
  async getLogs(webhookId, limit = 50) {
    const logs = await this.redis.lrange(`webhook_logs:${webhookId}`, 0, limit - 1);
    return logs.map((l) => JSON.parse(l));
  }

  /**
   * Generate webhook secret
   */
  generateSecret() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let secret = 'whsec_';
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  }

  /**
   * Update webhook config
   */
  async update(projectId, webhookId, updates) {
    const data = await this.redis.hget(`webhooks:${projectId}`, webhookId);
    if (!data) throw new Error('Webhook not found');

    const webhook = { ...JSON.parse(data), ...updates, updatedAt: Date.now() };
    await this.redis.hset(
      `webhooks:${projectId}`,
      webhookId,
      JSON.stringify(webhook)
    );

    return webhook;
  }

  /**
   * Delete webhook
   */
  async delete(projectId, webhookId) {
    await this.redis.hdel(`webhooks:${projectId}`, webhookId);
    await this.redis.del(`webhook_logs:${webhookId}`);
  }

  /**
   * List all webhooks for a project
   */
  async list(projectId) {
    const data = await this.redis.hgetall(`webhooks:${projectId}`);
    return Object.values(data).map((w) => JSON.parse(w));
  }
}

export default WebhookService;
