import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate, AuthRequest } from '../middleware/auth';
import config from '../config';
import { sendEmail, EmailProvider } from '../utils/email';
import { generateOTP } from '../utils/otp';

const router = Router();

// Validation schemas
const requestVerificationSchema = z.object({
  email: z.string().email(),
  loginMode: z.boolean().optional().default(false),
});

const verifyOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(8).optional(),
  displayName: z.string().min(2).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

/**
 * POST /api/auth/request-verification
 * Request OTP for email verification (signup or login)
 */
router.post(
  '/request-verification',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, loginMode } = requestVerificationSchema.parse(req.body);

    // Validate email domain
    const emailDomain = email.split('@')[1];
    if (emailDomain !== config.allowedEmailDomain) {
      throw new AppError(
        `Only @${config.allowedEmailDomain} email addresses are allowed`,
        400
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // If login mode, user must exist
    if (loginMode && !existingUser) {
      throw new AppError('User not found', 404);
    }

    // If signup mode, user must not exist
    if (!loginMode && existingUser) {
      throw new AppError('User already exists. Please login instead.', 400);
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    // Delete any existing unverified OTPs for this email
    await prisma.oTP.deleteMany({
      where: {
        email,
        verified: false,
      },
    });

    // Save OTP to database
    const otpRecord = await prisma.oTP.create({
      data: {
        email,
        otpHash,
        expiresAt: new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000),
        loginMode,
        userId: existingUser?.id,
      },
    });

    // Send OTP via email
    await sendEmail({
      to: email,
      subject: loginMode ? 'Your Login OTP' : 'Verify Your Email',
      html: `
        <h2>Welcome to JECRC Dating!</h2>
        <p>Your verification code is: <strong style="font-size: 24px;">${otp}</strong></p>
        <p>This code will expire in ${config.otpExpiryMinutes} minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    res.json({
      success: true,
      message: 'OTP sent to email',
      expiresIn: config.otpExpiryMinutes * 60,
    });
  })
);

/**
 * POST /api/auth/verify
 * Verify OTP and create user account or login
 */
router.post(
  '/verify',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, otp, password, displayName } = verifyOTPSchema.parse(req.body);

    // Find the OTP record
    const otpRecord = await prisma.oTP.findFirst({
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
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Check max attempts
    if (otpRecord.attempts >= config.otpMaxAttempts) {
      throw new AppError('Too many failed attempts. Please request a new OTP.', 400);
    }

    // Verify OTP
    const otpValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!otpValid) {
      // Increment attempts
      await prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      throw new AppError('Invalid OTP', 400);
    }

    // Mark OTP as verified
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    let user;

    if (otpRecord.loginMode) {
      // Login mode - user should exist
      user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }
    } else {
      // Signup mode - create new user
      if (!displayName) {
        throw new AppError('Display name is required for signup', 400);
      }

      const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

      user = await prisma.user.create({
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
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      config.jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    // Save refresh token
    await prisma.refreshToken.create({
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
  })
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if user has password (passwordless accounts can't login this way)
    if (!user.passwordHash) {
      throw new AppError('Please use passwordless login (OTP)', 400);
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if user is banned or inactive
    if (user.isBanned) {
      throw new AppError(`Account is banned. Reason: ${user.banReason || 'Policy violation'}`, 403);
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', 403);
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      config.jwtRefreshSecret,
      { expiresIn: '7d' }
    );

    // Save refresh token
    await prisma.refreshToken.create({
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
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret as string) as { id: string };

    // Check if refresh token exists in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { id: tokenRecord.user.id, email: tokenRecord.user.email, role: tokenRecord.user.role },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      accessToken,
    });
  })
);

/**
 * POST /api/auth/logout
 * Logout and invalidate refresh token
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete the refresh token
      await prisma.refreshToken.deleteMany({
        where: {
          userId: req.user!.id,
          token: refreshToken,
        },
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
  })
);

export default router;
