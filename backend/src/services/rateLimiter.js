import { TokenBucket } from '../algorithms/tokenBucket.js';
import { SlidingWindow } from '../algorithms/slidingWindow.js';
import { FixedWindow } from '../algorithms/fixedWindow.js';
import geoip from 'geoip-lite';

export class RateLimiter {
  constructor(redis) {
    this.redis = redis;
    this.tokenBucket = new TokenBucket(redis);
    this.slidingWindow = new SlidingWindow(redis);
    this.fixedWindow = new FixedWindow(redis);

    // In-memory cache for rules (sync with Redis periodically)
    this.rulesCache = new Map();
    this.webhookQueue = [];
  }

  /**
   * Multi-layer rate limit check
   * Checks in order: IP → API Key → User ID
   */
  async checkMultiLayer(request, rules) {
    const { ip, apiKey, userId, endpoint } = request;
    const results = [];
    const geo = ip ? geoip.lookup(ip) : null;
    const country = geo?.country || 'UNKNOWN';

    // Layer 1: IP-based limiting (DDoS protection)
    if (ip && rules.ip) {
      const ipRule = this.getGeoAdjustedRule(rules.ip, country);
      const result = await this.check(`ip:${ip}`, ipRule);
      results.push({ layer: 'ip', identifier: ip, ...result });
      if (!result.allowed) {
        await this.recordViolation('ip', ip, endpoint, result);
        return this.buildResponse(results, 'ip');
      }
    }

    // Layer 2: API Key limiting (per-customer quotas)
    if (apiKey && rules.apiKey) {
      const keyRule = this.getGeoAdjustedRule(rules.apiKey, country);
      const result = await this.check(`key:${apiKey}`, keyRule);
      results.push({ layer: 'apiKey', identifier: apiKey, ...result });
      if (!result.allowed) {
        await this.recordViolation('apiKey', apiKey, endpoint, result);
        return this.buildResponse(results, 'apiKey');
      }
    }

    // Layer 3: User ID limiting (authenticated user quotas)
    if (userId && rules.user) {
      const userRule = this.getGeoAdjustedRule(rules.user, country);
      const result = await this.check(`user:${userId}`, userRule);
      results.push({ layer: 'user', identifier: userId, ...result });
      if (!result.allowed) {
        await this.recordViolation('user', userId, endpoint, result);
        return this.buildResponse(results, 'user');
      }
    }

    // Layer 4: Endpoint-specific limiting (optional)
    if (endpoint && rules.endpoint) {
      const key = userId || apiKey || ip;
      const result = await this.check(`ep:${endpoint}:${key}`, rules.endpoint);
      results.push({ layer: 'endpoint', identifier: `${endpoint}:${key}`, ...result });
      if (!result.allowed) {
        await this.recordViolation('endpoint', key, endpoint, result);
        return this.buildResponse(results, 'endpoint');
      }
    }

    return this.buildResponse(results, null);
  }

  /**
   * Single check using specified algorithm
   */
  async check(key, rule) {
    const { algorithm, limit, window, capacity, refillRate, burstAllowance } =
      rule;

    // Apply burst allowance if configured
    const effectiveLimit = burstAllowance ? limit + burstAllowance : limit;

    switch (algorithm) {
      case 'token_bucket':
        return await this.tokenBucket.consume(
          key,
          capacity || effectiveLimit,
          refillRate || effectiveLimit / (window / 1000),
          1
        );

      case 'sliding_window':
        return await this.slidingWindow.check(key, effectiveLimit, window);

      case 'fixed_window':
      default:
        return await this.fixedWindow.check(key, effectiveLimit, window);
    }
  }

  /**
   * Adjust rules based on geographic location
   */
  getGeoAdjustedRule(baseRule, country) {
    if (!baseRule.geoRules || !baseRule.geoRules[country]) {
      return baseRule;
    }

    return {
      ...baseRule,
      ...baseRule.geoRules[country]
    };
  }

  /**
   * Record rate limit violation for analytics and webhooks
   */
  async recordViolation(layer, identifier, endpoint, result) {
    const violation = {
      layer,
      identifier,
      endpoint,
      timestamp: Date.now(),
      result
    };

    // Store violation in Redis for analytics
    const key = `violations:${layer}:${identifier}`;
    await this.redis.lpush(key, JSON.stringify(violation));
    await this.redis.ltrim(key, 0, 99); // Keep last 100
    await this.redis.expire(key, 86400); // 24 hour TTL

    // Increment violation counter
    await this.redis.hincrby('violation_counts', `${layer}:${identifier}`, 1);

    // Check if webhook threshold reached
    await this.checkWebhookThreshold(layer, identifier);
  }

  /**
   * Check if we should fire a webhook alert
   */
  async checkWebhookThreshold(layer, identifier) {
    const count = await this.redis.hget(
      'violation_counts',
      `${layer}:${identifier}`
    );

    // Alert thresholds
    const thresholds = [10, 50, 100, 500, 1000];

    if (thresholds.includes(parseInt(count))) {
      this.webhookQueue.push({
        type: 'threshold_reached',
        layer,
        identifier,
        count: parseInt(count),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get pending webhooks and clear queue
   */
  getWebhookQueue() {
    const queue = [...this.webhookQueue];
    this.webhookQueue = [];
    return queue;
  }

  /**
   * Build unified response
   */
  buildResponse(results, blockedBy) {
    const lowestRemaining = Math.min(...results.map((r) => r.remaining));
    const earliestReset = Math.min(...results.map((r) => r.resetAt));

    return {
      allowed: blockedBy === null,
      blockedBy,
      remaining: lowestRemaining,
      resetAt: earliestReset,
      layers: results,
      headers: {
        'X-RateLimit-Limit': results[0]?.limit || 0,
        'X-RateLimit-Remaining': lowestRemaining,
        'X-RateLimit-Reset': Math.ceil(earliestReset / 1000),
        'X-RateLimit-Policy': results.map((r) => r.algorithm).join(',')
      }
    };
  }

  /**
   * Get analytics for a specific identifier
   */
  async getAnalytics(layer, identifier, timeRange = 3600000) {
    const now = Date.now();
    const key = `violations:${layer}:${identifier}`;

    const violations = await this.redis.lrange(key, 0, -1);
    const parsed = violations.map((v) => JSON.parse(v));

    // Filter by time range
    const recent = parsed.filter((v) => now - v.timestamp < timeRange);

    // Group by endpoint
    const byEndpoint = recent.reduce((acc, v) => {
      acc[v.endpoint] = (acc[v.endpoint] || 0) + 1;
      return acc;
    }, {});

    // Time series (per minute)
    const timeSeries = recent.reduce((acc, v) => {
      const minute = Math.floor(v.timestamp / 60000) * 60000;
      acc[minute] = (acc[minute] || 0) + 1;
      return acc;
    }, {});

    return {
      total: recent.length,
      byEndpoint,
      timeSeries: Object.entries(timeSeries)
        .map(([time, count]) => ({ time: parseInt(time), count }))
        .sort((a, b) => a.time - b.time)
    };
  }

  /**
   * Get top violators across all layers
   */
  async getTopViolators(limit = 10) {
    const all = await this.redis.hgetall('violation_counts');

    return Object.entries(all)
      .map(([key, count]) => {
        const [layer, ...identifierParts] = key.split(':');
        return {
          layer,
          identifier: identifierParts.join(':'),
          count: parseInt(count)
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

export default RateLimiter;
