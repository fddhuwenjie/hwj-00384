import db from '../db/database.js';
const CATEGORIES = ['technology', 'history', 'geography', 'literature', 'sports', 'entertainment'];
const calculateRank = (playerId, column) => {
    const stmt = db.prepare(`
    SELECT COUNT(*) + 1 as rank
    FROM user_stats
    WHERE ${column} > (SELECT ${column} FROM user_stats WHERE player_id = ?)
  `);
    const result = stmt.get(playerId);
    return result.rank;
};
export const UserService = {
    getOrCreateStats(playerId, nickname) {
        const findStmt = db.prepare('SELECT * FROM user_stats WHERE player_id = ?');
        let stats = findStmt.get(playerId);
        if (!stats) {
            const insertStmt = db.prepare(`
        INSERT INTO user_stats (player_id, nickname)
        VALUES (?, ?)
      `);
            insertStmt.run(playerId, nickname);
            stats = findStmt.get(playerId);
            const categoryInsertStmt = db.prepare(`
        INSERT INTO category_stats (player_id, category)
        VALUES (?, ?)
      `);
            for (const cat of CATEGORIES) {
                categoryInsertStmt.run(playerId, cat);
            }
        }
        else if (stats.nickname !== nickname) {
            const updateStmt = db.prepare('UPDATE user_stats SET nickname = ? WHERE player_id = ?');
            updateStmt.run(nickname, playerId);
            stats = findStmt.get(playerId);
        }
        return stats;
    },
    updateStatsAfterGame(playerId, data) {
        const { score, correctCount, totalQuestions, avgResponseTime, maxStreak, isWinner, categories } = data;
        const stats = UserService.getOrCreateStats(playerId, '');
        const newTotalGames = stats.total_games + 1;
        const newTotalScore = stats.total_score + score;
        const newTotalCorrect = stats.total_correct + correctCount;
        const newTotalQuestions = stats.total_questions + totalQuestions;
        const newAvgResponseTime = Math.round((stats.avg_response_time * stats.total_questions + avgResponseTime * totalQuestions) / newTotalQuestions);
        const newMaxStreak = Math.max(stats.max_streak, maxStreak);
        const newWins = stats.wins + (isWinner ? 1 : 0);
        const now = new Date().toISOString();
        const updateStmt = db.prepare(`
      UPDATE user_stats
      SET total_games = ?, total_score = ?, total_correct = ?, total_questions = ?,
          avg_response_time = ?, max_streak = ?, wins = ?, last_played_at = ?, updated_at = ?
      WHERE player_id = ?
    `);
        updateStmt.run(newTotalGames, newTotalScore, newTotalCorrect, newTotalQuestions, newAvgResponseTime, newMaxStreak, newWins, now, now, playerId);
        const categoryUpdateStmt = db.prepare(`
      UPDATE category_stats
      SET total_questions = total_questions + ?,
          correct_questions = correct_questions + ?,
          total_score = total_score + ?,
          avg_response_time = ROUND((avg_response_time * total_questions + ? * ?) / (total_questions + ?), 2)
      WHERE player_id = ? AND category = ?
    `);
        for (const [category, catData] of Object.entries(categories)) {
            if (catData.total > 0) {
                categoryUpdateStmt.run(catData.total, catData.correct, catData.score, catData.avgTime, catData.total, catData.total, playerId, category);
            }
        }
    },
    getStats(playerId) {
        const findStmt = db.prepare('SELECT * FROM user_stats WHERE player_id = ?');
        const stats = findStmt.get(playerId);
        if (!stats) {
            return null;
        }
        const categoryStmt = db.prepare('SELECT * FROM category_stats WHERE player_id = ?');
        const categoryStats = categoryStmt.all(playerId);
        let bestCategory = 'technology';
        let bestAccuracy = 0;
        for (const cat of categoryStats) {
            if (cat.total_questions > 0) {
                const accuracy = cat.correct_questions / cat.total_questions;
                if (accuracy > bestAccuracy) {
                    bestAccuracy = accuracy;
                    bestCategory = cat.category;
                }
            }
        }
        return {
            playerId: stats.player_id,
            nickname: stats.nickname,
            totalGames: stats.total_games,
            wins: stats.wins,
            winRate: stats.total_games > 0 ? Math.round((stats.wins / stats.total_games) * 100) : 0,
            bestCategory,
            avgResponseTime: stats.avg_response_time,
            maxStreak: stats.max_streak,
            totalScore: stats.total_score,
            rank: {
                weekly: calculateRank(playerId, 'total_score'),
                monthly: calculateRank(playerId, 'total_score'),
                allTime: calculateRank(playerId, 'total_score'),
            },
        };
    },
    getRankings(type, category, pagination) {
        const { page = 1, pageSize = 20 } = pagination || {};
        const offset = (page - 1) * pageSize;
        let joinSql = '';
        let whereSql = '';
        const params = [];
        if (category) {
            joinSql = 'INNER JOIN category_stats cs ON us.player_id = cs.player_id';
            whereSql = 'WHERE cs.category = ?';
            params.push(category);
        }
        const countStmt = db.prepare(`
      SELECT COUNT(DISTINCT us.player_id) as count
      FROM user_stats us
      ${joinSql}
      ${whereSql}
    `);
        const total = countStmt.get(...params).count;
        const orderColumn = category ? 'cs.total_score' : 'us.total_score';
        const stmt = db.prepare(`
      SELECT us.player_id, us.nickname, us.total_games, us.wins, ${orderColumn} as score
      FROM user_stats us
      ${joinSql}
      ${whereSql}
      ORDER BY score DESC
      LIMIT ? OFFSET ?
    `);
        const rows = stmt.all(...params, pageSize, offset);
        const items = rows.map((row, index) => ({
            rank: offset + index + 1,
            playerId: row.player_id,
            nickname: row.nickname,
            score: row.score,
            winRate: row.total_games > 0 ? Math.round((row.wins / row.total_games) * 100) : 0,
            games: row.total_games,
        }));
        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    },
    updateWeeklyMonthlyScores() {
        db.exec(`
      UPDATE user_stats
      SET updated_at = CURRENT_TIMESTAMP
    `);
    },
};
export default UserService;
