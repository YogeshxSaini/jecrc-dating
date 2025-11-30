import { Router, Response } from 'express';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/discover
 * Get discovery feed - users to potentially match with
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get current user's profile to filter by preferences
    const currentProfile = await prisma.profile.findUnique({
      where: { userId: req.user!.id },
    });

    // Get IDs of users already liked or matched
    const likedUserIds = await prisma.like.findMany({
      where: { fromUserId: req.user!.id },
      select: { toUserId: true },
    });

    const likedIds = likedUserIds.map(like => like.toUserId);

    // Get IDs of users already passed
    const passedUserIds = await prisma.pass.findMany({
      where: { fromUserId: req.user!.id },
      select: { toUserId: true },
    });

    const passedIds = passedUserIds.map(pass => pass.toUserId);

    // Combine liked and passed IDs to exclude
    const excludedIds = [...likedIds, ...passedIds];

    // Build filter conditions
    const whereConditions: any = {
      id: {
        not: req.user!.id, // Exclude self
        notIn: excludedIds, // Exclude already liked/passed users
      },
      isActive: true,
      isBanned: false,
    };

    // Filter by lookingFor preference if set
    if (currentProfile?.lookingFor) {
      whereConditions.profile = {
        gender: currentProfile.lookingFor,
      };
    }

    // Get ALL potential matches (no limit for true randomization)
    const users = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        displayName: true,
        verifiedSelfie: true,
        profile: {
          include: {
            photos: {
              where: { moderationStatus: 'APPROVED' },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    // Filter out users without profiles
    const usersWithProfiles = users.filter(user => user.profile);

    // Randomize ALL users using Fisher-Yates shuffle for better distribution
    const shuffled = [...usersWithProfiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Apply pagination after randomization
    const paginatedUsers = shuffled.slice(offset, offset + limit);

    res.json({
      success: true,
      users: paginatedUsers,
      count: paginatedUsers.length,
      hasMore: shuffled.length > offset + limit,
    });
  })
);

/**
 * GET /api/discover/:userId
 * Get detailed profile for a user in discovery
 */
router.get(
  '/:userId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (userId === req.user!.id) {
      throw new AppError('Cannot view your own profile in discovery', 400);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        isActive: true,
        isBanned: false,
      },
      select: {
        id: true,
        displayName: true,
        verifiedSelfie: true,
        profile: {
          include: {
            photos: {
              where: { moderationStatus: 'APPROVED' },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      user,
    });
  })
);

/**
 * POST /api/discover/pass/:userId
 * Record that current user passed/swiped left on a profile
 */
router.post(
  '/pass/:userId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (userId === req.user!.id) {
      throw new AppError('Cannot pass on your own profile', 400);
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Create pass record (upsert to handle duplicates gracefully)
    await prisma.pass.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId: req.user!.id,
          toUserId: userId,
        },
      },
      create: {
        fromUserId: req.user!.id,
        toUserId: userId,
      },
      update: {}, // No updates needed if already exists
    });

    res.json({
      success: true,
      message: 'Pass recorded',
    });
  })
);

export default router;
