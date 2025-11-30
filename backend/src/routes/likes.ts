import { Router, Response } from 'express';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { likeRateLimiter } from '../middleware/rateLimiter';
import { io } from '../index';

const router = Router();

/**
 * POST /api/likes
 * Like a user
 */
router.post(
  '/',
  authenticate,
  likeRateLimiter,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { toUserId } = req.body;

    if (!toUserId) {
      throw new AppError('toUserId is required', 400);
    }

    // Can't like yourself
    if (toUserId === req.user!.id) {
      throw new AppError('Cannot like yourself', 400);
    }

    // Check if target user exists and is active
    const targetUser = await prisma.user.findUnique({
      where: { id: toUserId, isActive: true, isBanned: false },
    });

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: req.user!.id,
          toUserId,
        },
      },
    });

    if (existingLike) {
      return res.json({
        success: true,
        message: 'Already liked',
        isMatch: false,
      });
    }

    // Create like
    await prisma.like.create({
      data: {
        fromUserId: req.user!.id,
        toUserId,
      },
    });

    // Check if it's a mutual like (match)
    const reverseLike = await prisma.like.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: toUserId,
          toUserId: req.user!.id,
        },
      },
    });

    let match = null;
    if (reverseLike) {
      // Create match (ensure userA id is always smaller for consistency)
      const [userAId, userBId] = [req.user!.id, toUserId].sort();
      
      match = await prisma.match.create({
        data: {
          userAId,
          userBId,
        },
        include: {
          userA: {
            select: {
              id: true,
              displayName: true,
              verifiedSelfie: true,
            },
          },
          userB: {
            select: {
              id: true,
              displayName: true,
              verifiedSelfie: true,
            },
          },
        },
      });

      // Create notifications for both users
      await prisma.notification.createMany({
        data: [
          {
            userId: req.user!.id,
            type: 'NEW_MATCH',
            title: 'New Match!',
            message: `You matched with ${targetUser.displayName}`,
            data: { matchId: match.id, userId: toUserId },
          },
          {
            userId: toUserId,
            type: 'NEW_MATCH',
            title: 'New Match!',
            message: `You matched with ${req.user!.email.split('@')[0]}`,
            data: { matchId: match.id, userId: req.user!.id },
          },
        ],
      });

      // Emit real-time match notification via Socket.IO
      io.to(toUserId).emit('new_match', {
        matchId: match.id,
        user: {
          id: req.user!.id,
          displayName: req.user!.email.split('@')[0],
        },
      });
    } else {
      // Create notification for liked user
      await prisma.notification.create({
        data: {
          userId: toUserId,
          type: 'LIKE_RECEIVED',
          title: 'Someone liked you!',
          message: 'You have a new like',
          data: { userId: req.user!.id },
        },
      });
    }

    res.json({
      success: true,
      isMatch: !!match,
      match,
    });
  })
);

/**
 * DELETE /api/likes/:userId
 * Unlike a user
 */
router.delete(
  '/:userId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    await prisma.like.delete({
      where: {
        fromUserId_toUserId: {
          fromUserId: req.user!.id,
          toUserId: userId,
        },
      },
    });

    res.json({
      success: true,
      message: 'Like removed',
    });
  })
);

/**
 * GET /api/likes/received
 * Get users who liked me
 */
router.get(
  '/received',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const likes = await prisma.like.findMany({
      where: {
        toUserId: req.user!.id,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            displayName: true,
            verifiedSelfie: true,
            profile: {
              include: {
                photos: {
                  where: { moderationStatus: 'APPROVED', isProfilePic: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Check if each like has a mutual match
    const likesWithMatchStatus = await Promise.all(
      likes.map(async (like) => {
        // Check if there's a mutual like (match)
        const reverseLike = await prisma.like.findUnique({
          where: {
            fromUserId_toUserId: {
              fromUserId: req.user!.id,
              toUserId: like.fromUserId,
            },
          },
        });

        return {
          ...like,
          isMatched: !!reverseLike,
        };
      })
    );

    res.json({
      success: true,
      likes: likesWithMatchStatus,
    });
  })
);

/**
 * GET /api/likes/given
 * Get users I liked
 */
router.get(
  '/given',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const likes = await prisma.like.findMany({
      where: {
        fromUserId: req.user!.id,
      },
      include: {
        toUser: {
          select: {
            id: true,
            displayName: true,
            verifiedSelfie: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      likes,
    });
  })
);

export default router;
