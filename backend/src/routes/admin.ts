import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import { sendPhotoVerificationEmail } from '../utils/email';

const router = Router();

// Apply admin middleware to all routes
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/photo-verifications
 * Get photo verification queue
 */
router.get(
  '/photo-verifications',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    const verifications = await prisma.photoVerification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      skip: offset,
      take: limit,
    });

    const total = await prisma.photoVerification.count({ where });

    res.json({
      success: true,
      verifications,
      total,
      hasMore: offset + limit < total,
    });
  })
);

/**
 * POST /api/admin/photo-verifications/:id/review
 * Approve or reject photo verification
 */
router.post(
  '/photo-verifications/:id/review',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const schema = z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      reason: z.string().optional(),
    });

    const { status, reason } = schema.parse(req.body);

    const verification = await prisma.photoVerification.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!verification) {
      throw new AppError('Verification not found', 404);
    }

    // Update verification
    await prisma.photoVerification.update({
      where: { id },
      data: {
        status,
        reason,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    // Update user's verified_selfie flag
    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        verifiedSelfie: status === 'APPROVED',
      },
    });

    // Send notification
    await prisma.notification.create({
      data: {
        userId: verification.userId,
        type: 'PROFILE_VERIFIED',
        title: status === 'APPROVED' ? 'Verification Approved!' : 'Verification Rejected',
        message:
          status === 'APPROVED'
            ? 'Your photo verification has been approved!'
            : `Your photo verification was rejected. ${reason || ''}`,
        data: { verificationId: id },
      },
    });

    // Send email
    await sendPhotoVerificationEmail(
      verification.user.email,
      status === 'APPROVED' ? 'approved' : 'rejected',
      reason
    );

    res.json({
      success: true,
      message: 'Verification reviewed',
    });
  })
);

/**
 * GET /api/admin/reports
 * Get user reports
 */
router.get(
  '/reports',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (status && ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'].includes(status)) {
      where.status = status;
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        reported: {
          select: {
            id: true,
            email: true,
            displayName: true,
            isBanned: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    const total = await prisma.report.count({ where });

    res.json({
      success: true,
      reports,
      total,
      hasMore: offset + limit < total,
    });
  })
);

/**
 * POST /api/admin/reports/:id/review
 * Review a report
 */
router.post(
  '/reports/:id/review',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const schema = z.object({
      status: z.enum(['REVIEWED', 'RESOLVED', 'DISMISSED']),
      resolution: z.string(),
    });

    const { status, resolution } = schema.parse(req.body);

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new AppError('Report not found', 404);
    }

    await prisma.report.update({
      where: { id },
      data: {
        status,
        resolution,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Report reviewed',
    });
  })
);

/**
 * POST /api/admin/users/:id/ban
 * Ban a user
 */
router.post(
  '/users/:id/ban',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new AppError('Ban reason is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role === 'ADMIN') {
      throw new AppError('Cannot ban admin users', 403);
    }

    await prisma.user.update({
      where: { id },
      data: {
        isBanned: true,
        banReason: reason,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: id,
        type: 'ACCOUNT_WARNING',
        title: 'Account Banned',
        message: `Your account has been banned. Reason: ${reason}`,
        data: { reason },
      },
    });

    res.json({
      success: true,
      message: 'User banned',
    });
  })
);

/**
 * POST /api/admin/users/:id/unban
 * Unban a user
 */
router.post(
  '/users/:id/unban',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    await prisma.user.update({
      where: { id },
      data: {
        isBanned: false,
        banReason: null,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: id,
        type: 'ACCOUNT_WARNING',
        title: 'Account Unbanned',
        message: 'Your account has been unbanned. Please follow community guidelines.',
        data: {},
      },
    });

    res.json({
      success: true,
      message: 'User unbanned',
    });
  })
);

/**
 * GET /api/admin/stats
 * Get platform statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      totalMatches,
      totalMessages,
      pendingVerifications,
      pendingReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true, isBanned: false } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.match.count(),
      prisma.message.count(),
      prisma.photoVerification.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    // Get users created in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersThisWeek = await prisma.user.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        totalMatches,
        totalMessages,
        pendingVerifications,
        pendingReports,
        newUsersThisWeek,
      },
    });
  })
);

/**
 * GET /api/admin/users
 * Get all users (with pagination)
 */
router.get(
  '/users',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        verifiedSelfie: true,
        createdAt: true,
        lastActiveAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      users,
      total,
      hasMore: offset + limit < total,
    });
  })
);

export default router;
