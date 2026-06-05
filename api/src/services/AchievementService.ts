import db from '../db/database.js';
import { checkAchievements, initAchievements } from '../utils/achievements.js';
import type { Achievement, PlayerAchievement } from '../../../shared/types.js';
import type { AchievementRow } from '../types/index.js';

export const AchievementService = {
  init(): void {
    initAchievements();
  },

  getAllAchievements(): Achievement[] {
    const stmt = db.prepare('SELECT * FROM achievements ORDER BY rarity DESC, points DESC');
    const rows = stmt.all() as AchievementRow[];

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      icon: row.icon,
      rarity: row.rarity,
      points: row.points,
      conditionType: row.condition_type,
      conditionValue: row.condition_value,
    }));
  },

  getPlayerAchievements(playerId: string): PlayerAchievement[] {
    const stmt = db.prepare(`
      SELECT a.*, pa.unlocked_at
      FROM player_achievements pa
      JOIN achievements a ON pa.achievement_id = a.id
      WHERE pa.player_id = ?
      ORDER BY pa.unlocked_at DESC
    `);
    const rows = stmt.all(playerId) as Array<AchievementRow & { unlocked_at: string }>;

    return rows.map((row) => ({
      achievement: {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        icon: row.icon,
        rarity: row.rarity,
        points: row.points,
        conditionType: row.condition_type,
        conditionValue: row.condition_value,
      },
      unlockedAt: row.unlocked_at,
    }));
  },

  checkAndUnlockAchievements(
    playerId: string
  ): { achievement: Achievement; unlockedAt: string }[] {
    return checkAchievements(playerId);
  },

  getAchievementById(achievementId: number): Achievement | null {
    const stmt = db.prepare('SELECT * FROM achievements WHERE id = ?');
    const row = stmt.get(achievementId) as AchievementRow | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      icon: row.icon,
      rarity: row.rarity,
      points: row.points,
      conditionType: row.condition_type,
      conditionValue: row.condition_value,
    };
  },

  getAchievementByCode(code: string): Achievement | null {
    const stmt = db.prepare('SELECT * FROM achievements WHERE code = ?');
    const row = stmt.get(code) as AchievementRow | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      icon: row.icon,
      rarity: row.rarity,
      points: row.points,
      conditionType: row.condition_type,
      conditionValue: row.condition_value,
    };
  },

  hasUnlockedAchievement(playerId: string, achievementCode: string): boolean {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM player_achievements pa
      JOIN achievements a ON pa.achievement_id = a.id
      WHERE pa.player_id = ? AND a.code = ?
    `);
    const result = stmt.get(playerId, achievementCode) as { count: number };
    return result.count > 0;
  },

  getTotalAchievementPoints(playerId: string): number {
    const stmt = db.prepare(`
      SELECT COALESCE(SUM(a.points), 0) as total
      FROM player_achievements pa
      JOIN achievements a ON pa.achievement_id = a.id
      WHERE pa.player_id = ?
    `);
    const result = stmt.get(playerId) as { total: number };
    return result.total;
  },

  getAchievementProgress(playerId: string): {
    total: number;
    unlocked: number;
    points: number;
    byRarity: Record<string, { total: number; unlocked: number }>;
  } {
    const allAchievements = this.getAllAchievements();
    const playerAchievements = this.getPlayerAchievements(playerId);
    const unlockedCodes = new Set(playerAchievements.map((pa) => pa.achievement.code));

    const byRarity: Record<string, { total: number; unlocked: number }> = {
      common: { total: 0, unlocked: 0 },
      rare: { total: 0, unlocked: 0 },
      epic: { total: 0, unlocked: 0 },
      legendary: { total: 0, unlocked: 0 },
    };

    for (const achievement of allAchievements) {
      byRarity[achievement.rarity].total++;
      if (unlockedCodes.has(achievement.code)) {
        byRarity[achievement.rarity].unlocked++;
      }
    }

    return {
      total: allAchievements.length,
      unlocked: playerAchievements.length,
      points: this.getTotalAchievementPoints(playerId),
      byRarity,
    };
  },
};

export default AchievementService;
