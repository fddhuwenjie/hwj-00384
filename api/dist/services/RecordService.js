import db from '../db/database.js';
const rowToQuestion = (row) => ({
    id: row.id,
    text: row.text,
    options: [row.option_a, row.option_b, row.option_c, row.option_d],
    correctAnswer: row.correct_answer,
    difficulty: row.difficulty,
    category: row.category,
    analysis: row.analysis || '',
    usageCount: row.usage_count,
    correctCount: row.correct_count,
    createdAt: row.created_at,
});
export const RecordService = {
    createRecord(data) {
        const insertGameStmt = db.prepare(`
      INSERT INTO game_records (room_code, start_time, question_count)
      VALUES (?, ?, ?)
    `);
        const insertPlayerStmt = db.prepare(`
      INSERT INTO player_records (game_id, player_id, nickname, avatar)
      VALUES (?, ?, ?, ?)
    `);
        const createRecordTx = db.transaction(() => {
            const gameResult = insertGameStmt.run(data.roomCode, data.startTime, data.questionCount);
            const gameId = gameResult.lastInsertRowid;
            for (const player of data.players) {
                insertPlayerStmt.run(gameId, player.playerId, player.nickname, player.avatar);
            }
            return gameId;
        });
        return createRecordTx();
    },
    addQuestionRecord(gameId, questionId, questionIndex) {
        const stmt = db.prepare(`
      INSERT INTO question_records (game_id, question_id, question_index)
      VALUES (?, ?, ?)
    `);
        const result = stmt.run(gameId, questionId, questionIndex);
        return result.lastInsertRowid;
    },
    addAnswerRecord(data) {
        const stmt = db.prepare(`
      INSERT INTO answer_records (
        question_record_id, player_id, selected_answer, is_correct,
        response_time, base_score, speed_bonus, streak_bonus, first_bonus, total_score
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(data.questionRecordId, data.playerId, data.answer, data.isCorrect ? 1 : 0, data.responseTime, data.scoreBreakdown.baseScore, data.scoreBreakdown.speedBonus, data.scoreBreakdown.streakBonus, data.scoreBreakdown.firstBonus, data.scoreBreakdown.totalScore);
        return result.lastInsertRowid;
    },
    finishRecord(gameId, endTime, playerResults) {
        const updateGameStmt = db.prepare(`
      UPDATE game_records
      SET end_time = ?
      WHERE id = ?
    `);
        const updatePlayerStmt = db.prepare(`
      UPDATE player_records
      SET final_score = ?, correct_count = ?, avg_response_time = ?,
          max_streak = ?, rank_position = ?
      WHERE game_id = ? AND player_id = ?
    `);
        const updateQuestionStmt = db.prepare(`
      UPDATE question_records
      SET correct_answer_count = (
        SELECT COUNT(*) FROM answer_records ar
        WHERE ar.question_record_id = question_records.id
          AND ar.is_correct = 1
      ),
      avg_response_time = (
        SELECT AVG(ar.response_time) FROM answer_records ar
        WHERE ar.question_record_id = question_records.id
      )
      WHERE game_id = ?
    `);
        const finishTx = db.transaction(() => {
            updateGameStmt.run(endTime, gameId);
            for (const result of playerResults) {
                updatePlayerStmt.run(result.score, result.correctCount, result.avgResponseTime, result.maxStreak, result.rank, gameId, result.playerId);
            }
            updateQuestionStmt.run(gameId);
        });
        finishTx();
    },
    getRecords(params) {
        const { playerId, page, pageSize } = params;
        const offset = (page - 1) * pageSize;
        let whereSql = '';
        const paramsArr = [];
        if (playerId) {
            whereSql = `
        WHERE gr.id IN (
          SELECT DISTINCT game_id FROM player_records WHERE player_id = ?
        )
      `;
            paramsArr.push(playerId);
        }
        const countStmt = db.prepare(`
      SELECT COUNT(*) as count FROM game_records gr
      ${whereSql}
    `);
        const total = countStmt.get(...paramsArr).count;
        const gameStmt = db.prepare(`
      SELECT gr.* FROM game_records gr
      ${whereSql}
      ORDER BY gr.created_at DESC
      LIMIT ? OFFSET ?
    `);
        const gameRows = gameStmt.all(...paramsArr, pageSize, offset);
        const items = gameRows.map(row => {
            const playerStmt = db.prepare(`
        SELECT * FROM player_records WHERE game_id = ? ORDER BY rank_position ASC
      `);
            const playerRows = playerStmt.all(row.id);
            const players = playerRows.map(pr => ({
                playerId: pr.player_id,
                nickname: pr.nickname,
                score: pr.final_score,
                rank: pr.rank_position || 0,
                correctCount: pr.correct_count,
                avgResponseTime: pr.avg_response_time,
                maxStreak: pr.max_streak,
                scoreDetails: [],
            }));
            return {
                id: row.id,
                roomCode: row.room_code,
                startTime: row.start_time,
                endTime: row.end_time || '',
                players,
                questionCount: row.question_count,
            };
        });
        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    },
    getRecordDetail(id) {
        const gameStmt = db.prepare('SELECT * FROM game_records WHERE id = ?');
        const gameRow = gameStmt.get(id);
        if (!gameRow) {
            return null;
        }
        const playerStmt = db.prepare(`
      SELECT pr.*, ar.*, qr.question_id, qr.question_index
      FROM player_records pr
      LEFT JOIN answer_records ar ON ar.player_id = pr.player_id
      LEFT JOIN question_records qr ON qr.id = ar.question_record_id
      WHERE pr.game_id = ?
      ORDER BY pr.rank_position ASC, qr.question_index ASC
    `);
        const rows = playerStmt.all(id);
        const playerMap = new Map();
        for (const row of rows) {
            if (!playerMap.has(row.player_id)) {
                playerMap.set(row.player_id, {
                    playerId: row.player_id,
                    nickname: row.nickname,
                    score: row.final_score,
                    rank: row.rank_position || 0,
                    correctCount: row.correct_count,
                    avgResponseTime: row.avg_response_time,
                    maxStreak: row.max_streak,
                    scoreDetails: [],
                });
            }
            if (row.question_id) {
                const player = playerMap.get(row.player_id);
                player.scoreDetails.push({
                    questionId: row.question_id,
                    isCorrect: row.is_correct === 1,
                    responseTime: row.response_time,
                    baseScore: row.base_score,
                    speedBonus: row.speed_bonus,
                    streakBonus: row.streak_bonus,
                    firstBonus: row.first_bonus,
                    totalScore: row.total_score,
                });
            }
        }
        return {
            id: gameRow.id,
            roomCode: gameRow.room_code,
            startTime: gameRow.start_time,
            endTime: gameRow.end_time || '',
            players: Array.from(playerMap.values()),
            questionCount: gameRow.question_count,
        };
    },
    getReplayData(id) {
        const gameStmt = db.prepare('SELECT * FROM game_records WHERE id = ?');
        const gameRow = gameStmt.get(id);
        if (!gameRow) {
            return null;
        }
        const questionStmt = db.prepare(`
      SELECT qr.*, q.*
      FROM question_records qr
      INNER JOIN questions q ON q.id = qr.question_id
      WHERE qr.game_id = ?
      ORDER BY qr.question_index ASC
    `);
        const questionRows = questionStmt.all(id);
        const answerStmt = db.prepare(`
      SELECT ar.*, qr.question_index
      FROM answer_records ar
      INNER JOIN question_records qr ON qr.id = ar.question_record_id
      WHERE qr.game_id = ?
      ORDER BY ar.answered_at ASC
    `);
        const answerRows = answerStmt.all(id);
        const playerStmt = db.prepare(`
      SELECT * FROM player_records WHERE game_id = ?
    `);
        const playerRows = playerStmt.all(id);
        const events = [];
        const startTime = new Date(gameRow.start_time).getTime();
        events.push({
            timestamp: 0,
            type: 'question',
            data: {
                players: playerRows.map(p => ({
                    playerId: p.player_id,
                    nickname: p.nickname,
                    avatar: p.avatar,
                })),
            },
        });
        for (const qRow of questionRows) {
            const question = rowToQuestion(qRow);
            const questionTime = qRow.question_index * 15000;
            events.push({
                timestamp: questionTime,
                type: 'question',
                data: {
                    questionIndex: qRow.question_index,
                    question,
                },
            });
            const questionAnswers = answerRows.filter(a => a.question_index === qRow.question_index);
            for (const aRow of questionAnswers) {
                events.push({
                    timestamp: questionTime + aRow.response_time,
                    type: 'answer',
                    data: {
                        questionIndex: qRow.question_index,
                        playerId: aRow.player_id,
                        answer: aRow.selected_answer,
                        isCorrect: aRow.is_correct === 1,
                    },
                });
            }
            events.push({
                timestamp: questionTime + 10000,
                type: 'reveal',
                data: {
                    questionIndex: qRow.question_index,
                    correctAnswer: question.correctAnswer,
                    analysis: question.analysis,
                },
            });
            const scores = {};
            for (const aRow of questionAnswers) {
                scores[aRow.player_id] = {
                    questionId: question.id,
                    isCorrect: aRow.is_correct === 1,
                    responseTime: aRow.response_time,
                    baseScore: aRow.base_score,
                    speedBonus: aRow.speed_bonus,
                    streakBonus: aRow.streak_bonus,
                    firstBonus: aRow.first_bonus,
                    totalScore: aRow.total_score,
                };
            }
            events.push({
                timestamp: questionTime + 11000,
                type: 'score',
                data: {
                    questionIndex: qRow.question_index,
                    scores,
                },
            });
        }
        return events.sort((a, b) => a.timestamp - b.timestamp);
    },
};
export default RecordService;
