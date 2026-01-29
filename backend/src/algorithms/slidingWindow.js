/**
 * Sliding Window Counter Algorithm
 *
 * Weighted combination of current and previous window counts.
 * More accurate than fixed window, less memory than sliding log.
 *
 * Tradeoffs:
 * - Pros: Good balance of accuracy and memory, handles boundary cases
 * - Cons: Not 100% precise, slight approximation at window edges
 */

export class SlidingWindow {
  constructor(redis) {
    this.redis = redis;
  }

  /**
   * Check rate limit using sliding window counter
   * @param {string} key - Unique identifier
   * @param {number} limit - Max requests per window
   * @param {number} windowMs - Window size in milliseconds
   * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
   */
  async check(key, limit, windowMs) {
    const now = Date.now();
    const windowKey = `sw:${key}`;

    // Lua script for atomic sliding window operation
    const luaScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local windowMs = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])

      -- Calculate current and previous window timestamps
      local currentWindow = math.floor(now / windowMs)
      local previousWindow = currentWindow - 1

      -- Get counts for both windows
      local currentCount = tonumber(redis.call('HGET', key, currentWindow)) or 0
      local previousCount = tonumber(redis.call('HGET', key, previousWindow)) or 0

      -- Calculate weight of previous window (how much of it overlaps)
      local windowStart = currentWindow * windowMs
      local previousWeight = 1 - ((now - windowStart) / windowMs)

      -- Weighted request count
      local weightedCount = currentCount + (previousCount * previousWeight)

      -- Check if within limit
      local allowed = 0
      if weightedCount < limit then
        -- Increment current window counter
        redis.call('HINCRBY', key, currentWindow, 1)
        redis.call('EXPIRE', key, math.ceil(windowMs / 1000) * 3)
        allowed = 1
        weightedCount = weightedCount + 1
      end

      -- Clean up old windows (keep only current and previous)
      local fields = redis.call('HKEYS', key)
      for i, field in ipairs(fields) do
        local fieldNum = tonumber(field)
        if fieldNum and fieldNum < previousWindow then
          redis.call('HDEL', key, field)
        end
      end

      -- Calculate reset time (end of current window)
      local resetAt = (currentWindow + 1) * windowMs

      local remaining = math.max(0, limit - math.ceil(weightedCount))
      return {allowed, remaining, resetAt}
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      windowKey,
      limit,
      windowMs,
      now
    );

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      resetAt: result[2],
      algorithm: 'sliding_window'
    };
  }

  /**
   * Get current usage without incrementing
   */
  async peek(key, limit, windowMs) {
    const now = Date.now();
    const windowKey = `sw:${key}`;

    const currentWindow = Math.floor(now / windowMs);
    const previousWindow = currentWindow - 1;

    const [currentCount, previousCount] = await this.redis.hmget(
      windowKey,
      currentWindow.toString(),
      previousWindow.toString()
    );

    const windowStart = currentWindow * windowMs;
    const previousWeight = 1 - (now - windowStart) / windowMs;

    const weightedCount =
      (parseInt(currentCount) || 0) +
      (parseInt(previousCount) || 0) * previousWeight;

    return {
      count: Math.ceil(weightedCount),
      remaining: Math.max(0, limit - Math.ceil(weightedCount))
    };
  }
}

export default SlidingWindow;
