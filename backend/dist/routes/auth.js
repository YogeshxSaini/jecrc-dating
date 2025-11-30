"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const rateLimiter_1 = require("../middleware/rateLimiter");
const auth_1 = require("../middleware/auth");
const config_1 = __importDefault(require("../config"));
const email_1 = require("../utils/email");
const otp_1 = require("../utils/otp");
const router = (0, express_1.Router)();
// Validation schemas
const requestVerificationSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    loginMode: zod_1.z.boolean().optional().default(false),
});
const verifyOTPSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().length(6),
    password: zod_1.z.string().min(8).optional(),
    displayName: zod_1.z.string().min(2).max(50).optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string(),
});
/**
 * POST /api/auth/request-verification
 * Request OTP for email verification (signup or login)
 */
router.post('/request-verification', rateLimiter_1.authRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, loginMode } = requestVerificationSchema.parse(req.body);
    // Validate email domain
    const emailDomain = email.split('@')[1];
    if (emailDomain !== config_1.default.allowedEmailDomain) {
        throw new errorHandler_1.AppError(`Only @${config_1.default.allowedEmailDomain} email addresses are allowed`, 400);
    }
    // Check if user exists
    const existingUser = await index_1.prisma.user.findUnique({
        where: { email },
    });
    // If login mode, user must exist
    if (loginMode && !existingUser) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    // If signup mode, user must not exist
    if (!loginMode && existingUser) {
        throw new errorHandler_1.AppError('User already exists. Please login instead.', 400);
    }
    // Generate OTP
    const otp = (0, otp_1.generateOTP)();
    const otpHash = await bcrypt_1.default.hash(otp, 10);
    // Delete any existing unverified OTPs for this email
    await index_1.prisma.oTP.deleteMany({
        where: {
            email,
            verified: false,
        },
    });
    // Save OTP to database
    const otpRecord = await index_1.prisma.oTP.create({
        data: {
            email,
            otpHash,
            expiresAt: new Date(Date.now() + config_1.default.otpExpiryMinutes * 60 * 1000),
            loginMode,
            userId: existingUser?.id,
        },
    });
    // Send OTP via email
    await (0, email_1.sendEmail)({
        to: email,
        subject: loginMode ? 'Your Login OTP' : 'Verify Your Email',
        html: `
        <h2>Welcome to JECRC Dating!</h2>
        <p>Your verification code is: <strong style="font-size: 24px;">${otp}</strong></p>
        <p>This code will expire in ${config_1.default.otpExpiryMinutes} minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
    res.json({
        success: true,
        message: 'OTP sent to email',
        expiresIn: config_1.default.otpExpiryMinutes * 60,
    });
}));
/**
 * POST /api/auth/verify
 * Verify OTP and create user account or login
 */
router.post('/verify', rateLimiter_1.authRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, otp, password, displayName } = verifyOTPSchema.parse(req.body);
    // Find the OTP record
    const otpRecord = await index_1.prisma.oTP.findFirst({
        where: {
            email,
            verified: false,
            expiresAt: {
                gt: new Date(),
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    if (!otpRecord) {
        throw new errorHandler_1.AppError('Invalid or expired OTP', 400);
    }
    // Check max attempts
    if (otpRecord.attempts >= config_1.default.otpMaxAttempts) {
        throw new errorHandler_1.AppError('Too many failed attempts. Please request a new OTP.', 400);
    }
    // Verify OTP
    const otpValid = await bcrypt_1.default.compare(otp, otpRecord.otpHash);
    if (!otpValid) {
        // Increment attempts
        await index_1.prisma.oTP.update({
            where: { id: otpRecord.id },
            data: { attempts: otpRecord.attempts + 1 },
        });
        throw new errorHandler_1.AppError('Invalid OTP', 400);
    }
    // Mark OTP as verified
    await index_1.prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { verified: true },
    });
    let user;
    if (otpRecord.loginMode) {
        // Login mode - user should exist
        user = await index_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
    }
    else {
        // Signup mode - create new user
        if (!displayName) {
            throw new errorHandler_1.AppError('Display name is required for signup', 400);
        }
        const passwordHash = password ? await bcrypt_1.default.hash(password, 10) : undefined;
        user = await index_1.prisma.user.create({
            data: {
                email,
                displayName,
                passwordHash,
                emailVerified: true,
                profile: {
                    create: {}, // Create empty profile
                },
            },
        });
    }
    // Generate tokens
    const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.default.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, config_1.default.jwtRefreshSecret, { expiresIn: '7d' });
    // Save refresh token
    await index_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
    });
    res.json({
        success: true,
        user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
        },
        accessToken,
        refreshToken,
    });
}));
/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', rateLimiter_1.authRateLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    // Find user
    const user = await index_1.prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new errorHandler_1.AppError('Invalid credentials', 401);
    }
    // Check if user has password (passwordless accounts can't login this way)
    if (!user.passwordHash) {
        throw new errorHandler_1.AppError('Please use passwordless login (OTP)', 400);
    }
    // Verify password
    const passwordValid = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!passwordValid) {
        throw new errorHandler_1.AppError('Invalid credentials', 401);
    }
    // Check if user is banned or inactive
    if (user.isBanned) {
        throw new errorHandler_1.AppError(`Account is banned. Reason: ${user.banReason || 'Policy violation'}`, 403);
    }
    if (!user.isActive) {
        throw new errorHandler_1.AppError('Account is inactive', 403);
    }
    // Generate tokens
    const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, config_1.default.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, config_1.default.jwtRefreshSecret, { expiresIn: '7d' });
    // Save refresh token
    await index_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
    res.json({
        success: true,
        user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
        },
        accessToken,
        refreshToken,
    });
}));
/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    // Verify refresh token
    const decoded = jsonwebtoken_1.default.verify(refreshToken, config_1.default.jwtRefreshSecret);
    // Check if refresh token exists in database
    const tokenRecord = await index_1.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
    });
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        throw new errorHandler_1.AppError('Invalid or expired refresh token', 401);
    }
    // Generate new access token
    const accessToken = jsonwebtoken_1.default.sign({ id: tokenRecord.user.id, email: tokenRecord.user.email, role: tokenRecord.user.role }, config_1.default.jwtSecret, { expiresIn: '15m' });
    res.json({
        success: true,
        accessToken,
    });
}));
/**
 * POST /api/auth/logout
 * Logout and invalidate refresh token
 */
router.post('/logout', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        // Delete the refresh token
        await index_1.prisma.refreshToken.deleteMany({
            where: {
                userId: req.user.id,
                token: refreshToken,
            },
        });
    }
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
}));
/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await index_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            verifiedSelfie: true,
            createdAt: true,
            profile: {
                select: {
                    bio: true,
                    interests: true,
                    gender: true,
                    lookingFor: true,
                    dateOfBirth: true,
                    department: true,
                    year: true,
                    photos: {
                        where: { moderationStatus: 'APPROVED' },
                        orderBy: { order: 'asc' },
                    },
                },
            },
        },
    });
    res.json({
        success: true,
        user,
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map