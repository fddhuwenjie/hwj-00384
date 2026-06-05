import { Router, type Request, type Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import SeasonService from '../services/SeasonService.js';
import type { Season, SeasonRankingItem } from '../../../shared/types.js';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20 } = req.query;

  const result = SeasonService.getSeasonList({
    page: Number(page),
    pageSize: Number(pageSize),
  });

  res.json({
    items: result.items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  });
}));

router.get('/current', asyncHandler(async (req: Request, res: Response) => {
  const season = SeasonService.getCurrentSeason();

  if (!season) {
    throw createError('Current season not found', 404);
  }

  const result: Season = {
    id: season.id,
    name: season.name,
    year: season.year,
    month: season.month,
    startDate: season.start_date,
    endDate: season.end_date,
    status: season.status,
    createdAt: season.created_at,
  };

  res.json(result);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const season = SeasonService.getSeasonById(Number(id));

  if (!season) {
    throw createError('Season not found', 404);
  }

  const result: Season = {
    id: season.id,
    name: season.name,
    year: season.year,
    month: season.month,
    startDate: season.start_date,
    endDate: season.end_date,
    status: season.status,
    createdAt: season.created_at,
  };

  res.json(result);
}));

router.get('/current/rankings', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20 } = req.query;

  const result = SeasonService.getCurrentSeasonRankings({
    page: Number(page),
    pageSize: Number(pageSize),
  });

  const currentSeason = SeasonService.getCurrentSeason();

  res.json({
    seasonId: currentSeason?.id || null,
    seasonName: currentSeason?.name || '当前赛季',
    items: result.items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  });
}));

router.get('/:id/rankings', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = 1, pageSize = 20 } = req.query;

  const season = SeasonService.getSeasonById(Number(id));
  if (!season) {
    throw createError('Season not found', 404);
  }

  let rankings: { items: SeasonRankingItem[]; total: number; page: number; pageSize: number; totalPages: number };

  if (season.status === 'active') {
    rankings = SeasonService.getCurrentSeasonRankings({
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } else {
    rankings = SeasonService.getSeasonRankings(Number(id), {
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  res.json({
    seasonId: season.id,
    seasonName: season.name,
    isFinalized: season.status !== 'active',
    items: rankings.items,
    total: rankings.total,
    page: rankings.page,
    pageSize: rankings.pageSize,
    totalPages: rankings.totalPages,
  });
}));

router.post('/init', asyncHandler(async (req: Request, res: Response) => {
  const season = SeasonService.initCurrentSeason();

  const result: Season = {
    id: season.id,
    name: season.name,
    year: season.year,
    month: season.month,
    startDate: season.start_date,
    endDate: season.end_date,
    status: season.status,
    createdAt: season.created_at,
  };

  res.json({
    success: true,
    message: 'Season initialized successfully',
    season: result,
  });
}));

router.post('/:id/freeze', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const season = SeasonService.getSeasonById(Number(id));

  if (!season) {
    throw createError('Season not found', 404);
  }

  if (season.status !== 'active') {
    throw createError('Only active seasons can be frozen', 400);
  }

  SeasonService.freezeSeason(Number(id));
  SeasonService.snapshotRankings(Number(id));

  const updatedSeason = SeasonService.getSeasonById(Number(id));

  res.json({
    success: true,
    message: 'Season frozen successfully',
    season: updatedSeason ? {
      id: updatedSeason.id,
      name: updatedSeason.name,
      year: updatedSeason.year,
      month: updatedSeason.month,
      startDate: updatedSeason.start_date,
      endDate: updatedSeason.end_date,
      status: updatedSeason.status,
      createdAt: updatedSeason.created_at,
    } : null,
  });
}));

router.post('/:id/snapshot', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const season = SeasonService.getSeasonById(Number(id));

  if (!season) {
    throw createError('Season not found', 404);
  }

  SeasonService.snapshotRankings(Number(id));

  res.json({
    success: true,
    message: 'Season rankings snapshot created successfully',
  });
}));

router.post('/check-reset', asyncHandler(async (req: Request, res: Response) => {
  SeasonService.checkAndResetSeasonScores();

  const currentSeason = SeasonService.getCurrentSeason();

  res.json({
    success: true,
    message: 'Season check completed',
    currentSeason: currentSeason ? {
      id: currentSeason.id,
      name: currentSeason.name,
      year: currentSeason.year,
      month: currentSeason.month,
      status: currentSeason.status,
    } : null,
  });
}));

router.get('/player/:playerId/rank', asyncHandler(async (req: Request, res: Response) => {
  const { playerId } = req.params;
  const rank = SeasonService.getPlayerSeasonRank(playerId);

  res.json({
    playerId,
    rank,
    seasonId: SeasonService.getCurrentSeason()?.id || null,
  });
}));

export default router;
