import Redis from 'ioredis';
import { logger } from '../logger.js';

let redisClient = null;
let isRedisConnected = false;

// Fallback high-performance in-memory cache for development/offline resilience
const memoryCache = new Map();

function cleanMemoryCache() {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (now > item.expiresAt) {
      memoryCache.delete(key);
    }
  }
}
const memCleanupInterval = setInterval(cleanMemoryCache, 60 * 1000);
if (memCleanupInterval.unref) memCleanupInterval.unref();

/**
 * Initialize Redis connection with resilient reconnects and non-blocking fallback
 */
export function initRedis() {
  const redisUrl = process.env.REDIS_URL;

  // If no REDIS_URL provided and NODE_ENV is test, don't attempt external network connection
  if (!redisUrl && process.env.NODE_ENV === 'test') {
    return null;
  }

  try {
    const options = {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('Redis connection retry limit reached. Operating in memory-cache fallback mode.');
          return null; // Stop retrying
        }
        return Math.min(times * 100, 1000);
      },
    };

    redisClient = redisUrl ? new Redis(redisUrl, options) : new Redis(options);

    redisClient.on('connect', () => {
      isRedisConnected = true;
      logger.info('Connected to Redis cache cluster successfully');
    });

    redisClient.on('ready', () => {
      isRedisConnected = true;
    });

    redisClient.on('error', (err) => {
      isRedisConnected = false;
      logger.warn({ err: err.message }, 'Redis connection unavailable; continuing with in-memory caching fallback');
    });

    redisClient.on('close', () => {
      isRedisConnected = false;
    });

    // Attempt initial connect asynchronously without blocking server start
    redisClient.connect().catch((err) => {
      isRedisConnected = false;
      logger.info({ err: err.message }, 'Redis offline; active in-memory cache fallback enabled');
    });

    return redisClient;
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to initialize Redis client. Falling back to in-memory cache.');
    isRedisConnected = false;
    return null;
  }
}

/**
 * Get cached item (Redis preferred, memory fallback)
 */
export async function cacheGet(key) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Redis get error; falling back to memory');
    }
  }

  // Memory fallback
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
}

/**
 * Set cached item with TTL in seconds
 */
export async function cacheSet(key, value, ttlSeconds = 300) {
  const serialized = JSON.stringify(value);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
      return true;
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Redis set error; caching in memory');
    }
  }

  // Memory fallback
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return true;
}

/**
 * Delete cached item
 */
export async function cacheDel(key) {
  memoryCache.delete(key);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return true;
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Redis del error');
    }
  }
  return true;
}

/**
 * Invalidate all cache keys matching a prefix (e.g. 'dashboard:user_123:*')
 */
export async function cacheDelPrefix(prefix) {
  // Clear memory cache entries
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  if (isRedisConnected && redisClient) {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      logger.warn({ err: err.message, prefix }, 'Redis delPrefix scan error');
    }
  }
}

/**
 * Express middleware for high-performance route response caching
 * @param {Object} options
 * @param {number} options.ttl - Time to live in seconds (default: 60)
 * @param {Function} [options.keyGenerator] - Custom cache key generator function
 */
export function cacheMiddleware(options = {}) {
  const ttl = options.ttl || 60;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const userId = req.user?._id?.toString() || 'public';
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : `http_cache:${userId}:${req.baseUrl}${req.path}:${JSON.stringify(req.query)}`;

    try {
      const cachedResponse = await cacheGet(key);
      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Engine', isRedisConnected ? 'Redis' : 'Memory-Fallback');
        return res.json(cachedResponse);
      }

      res.setHeader('X-Cache', 'MISS');

      // Intercept res.json to populate cache
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheSet(key, body, ttl).catch((err) => {
            logger.warn({ err: err.message, key }, 'Failed to write to cache');
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      logger.warn({ err: err.message }, 'Cache middleware execution error; bypassing');
      next();
    }
  };
}

/**
 * Helper to invalidate all cached data for a specific user on write operations
 */
export async function invalidateUserCache(userId) {
  if (!userId) return;
  const uid = userId.toString();
  await Promise.all([
    cacheDelPrefix(`http_cache:${uid}:`),
    cacheDel(`dashboard:${uid}`),
    cacheDel(`sub_status:${uid}`),
  ]);
}

export function getCacheStatus() {
  return {
    engine: isRedisConnected ? 'redis' : 'memory_fallback',
    isRedisConnected,
    memoryCacheEntries: memoryCache.size,
  };
}
