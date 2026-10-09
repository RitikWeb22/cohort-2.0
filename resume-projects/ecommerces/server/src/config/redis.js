import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

let redisClient = null;
let isConnected = false;

export const getRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        if (times > 5) {
          logger.warn('Redis reconnection limit reached. Falling back to offline bypass mode.');
          return null; // Stop retrying if Redis is not locally running
        }
        return Math.min(times * 100, 3000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('Connected to Redis');
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      // Do not crash app if redis is not running in local development
      logger.warn(`Redis client notice: ${err.message}`);
    });

    return redisClient;
  } catch (error) {
    logger.warn('Failed to initialize Redis client, proceeding without cache:', error.message);
    return null;
  }
};

export const cacheGet = async (key) => {
  try {
    const client = getRedisClient();
    if (!client || !isConnected) return null;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn(`Cache GET error for key ${key}: ${err.message}`);
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = 300) => {
  try {
    const client = getRedisClient();
    if (!client || !isConnected) return false;
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch (err) {
    logger.warn(`Cache SET error for key ${key}: ${err.message}`);
    return false;
  }
};

export const cacheDel = async (keyOrPattern) => {
  try {
    const client = getRedisClient();
    if (!client || !isConnected) return false;
    if (keyOrPattern.includes('*')) {
      const keys = await client.keys(keyOrPattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } else {
      await client.del(keyOrPattern);
    }
    return true;
  } catch (err) {
    logger.warn(`Cache DEL error for ${keyOrPattern}: ${err.message}`);
    return false;
  }
};
