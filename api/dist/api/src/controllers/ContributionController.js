import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import ContributionService from '../services/ContributionService.js';
const router = Router();
router.post('/questions', asyncHandler(async (req, res) => {
    const { playerId } = req.body;
    const data = req.body;
    if (!playerId) {
        throw createError('playerId is required', 400);
    }
    if (!data.text || !data.options || data.options.length !== 4 ||
        data.correctAnswer == null || data.difficulty == null || !data.category || !data.analysis) {
        throw createError('Invalid question data', 400);
    }
    if (data.correctAnswer < 0 || data.correctAnswer > 3) {
        throw createError('Correct answer must be between 0 and 3', 400);
    }
    if (data.difficulty < 1 || data.difficulty > 5) {
        throw createError('Difficulty must be between 1 and 5', 400);
    }
    const result = ContributionService.submitQuestion(playerId, data);
    res.status(201).json(result);
}));
router.get('/questions', asyncHandler(async (req, res) => {
    const { playerId } = req.query;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const status = req.query.status;
    if (!playerId) {
        throw createError('playerId is required', 400);
    }
    const result = ContributionService.getByContributor(String(playerId), { page, pageSize, status });
    res.json(result);
}));
router.get('/questions/pending', asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = ContributionService.getPending({ page, pageSize });
    res.json(result);
}));
router.post('/questions/:id/approve', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { reviewerId, reviewNote } = req.body;
    if (isNaN(id)) {
        throw createError('Invalid question ID', 400);
    }
    if (!reviewerId) {
        throw createError('reviewerId is required', 400);
    }
    const result = ContributionService.approveQuestion(id, reviewerId, reviewNote);
    if (!result.success) {
        throw createError('Question not found or not pending', 404);
    }
    res.json({ success: true, questionId: result.questionId });
}));
router.post('/questions/:id/reject', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { reviewerId, reviewNote } = req.body;
    if (isNaN(id)) {
        throw createError('Invalid question ID', 400);
    }
    if (!reviewerId) {
        throw createError('reviewerId is required', 400);
    }
    const success = ContributionService.rejectQuestion(id, reviewerId, reviewNote);
    if (!success) {
        throw createError('Question not found or not pending', 404);
    }
    res.json({ success: true });
}));
router.get('/rankings', asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = ContributionService.getRankings({ page, pageSize });
    res.json(result);
}));
router.get('/player/:playerId/stats', asyncHandler(async (req, res) => {
    const { playerId } = req.params;
    const stats = ContributionService.getPlayerStats(playerId);
    res.json(stats);
}));
export default router;
