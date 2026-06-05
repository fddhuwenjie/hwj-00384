import db from '../db/database.js';
export const ACHIEVEMENT_DEFINITIONS = [
    {
        code: 'FIRST_WIN',
        name: '初露锋芒',
        description: '赢得第一场比赛的胜利',
        icon: '🏆',
        conditionType: 'wins',
        conditionValue: 1,
        rarity: 'common',
        points: 10,
        check: (stats) => stats.wins >= 1,
    },
    {
        code: 'WIN_STREAK_5',
        name: '连胜达人',
        description: '连续赢得5场比赛',
        icon: '🔥',
        conditionType: 'current_streak',
        conditionValue: 5,
        rarity: 'rare',
        points: 30,
        check: (stats) => stats.current_streak >= 5,
    },
    {
        code: 'HIGH_ACCURACY',
        name: '精准射手',
        description: '答题正确率达到90%以上（至少100题）',
        icon: '🎯',
        conditionType: 'accuracy',
        conditionValue: 90,
        rarity: 'epic',
        points: 50,
        check: (stats) => stats.total_questions >= 100 &&
            stats.total_questions > 0 &&
            stats.total_correct / stats.total_questions >= 0.9,
    },
    {
        code: 'GAMES_50',
        name: '活跃玩家',
        description: '参与50场比赛',
        icon: '🎮',
        conditionType: 'total_games',
        conditionValue: 50,
        rarity: 'common',
        points: 15,
        check: (stats) => stats.total_games >= 50,
    },
    {
        code: 'GAMES_200',
        name: '资深玩家',
        description: '参与200场比赛',
        icon: '👑',
        conditionType: 'total_games',
        conditionValue: 200,
        rarity: 'rare',
        points: 40,
        check: (stats) => stats.total_games >= 200,
    },
    {
        code: 'SCORE_10000',
        name: '积分达人',
        description: '累计获得10000积分',
        icon: '💎',
        conditionType: 'total_score',
        conditionValue: 10000,
        rarity: 'rare',
        points: 35,
        check: (stats) => stats.total_score >= 10000,
    },
    {
        code: 'STREAK_MASTER',
        name: '连胜大师',
        description: '最高连胜达到10场',
        icon: '⚡',
        conditionType: 'max_streak',
        conditionValue: 10,
        rarity: 'epic',
        points: 60,
        check: (stats) => stats.max_streak >= 10,
    },
    {
        code: 'SPEED_DEMON',
        name: '闪电手速',
        description: '平均答题时间小于3秒（至少50题）',
        icon: '⚡',
        conditionType: 'avg_response_time',
        conditionValue: 3000,
        rarity: 'rare',
        points: 30,
        check: (stats) => stats.total_questions >= 50 && stats.avg_response_time < 3000,
    },
    {
        code: 'CATEGORY_MASTER',
        name: '分类专家',
        description: '在任一分类正确率达到95%以上（至少30题）',
        icon: '📚',
        conditionType: 'category_accuracy',
        conditionValue: 95,
        rarity: 'epic',
        points: 55,
        check: (_, categoryStats) => categoryStats.some((cat) => cat.total_questions >= 30 &&
            cat.total_questions > 0 &&
            cat.correct_questions / cat.total_questions >= 0.95),
    },
    {
        code: 'LEGEND',
        name: '传奇王者',
        description: '获得赛季排名第一',
        icon: '👑',
        conditionType: 'season_rank',
        conditionValue: 1,
        rarity: 'legendary',
        points: 100,
        check: (_, __, seasonRankings) => seasonRankings.some((rank) => rank.rank_position === 1),
    },
];
export const initAchievements = () => {
    const stmt = db.prepare(`
    INSERT OR IGNORE INTO achievements (code, name, description, icon, condition_type, condition_value, rarity, points)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const tx = db.transaction(() => {
        for (const def of ACHIEVEMENT_DEFINITIONS) {
            stmt.run(def.code, def.name, def.description, def.icon, def.conditionType, def.conditionValue, def.rarity, def.points);
        }
    });
    tx();
};
export const checkAchievements = (playerId) => {
    const statsStmt = db.prepare('SELECT * FROM user_stats WHERE player_id = ?');
    const stats = statsStmt.get(playerId);
    if (!stats) {
        return [];
    }
    const categoryStmt = db.prepare('SELECT * FROM category_stats WHERE player_id = ?');
    const categoryStats = categoryStmt.all(playerId);
    const seasonRankingStmt = db.prepare('SELECT * FROM season_rankings WHERE player_id = ?');
    const seasonRankings = seasonRankingStmt.all(playerId);
    const unlockedAchievementsStmt = db.prepare(`
    SELECT a.code
    FROM player_achievements pa
    JOIN achievements a ON pa.achievement_id = a.id
    WHERE pa.player_id = ?
  `);
    const unlockedCodes = new Set(unlockedAchievementsStmt.all(playerId).map((a) => a.code));
    const newlyUnlocked = [];
    const now = new Date().toISOString();
    const unlockStmt = db.prepare(`
    INSERT INTO player_achievements (player_id, achievement_id, unlocked_at)
    VALUES (?, ?, ?)
  `);
    const getAchievementStmt = db.prepare('SELECT * FROM achievements WHERE code = ?');
    const tx = db.transaction(() => {
        for (const def of ACHIEVEMENT_DEFINITIONS) {
            if (!unlockedCodes.has(def.code) && def.check(stats, categoryStats, seasonRankings)) {
                const achievementRow = getAchievementStmt.get(def.code);
                if (achievementRow) {
                    unlockStmt.run(playerId, achievementRow.id, now);
                    newlyUnlocked.push({
                        achievement: {
                            id: achievementRow.id,
                            code: achievementRow.code,
                            name: achievementRow.name,
                            description: achievementRow.description,
                            icon: achievementRow.icon,
                            rarity: achievementRow.rarity,
                            points: achievementRow.points,
                            conditionType: achievementRow.condition_type,
                            conditionValue: achievementRow.condition_value,
                        },
                        unlockedAt: now,
                    });
                }
            }
        }
    });
    tx();
    return newlyUnlocked;
};
export default {
    ACHIEVEMENT_DEFINITIONS,
    initAchievements,
    checkAchievements,
};
