import { Router, type Request, type Response } from 'express';
import db from '../db/database.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import type { UserStats, RankingItem, Category } from '../../../shared/types.js';
import type { CategoryStatsRow } from '../types/index.js';

const router = Router();

router.get('/:id/stats', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const userStmt = db.prepare(`
    SELECT * FROM user_stats WHERE player_id = ?
  `);
  const userRow = userStmt.get(id) as {
    player_id: string;
    nickname: string;
    total_games: number;
    wins: number;
    total_score: number;
    total_correct: number;
    total_questions: number;
    avg_response_time: number;
    max_streak: number;
  } | undefined;

  if (!userRow) {
    throw createError('User not found', 404);
  }

  const categoryStmt = db.prepare(`
    SELECT * FROM category_stats WHERE player_id = ?
  `);
  const categoryRows = categoryStmt.all(id) as CategoryStatsRow[];

  const weeklyStmt = db.prepare(`
    SELECT COUNT(*) as rank
    FROM user_stats us
    WHERE (us.total_score, us.id) > (
      SELECT total_score, id FROM user_stats WHERE player_id = ?
    )
    AND us.last_played_at >= datetime('now', '-7 days')
    OR (us.last_played_at >= datetime('now', '-7 days')
    AND us.total_score = (SELECT total_score FROM user_stats WHERE player_id = ?)
    AND us.id <= (SELECT id FROM user_stats WHERE player_id = ?))
  `);
  const weeklyRank = weeklyStmt.get(id, id, id) as { rank: number };

  const monthlyStmt = db.prepare(`
    SELECT COUNT(*) as rank
    FROM user_stats us
    WHERE (us.total_score, us.id) > (
      SELECT total_score, id FROM user_stats WHERE player_id = ?
    )
    AND us.last_played_at >= datetime('now', '-30 days')
    OR (us.last_played_at >= datetime('now', '-30 days')
    AND us.total_score = (SELECT total_score FROM user_stats WHERE player_id = ?)
    AND us.id <= (SELECT id FROM user_stats WHERE player_id = ?))
  `);
  const monthlyRank = monthlyStmt.get(id, id, id) as { rank: number };

  const allTimeStmt = db.prepare(`
    SELECT COUNT(*) as rank
    FROM user_stats us
    WHERE (us.total_score, us.id) > (
      SELECT total_score, id FROM user_stats WHERE player_id = ?
    )
    OR (us.total_score = (SELECT total_score FROM user_stats WHERE player_id = ?)
    AND us.id <= (SELECT id FROM user_stats WHERE player_id = ?))
  `);
  const allTimeRank = allTimeStmt.get(id, id, id) as { rank: number };

  let bestCategory: Category = 'technology';
  let bestAccuracy = -1;

  categoryRows.forEach((cat) => {
    if (cat.total_questions > 0) {
      const accuracy = cat.correct_questions / cat.total_questions;
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestCategory = cat.category;
      }
    }
  });

  const stats: UserStats = {
    playerId: userRow.player_id,
    nickname: userRow.nickname,
    totalGames: userRow.total_games,
    wins: userRow.wins,
    winRate: userRow.total_games > 0 ? Number((userRow.wins / userRow.total_games).toFixed(4)) : 0,
    bestCategory,
    avgResponseTime: Number(userRow.avg_response_time.toFixed(2)),
    maxStreak: userRow.max_streak,
    totalScore: userRow.total_score,
    rank: {
      weekly: weeklyRank.rank,
      monthly: monthlyRank.rank,
      allTime: allTimeRank.rank,
    },
  };

  res.json(stats);
}));

router.get('/rankings', asyncHandler(async (req: Request, res: Response) => {
  const {
    type = 'allTime',
    category,
    page = 1,
    pageSize = 20,
  } = req.query;

  const pageNum = Number(page);
  const size = Number(pageSize);
  const offset = (pageNum - 1) * size;

  let dateFilter = '';
  let params: any[] = [];

  if (type === 'weekly') {
    dateFilter = 'AND us.last_played_at >= datetime(\'now\', \'-7 days\')';
  } else if (type === 'monthly') {
    dateFilter = 'AND us.last_played_at >= datetime(\'now\', \'-30 days\')';
  }

  let joinClause = '';
  let whereClause = '';

  if (category) {
    joinClause = 'JOIN category_stats cs ON us.player_id = cs.player_id';
    whereClause = `WHERE cs.category = ? ${dateFilter}`;
    params.push(category);
  } else {
    whereClause = `WHERE 1=1 ${dateFilter}`;
  }

  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM user_stats us
    ${joinClause}
    ${whereClause}
  `);
  const { count } = countStmt.get(...params) as { count: number };

  let orderBy = 'us.total_score DESC, us.id ASC';
  if (category) {
    orderBy = 'cs.total_score DESC, us.id ASC';
  }

  const selectFields = [
    'us.player_id',
    'us.nickname',
    'us.total_score',
    'us.total_games',
    'us.wins',
  ];
  if (category) {
    selectFields.push('cs.total_score as category_score');
  }

  const stmt = db.prepare(`
    SELECT 
      ${selectFields.join(', ')}
    FROM user_stats us
    ${joinClause}
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(...params, size, offset);

  const rankOffset = offset;
  const items: RankingItem[] = rows.map((row: any, index: number) => ({
    rank: rankOffset + index + 1,
    playerId: row.player_id,
    nickname: row.nickname,
    score: category ? row.category_score : row.total_score,
    winRate: row.total_games > 0 ? Number((row.wins / row.total_games).toFixed(4)) : 0,
    games: row.total_games,
  }));

  res.json({
    items,
    total: count,
    page: pageNum,
    pageSize: size,
    totalPages: Math.ceil(count / size),
    type,
    category: category || null,
  });
}));

export default router;
