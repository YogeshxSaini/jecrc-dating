import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import config from '../config';

// Create Redis client for rate limiting (optional)
let redisClient: any = null;

// Only connect to Redis if URL is provided
if (config.redisUrl && config.redisUrl !== 'redis://localhost:6379') {
  redisClient = createClient({
    url: config.redisUrl,
  });

  redisClient.on('error', (err: any) => {
    console.warn('Redis rate limiter error (falling back to memory store):', err.message);
  });

  redisClient.connect().catch((err: any) => {
    console.warn('Redis connection failed, using memory store instead:', err.message);
  });
} else {
  console.log('Redis not configured, using memory store for rate limiting');
}

// Global rate limiter - use memory store to avoid Redis issues
export const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests * 3, // Triple the limit for development
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use memory store for now to avoid Redis connection issues
});

// Stricter rate limiter for auth endpoints - relaxed for development
export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (reduced from 15)
  max: 20, // 20 requests per window (increased from 5)
  message: { success: false, error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use memory store for now
});

// Rate limiter for likes/swipes
export const likeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 likes per minute
  message: { success: false, error: 'Slow down! You are liking too fast' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use memory store for now
});

// Rate limiter for messages
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: { success: false, error: 'You are sending messages too quickly' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use memory store for now
});

export { redisClient };
