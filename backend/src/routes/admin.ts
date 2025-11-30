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

    // Log action
    await createAuditLog(
      req.user!.id,
      'BAN_USER',
      'USER',
      id,
      { reason, email: user.email },
      req
    );

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

    const user = await prisma.user.findUnique({ where: { id } });
    
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

    // Log action
    await createAuditLog(
      req.user!.id,
      'UNBAN_USER',
      'USER',
      id,
      { email: user?.email },
      req
    );

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
 * GET /api/admin/analytics
 * Get detailed analytics data
 */
router.get(
  '/analytics',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily user signups
    const dailySignups = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM users
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Get daily matches
    const dailyMatches = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM matches
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Get daily messages
    const dailyMessages = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM messages
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Get user distribution by department
    const usersByDepartment = await prisma.$queryRaw<Array<{ department: string; count: bigint }>>`
      SELECT p.department, COUNT(*)::bigint as count
      FROM profiles p
      WHERE p.department IS NOT NULL
      GROUP BY p.department
      ORDER BY count DESC
      LIMIT 10
    `;

    // Get user distribution by year
    const usersByYear = await prisma.$queryRaw<Array<{ year: number; count: bigint }>>`
      SELECT p.year, COUNT(*)::bigint as count
      FROM profiles p
      WHERE p.year IS NOT NULL
      GROUP BY p.year
      ORDER BY p.year ASC
    `;

    // Get match rate (users with at least one match)
    const usersWithMatches = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT user_id)::bigint as count
      FROM (
        SELECT user_a_id as user_id FROM matches
        UNION
        SELECT user_b_id as user_id FROM matches
      ) as matched_users
    `;

    const totalUsers = await prisma.user.count();
    const matchRate = totalUsers > 0 ? (Number(usersWithMatches[0]?.count || 0) / totalUsers) * 100 : 0;

    // Get most active users (by messages sent)
    const mostActiveUsers = await prisma.$queryRaw<Array<{ 
      user_id: string; 
      email: string; 
      display_name: string | null;
      message_count: bigint 
    }>>`
      SELECT u.id as user_id, u.email, u.display_name, COUNT(m.id)::bigint as message_count
      FROM users u
      JOIN messages m ON m.sender_id = u.id
      GROUP BY u.id, u.email, u.display_name
      ORDER BY message_count DESC
      LIMIT 10
    `;

    res.json({
      success: true,
      analytics: {
        dailySignups: dailySignups.map(d => ({ date: d.date, count: Number(d.count) })),
        dailyMatches: dailyMatches.map(d => ({ date: d.date, count: Number(d.count) })),
        dailyMessages: dailyMessages.map(d => ({ date: d.date, count: Number(d.count) })),
        usersByDepartment: usersByDepartment.map(d => ({ department: d.department, count: Number(d.count) })),
        usersByYear: usersByYear.map(d => ({ year: d.year, count: Number(d.count) })),
        matchRate: matchRate.toFixed(2),
        mostActiveUsers: mostActiveUsers.map(u => ({
          userId: u.user_id,
          email: u.email,
          displayName: u.display_name,
          messageCount: Number(u.message_count)
        })),
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
    const department = req.query.department as string;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const verified = req.query.verified as string;
    const banned = req.query.banned as string;
    const activityLevel = req.query.activityLevel as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Advanced filters
    if (department) {
      where.profile = { department };
    }
    if (year !== undefined) {
      where.profile = { ...where.profile, year };
    }
    if (verified === 'true') {
      where.verifiedSelfie = true;
    } else if (verified === 'false') {
      where.verifiedSelfie = false;
    }
    if (banned === 'true') {
      where.isBanned = true;
    } else if (banned === 'false') {
      where.isBanned = false;
    }
    if (activityLevel === 'active') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.lastActiveAt = { gte: sevenDaysAgo };
    } else if (activityLevel === 'inactive') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.lastActiveAt = { lt: thirtyDaysAgo };
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
        profile: {
          select: {
            department: true,
            year: true,
          },
        },
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

/**
 * GET /api/admin/users/:id/activity
 * Get user activity logs
 */
router.get(
  '/users/:id/activity',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get recent likes given
    const likesGiven = await prisma.like.findMany({
      where: { fromUserId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        toUser: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    // Get recent likes received
    const likesReceived = await prisma.like.findMany({
      where: { toUserId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        fromUser: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    // Get matches
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ userAId: id }, { userBId: id }],
      },
      include: {
        userA: {
          select: { id: true, displayName: true, email: true },
        },
        userB: {
          select: { id: true, displayName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get message count
    const messagesSent = await prisma.message.count({
      where: { senderId: id },
    });

    // Get reports made by user
    const reportsMade = await prisma.report.count({
      where: { reporterId: id },
    });

    // Get reports against user
    const reportsAgainst = await prisma.report.count({
      where: { reportedId: id },
    });

    res.json({
      success: true,
      user,
      activity: {
        likesGiven,
        likesReceived,
        matches,
        messagesSent,
        reportsMade,
        reportsAgainst,
      },
    });
  })
);

/**
 * POST /api/admin/users/bulk-action
 * Perform bulk actions on users
 */
router.post(
  '/users/bulk-action',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const schema = z.object({
      action: z.enum(['ban', 'unban', 'delete']),
      userIds: z.array(z.string()),
      reason: z.string().optional(),
    });

    const { action, userIds, reason } = schema.parse(req.body);

    if (action === 'ban') {
      if (!reason) {
        throw new AppError('Reason is required for ban action', 400);
      }

      await prisma.user.updateMany({
        where: {
          id: { in: userIds },
          role: { not: 'ADMIN' },
        },
        data: {
          isBanned: true,
          banReason: reason,
        },
      });
    } else if (action === 'unban') {
      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: {
          isBanned: false,
          banReason: null,
        },
      });
    } else if (action === 'delete') {
      // Soft delete - just mark as inactive
      await prisma.user.updateMany({
        where: {
          id: { in: userIds },
          role: { not: 'ADMIN' },
        },
        data: {
          isActive: false,
        },
      });
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed for ${userIds.length} users`,
    });
  })
);

/**
 * POST /api/admin/broadcast
 * Send notification to all users or specific users
 */
router.post(
  '/broadcast',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const schema = z.object({
      title: z.string(),
      message: z.string(),
      type: z.enum(['ANNOUNCEMENT', 'MAINTENANCE', 'UPDATE']),
      userIds: z.array(z.string()).optional(),
    });

    const { title, message, type, userIds } = schema.parse(req.body);

    let targetUserIds: string[];

    if (userIds && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      // Get all active users
      const users = await prisma.user.findMany({
        where: { isActive: true, isBanned: false },
        select: { id: true },
      });
      targetUserIds = users.map(u => u.id);
    }

    // Create notifications for all target users
    await prisma.notification.createMany({
      data: targetUserIds.map(userId => ({
        userId,
        type: type as any,
        title,
        message,
        data: {},
      })),
    });

    res.json({
      success: true,
      message: `Broadcast sent to ${targetUserIds.length} users`,
    });
  })
);

/**
 * GET /api/admin/chats
 * Get all conversations for monitoring
 */
router.get(
  '/chats',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    // Get all matches with recent messages
    const matches = await prisma.match.findMany({
      include: {
        userA: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        userB: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    const total = await prisma.match.count();

    res.json({
      success: true,
      matches,
      total,
      hasMore: offset + limit < total,
    });
  })
);

/**
 * GET /api/admin/chats/:matchId/messages
 * Get all messages for a specific match
 */
router.get(
  '/chats/:matchId/messages',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { matchId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        userA: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        userB: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    const messages = await prisma.message.findMany({
      where: { matchId },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    res.json({
      success: true,
      match,
      messages,
    });
  })
);

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering
 */
router.get(
  '/audit-logs',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const action = req.query.action as string;
    const adminId = req.query.adminId as string;

    const where: any = {};
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const total = await prisma.auditLog.count({ where });

    res.json({
      success: true,
      logs,
      total,
    });
  })
);

/**
 * POST /api/admin/audit-logs
 * Create audit log (internal use)
 */
async function createAuditLog(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: any,
  req?: any
) {
  await prisma.auditLog.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      details,
      ipAddress: req?.ip || req?.headers['x-forwarded-for'] || null,
      userAgent: req?.headers['user-agent'] || null,
    },
  });
}

/**
 * GET /api/admin/settings
 * Get system settings
 */
router.get(
  '/settings',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // For now, return hardcoded settings. In production, store in database
    const settings = {
      matching: {
        maxDailyLikes: 50,
        maxDiscoverProfiles: 100,
        requireEmailVerification: true,
        requirePhotoVerification: false,
        minPhotos: 1,
        maxPhotos: 6,
      },
      moderation: {
        autoFlagKeywords: ['spam', 'scam', 'fake', 'inappropriate'],
        requirePhotoApproval: false,
        minReportsForAutoban: 5,
      },
      features: {
        chatEnabled: true,
        videoCallEnabled: false,
        voiceCallEnabled: false,
        gifEnabled: true,
        stickerEnabled: true,
      },
    };

    res.json({ success: true, settings });
  })
);

/**
 * PUT /api/admin/settings
 * Update system settings
 */
router.put(
  '/settings',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const schema = z.object({
      matching: z.object({
        maxDailyLikes: z.number().min(1).max(1000).optional(),
        maxDiscoverProfiles: z.number().min(10).max(500).optional(),
        requireEmailVerification: z.boolean().optional(),
        requirePhotoVerification: z.boolean().optional(),
        minPhotos: z.number().min(1).max(10).optional(),
        maxPhotos: z.number().min(1).max(10).optional(),
      }).optional(),
      moderation: z.object({
        autoFlagKeywords: z.array(z.string()).optional(),
        requirePhotoApproval: z.boolean().optional(),
        minReportsForAutoban: z.number().min(1).max(50).optional(),
      }).optional(),
      features: z.object({
        chatEnabled: z.boolean().optional(),
        videoCallEnabled: z.boolean().optional(),
        voiceCallEnabled: z.boolean().optional(),
        gifEnabled: z.boolean().optional(),
        stickerEnabled: z.boolean().optional(),
      }).optional(),
    });

    const settings = schema.parse(req.body);

    // Log the change
    await createAuditLog(
      req.user!.id,
      'UPDATE_SETTINGS',
      'SETTINGS',
      'system',
      settings,
      req
    );

    // In production, save to database
    // For now, just return success
    res.json({ success: true, settings });
  })
);

export default router;
