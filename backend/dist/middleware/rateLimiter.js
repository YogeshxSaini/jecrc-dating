"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.messageRateLimiter = exports.likeRateLimiter = exports.authRateLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const redis_1 = require("redis");
const config_1 = __importDefault(require("../config"));
// Create Redis client for rate limiting (optional)
let redisClient = null;
exports.redisClient = redisClient;
// Only connect to Redis if URL is provided
if (config_1.default.redisUrl && config_1.default.redisUrl !== 'redis://localhost:6379') {
    exports.redisClient = redisClient = (0, redis_1.createClient)({
        url: config_1.default.redisUrl,
    });
    redisClient.on('error', (err) => {
        console.warn('Redis rate limiter error (falling back to memory store):', err.message);
    });
    redisClient.connect().catch((err) => {
        console.warn('Redis connection failed, using memory store instead:', err.message);
    });
}
else {
    console.log('Redis not configured, using memory store for rate limiting');
}
// Global rate limiter - use memory store to avoid Redis issues
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.default.rateLimitWindowMs,
    max: config_1.default.rateLimitMaxRequests * 3, // Triple the limit for development
    message: { success: false, error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    // Use memory store for now to avoid Redis connection issues
});
// Stricter rate limiter for auth endpoints - relaxed for development
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes (reduced from 15)
    max: 20, // 20 requests per window (increased from 5)
    message: { success: false, error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    // Use memory store for now
});
// Rate limiter for likes/swipes
exports.likeRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 likes per minute
    message: { success: false, error: 'Slow down! You are liking too fast' },
    standardHeaders: true,
    legacyHeaders: false,
    // Use memory store for now
});
// Rate limiter for messages
exports.messageRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute
    message: { success: false, error: 'You are sending messages too quickly' },
    standardHeaders: true,
    legacyHeaders: false,
    // Use memory store for now
});
//# sourceMappingURL=rateLimiter.js.map