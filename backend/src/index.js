import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import dotenv from 'dotenv';

import { RateLimiter } from './services/rateLimiter.js';
import { ApiKeyService } from './services/apiKeyService.js';
import { WebhookService } from './services/webhookService.js';
import { createApiRouter } from './routes/api.js';
import { createDashboardRouter } from './routes/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

// Initialize services
const rateLimiter = new RateLimiter(redis);
const apiKeyService = new ApiKeyService(redis);
const webhookService = new WebhookService(redis);

const services = { rateLimiter, apiKeyService, webhookService, redis };

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    redis: redis.status,
    uptime: process.uptime()
  });
});

// API routes (for SDK clients)
app.use('/api/v1', createApiRouter(services));

// Dashboard routes (for admin UI)
app.use('/dashboard', createDashboardRouter(services));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

// Webhook processor (runs every 5 seconds)
setInterval(async () => {
  const queue = rateLimiter.getWebhookQueue();
  if (queue.length === 0) return;

  const projects = await apiKeyService.listProjects();
  for (const event of queue) {
    for (const project of projects) {
      await webhookService.send(project.id, event);
    }
  }
}, 5000);

// Start server
async function start() {
  try {
    await redis.connect();
    app.listen(PORT, () => {
      console.log(`Throttle.io API running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
