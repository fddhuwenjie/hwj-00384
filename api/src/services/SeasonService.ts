import db from '../db/database.js';
import type { Season, SeasonRankingItem } from '../../../shared/types.js';
import type { SeasonRow, SeasonRankingRow, UserStatsRow, PaginatedResult } from '../types/index.js';

const getMonthStartEnd = (year: number, month: number): { start: Date; end: Date } => {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
};

const getSeasonName = (year: number, month: number): string => {
  return `${year}年${month}月赛季`;
};

export const SeasonService = {
  getCurrentSeason(): SeasonRow | null {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const stmt = db.prepare(`
      SELECT * FROM seasons 
      WHERE year = ? AND month = ?
      LIMIT 1
    `);
    const season = stmt.get(year, month) as SeasonRow | undefined;
    return season || null;
  },

  getSeasonById(id: number): SeasonRow | null {
    const stmt = db.prepare('SELECT * FROM seasons WHERE id = ?');
    const season = stmt.get(id) as SeasonRow | undefined;
    return season || null;
  },

  createSeason(year: number, month: number): SeasonRow {
    const existing = db.prepare('SELECT * FROM seasons WHERE year = ? AND month = ?').get(year, month) as SeasonRow | undefined;
    if (existing) {
      return existing;
    }

    const { start, end } = getMonthStartEnd(year, month);
    const name = getSeasonName(year, month);

    const stmt = db.prepare(`
      INSERT INTO seasons (name, year, month, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `);
    const result = stmt.run(name, year, month, start.toISOString(), end.toISOString());

    const newSeason = db.prepare('SELECT * FROM seasons WHERE id = ?').get(Number(result.lastInsertRowid)) as SeasonRow;
    return newSeason;
  },

  initCurrentSeason(): SeasonRow {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let currentSeason = SeasonService.getCurrentSeason();
    if (!currentSeason) {
      currentSeason = SeasonService.createSeason(year, month);
    }

    const lastMonth = month === 1 ? 12 : month - 1;
    const lastYear = month === 1 ? year - 1 : year;
    const lastSeason = db.prepare('SELECT * FROM seasons WHERE year = ? AND month = ?').get(lastYear, lastMonth) as SeasonRow | undefined;

    if (lastSeason && lastSeason.status === 'active') {
      SeasonService.freezeSeason(lastSeason.id);
    }

    if (lastSeason && lastSeason.status === 'frozen') {
      const existingRankings = db.prepare('SELECT COUNT(*) as count FROM season_rankings WHERE season_id = ?').get(lastSeason.id) as { count: number };
      if (existingRankings.count === 0) {
        SeasonService.snapshotRankings(lastSeason.id);
      }
    }

    return currentSeason;
  },

  checkAndResetSeasonScores(): void {
    const now = new Date();
    const currentSeason = SeasonService.getCurrentSeason();

    if (!currentSeason) return;

    const seasonStart = new Date(currentSeason.start_date);
    const currentMonth = now.getMonth();
    const seasonMonth = seasonStart.getMonth();

    if (currentMonth !== seasonMonth) {
      const lastSeason = currentSeason;

      SeasonService.freezeSeason(lastSeason.id);
      SeasonService.snapshotRankings(lastSeason.id);

      const newYear = now.getFullYear();
      const newMonth = now.getMonth() + 1;
      SeasonService.createSeason(newYear, newMonth);

      db.exec('UPDATE user_stats SET season_score = 0, updated_at = CURRENT_TIMESTAMP');
    }
  },

  freezeSeason(seasonId: number): void {
    const stmt = db.prepare(`
      UPDATE seasons 
      SET status = 'frozen', end_date = ?
      WHERE id = ? AND status = 'active'
    `);
    stmt.run(new Date().toISOString(), seasonId);
  },

  archiveSeason(seasonId: number): void {
    const stmt = db.prepare(`
      UPDATE seasons 
      SET status = 'archived'
      WHERE id = ? AND status = 'frozen'
    `);
    stmt.run(seasonId);
  },

  snapshotRankings(seasonId: number): void {
    const season = SeasonService.getSeasonById(seasonId);
    if (!season) return;

    const deleteStmt = db.prepare('DELETE FROM season_rankings WHERE season_id = ?');
    deleteStmt.run(seasonId);

    const stmt = db.prepare(`
      SELECT 
        us.player_id, 
        us.nickname, 
        us.avatar, 
        us.season_score as score, 
        us.wins, 
        us.total_games as games
      FROM user_stats us
      WHERE us.season_score > 0 OR us.total_games > 0
      ORDER BY us.season_score DESC, us.wins DESC, us.total_games DESC
    `);
    const rows = stmt.all() as Array<{
      player_id: string;
      nickname: string;
      avatar: string | null;
      score: number;
      wins: number;
      games: number;
    }>;

    const insertStmt = db.prepare(`
      INSERT INTO season_rankings 
      (season_id, player_id, nickname, avatar, rank_position, score, wins, games, win_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((players: typeof rows) => {
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const winRate = player.games > 0 ? Math.round((player.wins / player.games) * 100) / 100 : 0;
        insertStmt.run(
          seasonId,
          player.player_id,
          player.nickname,
          player.avatar,
          i + 1,
          player.score,
          player.wins,
          player.games,
          winRate
        );
      }
    });

    transaction(rows);

    db.prepare("UPDATE seasons SET status = 'frozen' WHERE id = ?").run(seasonId);
  },

  updateSeasonScore(playerId: string, score: number, isWinner: boolean): void {
    const currentSeason = SeasonService.getCurrentSeason();
    if (!currentSeason) return;

    const stmt = db.prepare(`
      UPDATE user_stats 
      SET season_score = season_score + ?,
          wins = wins + ?,
          total_games = total_games + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `);
    stmt.run(score, isWinner ? 1 : 0, playerId);
  },

  getCurrentSeasonRankings(
    pagination?: { page: number; pageSize: number }
  ): PaginatedResult<SeasonRankingItem> {
    const currentSeason = SeasonService.getCurrentSeason();
    if (!currentSeason) {
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };
    }

    const { page = 1, pageSize = 20 } = pagination || {};
    const offset = (page - 1) * pageSize;

    const countStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM user_stats 
      WHERE season_score > 0 OR total_games > 0
    `);
    const total = (countStmt.get() as { count: number }).count;

    const stmt = db.prepare(`
      SELECT 
        player_id, 
        nickname, 
        avatar, 
        season_score as score, 
        wins, 
        total_games as games
      FROM user_stats
      WHERE season_score > 0 OR total_games > 0
      ORDER BY season_score DESC, wins DESC, total_games DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(pageSize, offset) as Array<{
      player_id: string;
      nickname: string;
      avatar: string | null;
      score: number;
      wins: number;
      games: number;
    }>;

    const items: SeasonRankingItem[] = rows.map((row, index) => ({
      rank: offset + index + 1,
      playerId: row.player_id,
      nickname: row.nickname,
      avatar: row.avatar || undefined,
      score: row.score,
      wins: row.wins,
      games: row.games,
      winRate: row.games > 0 ? Math.round((row.wins / row.games) * 100) / 100 : 0,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getSeasonRankings(
    seasonId: number,
    pagination?: { page: number; pageSize: number }
  ): PaginatedResult<SeasonRankingItem> {
    const { page = 1, pageSize = 20 } = pagination || {};
    const offset = (page - 1) * pageSize;

    const countStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM season_rankings 
      WHERE season_id = ?
    `);
    const total = (countStmt.get(seasonId) as { count: number }).count;

    const stmt = db.prepare(`
      SELECT * FROM season_rankings
      WHERE season_id = ?
      ORDER BY rank_position ASC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(seasonId, pageSize, offset) as SeasonRankingRow[];

    const items: SeasonRankingItem[] = rows.map((row) => ({
      rank: row.rank_position,
      playerId: row.player_id,
      nickname: row.nickname,
      avatar: row.avatar || undefined,
      score: row.score,
      wins: row.wins,
      games: row.games,
      winRate: row.win_rate,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getSeasonList(
    pagination?: { page: number; pageSize: number }
  ): PaginatedResult<Season> {
    const { page = 1, pageSize = 20 } = pagination || {};
    const offset = (page - 1) * pageSize;

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM seasons');
    const total = (countStmt.get() as { count: number }).count;

    const stmt = db.prepare(`
      SELECT * FROM seasons
      ORDER BY year DESC, month DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(pageSize, offset) as SeasonRow[];

    const items: Season[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      year: row.year,
      month: row.month,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      createdAt: row.created_at,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getPlayerSeasonRank(playerId: string): number {
    const currentSeason = SeasonService.getCurrentSeason();
    if (!currentSeason) return 0;

    const stmt = db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM user_stats
      WHERE season_score > (SELECT season_score FROM user_stats WHERE player_id = ?)
    `);
    const result = stmt.get(playerId) as { rank: number };
    return result.rank;
  },
};

export default SeasonService;
