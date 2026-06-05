import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import AchievementService from '../services/AchievementService.js';
const router = Router();
router.get('/', asyncHandler(async (req, res) => {
    const achievements = AchievementService.getAllAchievements();
    res.json({
        success: true,
        data: achievements,
    });
}));
router.get('/player/:playerId', asyncHandler(async (req, res) => {
    const { playerId } = req.params;
    if (!playerId) {
        throw createError('Player ID is required', 400);
    }
    const playerAchievements = AchievementService.getPlayerAchievements(playerId);
    const progress = AchievementService.getAchievementProgress(playerId);
    res.json({
        success: true,
        data: {
            achievements: playerAchievements,
            progress,
        },
    });
}));
router.get('/player/:playerId/check', asyncHandler(async (req, res) => {
    const { playerId } = req.params;
    if (!playerId) {
        throw createError('Player ID is required', 400);
    }
    const newlyUnlocked = AchievementService.checkAndUnlockAchievements(playerId);
    res.json({
        success: true,
        data: {
            newlyUnlocked,
            count: newlyUnlocked.length,
        },
    });
}));
router.get('/player/:playerId/progress', asyncHandler(async (req, res) => {
    const { playerId } = req.params;
    if (!playerId) {
        throw createError('Player ID is required', 400);
    }
    const progress = AchievementService.getAchievementProgress(playerId);
    res.json({
        success: true,
        data: progress,
    });
}));
router.get('/code/:code', asyncHandler(async (req, res) => {
    const { code } = req.params;
    if (!code) {
        throw createError('Achievement code is required', 400);
    }
    const achievement = AchievementService.getAchievementByCode(code);
    if (!achievement) {
        throw createError('Achievement not found', 404);
    }
    res.json({
        success: true,
        data: achievement,
    });
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const achievementId = Number(id);
    if (isNaN(achievementId)) {
        throw createError('Invalid achievement ID', 400);
    }
    const achievement = AchievementService.getAchievementById(achievementId);
    if (!achievement) {
        throw createError('Achievement not found', 404);
    }
    res.json({
        success: true,
        data: achievement,
    });
}));
export default router;
