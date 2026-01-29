/**
 * Fixed Window Algorithm
 *
 * Simple counter that resets at fixed intervals.
 *
 * Tradeoffs:
 * - Pros: Simple to implement, very memory efficient, easy to understand
 * - Cons: Boundary burst problem (2x requests possible at window edges)
 */

export class FixedWindow {
  constructor(redis) {
    this.redis = redis;
  }

  /**
   * Check rate limit using fixed window
   * @param {string} key - Unique identifier
   * @param {number} limit - Max requests per window
   * @param {number} windowMs - Window size in milliseconds
   * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
   */
  async check(key, limit, windowMs) {
    const now = Date.now();
    const currentWindow = Math.floor(now / windowMs);
    const windowKey = `fw:${key}:${currentWindow}`;

    // Lua script for atomic increment and check
    const luaScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local ttl = tonumber(ARGV[2])

      local current = redis.call('INCR', key)

      -- Set expiry only on first request of window
      if current == 1 then
        redis.call('PEXPIRE', key, ttl)
      end

      local allowed = 0
      if current <= limit then
        allowed = 1
      end

      local remaining = math.max(0, limit - current)
      return {allowed, remaining, current}
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      windowKey,
      limit,
      windowMs
    );

    // Calculate when this window resets
    const resetAt = (currentWindow + 1) * windowMs;

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      current: result[2],
      resetAt,
      algorithm: 'fixed_window'
    };
  }

  /**
   * Get current count without incrementing
   */
  async peek(key, limit, windowMs) {
    const now = Date.now();
    const currentWindow = Math.floor(now / windowMs);
    const windowKey = `fw:${key}:${currentWindow}`;

    const current = (await this.redis.get(windowKey)) || 0;

    return {
      count: parseInt(current),
      remaining: Math.max(0, limit - parseInt(current))
    };
  }
}

export default FixedWindow;
