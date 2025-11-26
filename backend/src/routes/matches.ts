import { Router, Response } from 'express';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/matches
 * Get all matches for current user
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { userAId: req.user!.id },
          { userBId: req.user!.id },
        ],
      },
      include: {
        userA: {
          select: {
            id: true,
            displayName: true,
            verifiedSelfie: true,
            lastActiveAt: true,
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
        userB: {
          select: {
            id: true,
            displayName: true,
            verifiedSelfie: true,
            lastActiveAt: true,
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
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format matches to always show the other user
    const formattedMatches = matches.map(match => {
      const otherUser = match.userAId === req.user!.id ? match.userB : match.userA;
      return {
        id: match.id,
        createdAt: match.createdAt,
        user: otherUser,
        lastMessage: match.messages[0] || null,
      };
    });

    res.json({
      success: true,
      matches: formattedMatches,
    });
  })
);

/**
 * GET /api/matches/:id
 * Get specific match details
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const match = await prisma.match.findFirst({
      where: {
        id,
        OR: [
          { userAId: req.user!.id },
          { userBId: req.user!.id },
        ],
      },
      include: {
        userA: {
          select: {
            id: true,
            displayName: true,
            verifiedSelfie: true,
            lastActiveAt: true,
            profile: {
              include: {
                photos: {
                  where: { moderationStatus: 'APPROVED' },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        userB: {
          select: {
            id: true,
            displayName: true,
            verifiedSelfie: true,
            lastActiveAt: true,
            profile: {
              include: {
                photos: {
                  where: { moderationStatus: 'APPROVED' },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    // Get the other user
    const otherUser = match.userAId === req.user!.id ? match.userB : match.userA;

    res.json({
      success: true,
      match: {
        id: match.id,
        createdAt: match.createdAt,
        user: otherUser,
      },
    });
  })
);

/**
 * DELETE /api/matches/:id
 * Unmatch (delete match and associated messages)
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Verify match exists and user is part of it
    const match = await prisma.match.findFirst({
      where: {
        id,
        OR: [
          { userAId: req.user!.id },
          { userBId: req.user!.id },
        ],
      },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    // Delete match (messages will be cascade deleted)
    await prisma.match.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Match removed',
    });
  })
);

export default router;
