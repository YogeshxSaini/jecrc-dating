"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
/**
 * POST /api/photos/upload
 * Upload a photo (expects base64 image data)
 */
router.post('/upload', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        imageData: zod_1.z.string(), // base64 encoded image
        isProfilePic: zod_1.z.boolean().optional().default(false),
    });
    const { imageData, isProfilePic } = schema.parse(req.body);
    // Get user's profile
    const profile = await index_1.prisma.profile.findUnique({
        where: { userId: req.user.id },
        include: { photos: true },
    });
    if (!profile) {
        throw new errorHandler_1.AppError('Profile not found', 404);
    }
    // Check photo limit (max 6 photos)
    if (profile.photos.length >= 6) {
        throw new errorHandler_1.AppError('Maximum 6 photos allowed', 400);
    }
    // If setting as profile pic, unset other profile pics
    if (isProfilePic) {
        await index_1.prisma.photo.updateMany({
            where: {
                profileId: profile.id,
                isProfilePic: true,
            },
            data: { isProfilePic: false },
        });
    }
    // Create photo record
    const photo = await index_1.prisma.photo.create({
        data: {
            profileId: profile.id,
            url: imageData, // In production, upload to S3/Cloudinary
            thumbnailUrl: imageData, // Generate thumbnail in production
            order: profile.photos.length,
            isProfilePic: isProfilePic || profile.photos.length === 0, // First photo is profile pic
            moderationStatus: 'APPROVED', // Auto-approve for now, add moderation later
        },
    });
    res.json({
        success: true,
        photo,
    });
}));
/**
 * GET /api/photos
 * Get current user's photos
 */
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const profile = await index_1.prisma.profile.findUnique({
        where: { userId: req.user.id },
        include: {
            photos: {
                orderBy: { order: 'asc' },
            },
        },
    });
    if (!profile) {
        throw new errorHandler_1.AppError('Profile not found', 404);
    }
    res.json({
        success: true,
        photos: profile.photos,
    });
}));
/**
 * PUT /api/photos/:id
 * Update photo (set as profile pic, reorder)
 */
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const schema = zod_1.z.object({
        isProfilePic: zod_1.z.boolean().optional(),
        order: zod_1.z.number().optional(),
    });
    const data = schema.parse(req.body);
    const photo = await index_1.prisma.photo.findUnique({
        where: { id },
        include: { profile: true },
    });
    if (!photo) {
        throw new errorHandler_1.AppError('Photo not found', 404);
    }
    if (photo.profile.userId !== req.user.id) {
        throw new errorHandler_1.AppError('Unauthorized', 403);
    }
    // If setting as profile pic, unset others
    if (data.isProfilePic) {
        await index_1.prisma.photo.updateMany({
            where: {
                profileId: photo.profileId,
                isProfilePic: true,
            },
            data: { isProfilePic: false },
        });
    }
    const updatedPhoto = await index_1.prisma.photo.update({
        where: { id },
        data,
    });
    res.json({
        success: true,
        photo: updatedPhoto,
    });
}));
/**
 * DELETE /api/photos/:id
 * Delete a photo
 */
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const photo = await index_1.prisma.photo.findUnique({
        where: { id },
        include: { profile: true },
    });
    if (!photo) {
        throw new errorHandler_1.AppError('Photo not found', 404);
    }
    if (photo.profile.userId !== req.user.id) {
        throw new errorHandler_1.AppError('Unauthorized', 403);
    }
    await index_1.prisma.photo.delete({
        where: { id },
    });
    // If this was the profile pic, set the first remaining photo as profile pic
    if (photo.isProfilePic) {
        const firstPhoto = await index_1.prisma.photo.findFirst({
            where: { profileId: photo.profileId },
            orderBy: { order: 'asc' },
        });
        if (firstPhoto) {
            await index_1.prisma.photo.update({
                where: { id: firstPhoto.id },
                data: { isProfilePic: true },
            });
        }
    }
    res.json({
        success: true,
        message: 'Photo deleted',
    });
}));
exports.default = router;
//# sourceMappingURL=photos.js.map