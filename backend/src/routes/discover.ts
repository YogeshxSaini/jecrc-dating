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

    // Build filter conditions
    const whereConditions: any = {
      id: {
        not: req.user!.id, // Exclude self
        notIn: likedIds, // Exclude already liked users
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

    // Get potential matches
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
      skip: offset,
      take: limit,
      // Randomize order for variety
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter out users without approved photos
    const usersWithPhotos = users.filter(
      user => user.profile && user.profile.photos.length > 0
    );

    res.json({
      success: true,
      users: usersWithPhotos,
      count: usersWithPhotos.length,
      hasMore: usersWithPhotos.length === limit,
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

export default router;
