/**
 * Token Bucket Algorithm
 *
 * Allows bursts up to bucket capacity, then rate-limits smoothly.
 * Tokens refill at a constant rate.
 *
 * Tradeoffs:
 * - Pros: Smooth traffic, allows legitimate bursts, memory efficient
 * - Cons: Slightly more complex, requires atomic operations
 */

export class TokenBucket {
  constructor(redis) {
    this.redis = redis;
  }

  /**
   * Check and consume tokens
   * @param {string} key - Unique identifier (IP, API key, user ID)
   * @param {number} capacity - Max tokens in bucket
   * @param {number} refillRate - Tokens added per second
   * @param {number} tokensToConsume - Tokens needed for this request
   * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
   */
  async consume(key, capacity, refillRate, tokensToConsume = 1) {
    const now = Date.now();
    const bucketKey = `tb:${key}`;

    // Lua script for atomic token bucket operation
    const luaScript = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local tokensToConsume = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])

      -- Get current bucket state
      local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1])
      local lastRefill = tonumber(bucket[2])

      -- Initialize if doesn't exist
      if tokens == nil then
        tokens = capacity
        lastRefill = now
      end

      -- Calculate tokens to add based on time elapsed
      local elapsed = (now - lastRefill) / 1000
      local tokensToAdd = elapsed * refillRate
      tokens = math.min(capacity, tokens + tokensToAdd)

      -- Check if we have enough tokens
      local allowed = 0
      if tokens >= tokensToConsume then
        tokens = tokens - tokensToConsume
        allowed = 1
      end

      -- Save state
      redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
      redis.call('EXPIRE', key, math.ceil(capacity / refillRate) + 60)

      -- Calculate reset time (when bucket will be full)
      local resetIn = (capacity - tokens) / refillRate
      local resetAt = now + (resetIn * 1000)

      return {allowed, math.floor(tokens), resetAt}
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      bucketKey,
      capacity,
      refillRate,
      tokensToConsume,
      now
    );

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      resetAt: Math.floor(result[2]),
      algorithm: 'token_bucket'
    };
  }

  /**
   * Get current bucket state without consuming
   */
  async peek(key, capacity, refillRate) {
    const bucketKey = `tb:${key}`;
    const now = Date.now();

    const bucket = await this.redis.hmget(bucketKey, 'tokens', 'lastRefill');
    let tokens = parseFloat(bucket[0]);
    let lastRefill = parseFloat(bucket[1]);

    if (isNaN(tokens)) {
      return { tokens: capacity, remaining: capacity };
    }

    const elapsed = (now - lastRefill) / 1000;
    const tokensToAdd = elapsed * refillRate;
    tokens = Math.min(capacity, tokens + tokensToAdd);

    return { tokens: Math.floor(tokens), remaining: Math.floor(tokens) };
  }
}

export default TokenBucket;
