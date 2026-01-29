import { Router } from 'express';

export function createApiRouter(services) {
  const router = Router();
  const { rateLimiter, apiKeyService, webhookService } = services;

  /**
   * Rate limit check endpoint
   * POST /api/v1/check
   */
  router.post('/check', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      const project = await apiKeyService.validateKey(apiKey);
      if (!project) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const { ip, userId, endpoint } = req.body;
      if (!ip && !userId) {
        return res.status(400).json({
          error: 'At least one identifier (ip or userId) required'
        });
      }

      const result = await rateLimiter.checkMultiLayer(
        { ip, apiKey, userId, endpoint },
        project.rules
      );

      // Set rate limit headers
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      const status = result.allowed ? 200 : 429;
      res.status(status).json({
        allowed: result.allowed,
        remaining: result.remaining,
        resetAt: result.resetAt,
        blockedBy: result.blockedBy
      });
    } catch (error) {
      console.error('Rate limit check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Batch check endpoint
   * POST /api/v1/check/batch
   */
  router.post('/check/batch', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      const project = await apiKeyService.validateKey(apiKey);
      if (!project) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const { requests } = req.body;
      if (!Array.isArray(requests) || requests.length > 100) {
        return res.status(400).json({
          error: 'Requests must be an array with max 100 items'
        });
      }

      const results = await Promise.all(
        requests.map((req) =>
          rateLimiter.checkMultiLayer(
            { ...req, apiKey },
            project.rules
          )
        )
      );

      res.json({ results });
    } catch (error) {
      console.error('Batch check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Get analytics
   * GET /api/v1/analytics
   */
  router.get('/analytics', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      const project = await apiKeyService.validateKey(apiKey);
      if (!project) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const { layer, identifier, hours = 1 } = req.query;

      if (layer && identifier) {
        const analytics = await rateLimiter.getAnalytics(
          layer,
          identifier,
          parseInt(hours) * 3600000
        );
        return res.json(analytics);
      }

      // Return top violators by default
      const topViolators = await rateLimiter.getTopViolators(10);
      const usage = await apiKeyService.getUsageStats(project.id, 7);

      res.json({
        topViolators,
        usage,
        projectId: project.id
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Update rules
   * PUT /api/v1/rules
   */
  router.put('/rules', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }

      const project = await apiKeyService.validateKey(apiKey);
      if (!project) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const updated = await apiKeyService.updateRules(project.id, req.body);
      res.json({ rules: updated.rules });
    } catch (error) {
      console.error('Update rules error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * Webhook management
   */
  router.get('/webhooks', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      const project = await apiKeyService.validateKey(apiKey);
      if (!project) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const webhooks = await webhookService.list(project.id);
      res.json({ webhooks });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/webhooks', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      const project = await apiKeyService.validateKey(apiKey);
      if (!project) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const webhook = await webhookService.register(project.id, req.body);
      res.status(201).json({ webhook });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/webhooks/:id', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      const project = await apiKeyService.validateKey(apiKey);
      if (!project) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      await webhookService.delete(project.id, req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

export default createApiRouter;
