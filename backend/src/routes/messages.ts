import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Get all matches with last message for the logged-in user
router.get(
  '/matches',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                department: true,
                year: true,
                photos: {
                  where: { isProfilePic: true },
                  select: { url: true },
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
            profile: {
              select: {
                department: true,
                year: true,
                photos: {
                  where: { isProfilePic: true },
                  select: { url: true },
                  take: 1,
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format matches to include the other user and last message
    const formattedMatches = await Promise.all(
      matches.map(async (match) => {
        const otherUser = match.userAId === userId ? match.userB : match.userA;
        const lastMessage = match.messages[0] || null;

        // Count unread messages
        const unreadCount = await prisma.message.count({
          where: {
            matchId: match.id,
            senderId: otherUser.id,
            readAt: null,
          },
        });

        return {
          matchId: match.id,
          user: {
            id: otherUser.id,
            displayName: otherUser.displayName,
            department: otherUser.profile?.department || null,
            year: otherUser.profile?.year || null,
            profileImage: otherUser.profile?.photos[0]?.url || null,
          },
          lastMessage,
          unreadCount,
          matchedAt: match.createdAt,
        };
      })
    );

    res.json({
      success: true,
      matches: formattedMatches,
    });
  })
);

// Get messages for a specific match
router.get(
  '/:matchId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { matchId } = req.params;
    const { limit = '50', before } = req.query;

    // Verify user is part of this match
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found or unauthorized',
      });
    }

    // Build query
    const whereClause: any = { matchId };
    if (before) {
      whereClause.createdAt = { lt: new Date(before as string) };
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                photos: {
                  where: { isProfilePic: true },
                  select: { url: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    // Reverse to show oldest first
    messages.reverse();

    // Format messages
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      matchId: msg.matchId,
      senderId: msg.senderId,
      content: msg.content,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
      sender: {
        id: msg.sender.id,
        displayName: msg.sender.displayName,
        profileImage: msg.sender.profile?.photos[0]?.url || null,
      },
    }));

    res.json({
      success: true,
      messages: formattedMessages,
      hasMore: messages.length === parseInt(limit as string),
    });
  })
);

// Get match details (for chat header)
router.get(
  '/:matchId/info',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { matchId } = req.params;

    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: {
                department: true,
                year: true,
                bio: true,
                photos: {
                  where: { isProfilePic: true },
                  select: { url: true },
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
            profile: {
              select: {
                department: true,
                year: true,
                bio: true,
                photos: {
                  where: { isProfilePic: true },
                  select: { url: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found or unauthorized',
      });
    }

    const otherUser = match.userAId === userId ? match.userB : match.userA;

    res.json({
      success: true,
      match: {
        id: match.id,
        user: {
          id: otherUser.id,
          displayName: otherUser.displayName,
          department: otherUser.profile?.department || null,
          year: otherUser.profile?.year || null,
          bio: otherUser.profile?.bio || null,
          profileImage: otherUser.profile?.photos[0]?.url || null,
        },
        matchedAt: match.createdAt,
      },
    });
  })
);

export default router;
