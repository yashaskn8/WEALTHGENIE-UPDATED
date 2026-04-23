import { createClient } from 'redis';

let redisClient = null;
let redisAvailable = false;

/**
 * Initialize Redis connection.
 * Falls back gracefully if Redis is not available (dev environments).
 */
const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      console.warn('⚠️  Redis error:', err.message);
      redisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      redisAvailable = true;
    });

    await redisClient.connect();
    redisAvailable = true;
  } catch (error) {
    console.warn('⚠️  Redis not available — running without cache:', error.message);
    redisAvailable = false;
  }
};

/**
 * Get cached value by key. Returns null if Redis is unavailable or key doesn't exist.
 */
const getCache = async (key) => {
  if (!redisAvailable || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * Set cache with TTL (default 24 hours).
 */
const setCache = async (key, value, ttlSeconds = 86400) => {
  if (!redisAvailable || !redisClient) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Silently fail — caching is non-critical
  }
};

/**
 * Delete a cache key.
 */
const delCache = async (key) => {
  if (!redisAvailable || !redisClient) return;
  try {
    await redisClient.del(key);
  } catch {
    // Silently fail
  }
};

export { connectRedis, getCache, setCache, delCache, redisClient };
