import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import config from '../config';

// Create Redis client for rate limiting
const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on('error', (err) => {
  console.error('Redis rate limiter error:', err);
});

redisClient.connect().catch(console.error);

// Global rate limiter - use memory store to avoid Redis issues
export const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use memory store for now to avoid Redis connection issues
});

// Stricter rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
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
