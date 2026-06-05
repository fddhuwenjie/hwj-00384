import { Router } from 'express';
import db from '../db/database.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
const router = Router();
router.get('/', asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 20, playerId, } = req.query;
    const pageNum = Number(page);
    const size = Number(pageSize);
    const offset = (pageNum - 1) * size;
    let whereClause = '';
    let params = [];
    if (playerId) {
        whereClause = 'WHERE gr.id IN (SELECT game_id FROM player_records WHERE player_id = ?)';
        params.push(playerId);
    }
    const countStmt = db.prepare(`
    SELECT COUNT(DISTINCT gr.id) as count
    FROM game_records gr
    ${whereClause}
  `);
    const { count } = countStmt.get(...params);
    const recordsStmt = db.prepare(`
    SELECT 
      gr.id,
      gr.room_code,
      gr.start_time,
      gr.end_time,
      gr.question_count,
      gr.created_at
    FROM game_records gr
    ${whereClause}
    ORDER BY gr.created_at DESC
    LIMIT ? OFFSET ?
  `);
    const records = recordsStmt.all(...params, size, offset);
    const gameIds = records.map((r) => r.id);
    let playerRecords = [];
    if (gameIds.length > 0) {
        const placeholders = gameIds.map(() => '?').join(',');
        const playersStmt = db.prepare(`
      SELECT 
        pr.game_id,
        pr.player_id,
        pr.nickname,
        pr.avatar,
        pr.final_score,
        pr.correct_count,
        pr.avg_response_time,
        pr.max_streak,
        pr.rank_position
      FROM player_records pr
      WHERE pr.game_id IN (${placeholders})
      ORDER BY pr.rank_position ASC
    `);
        playerRecords = playersStmt.all(...gameIds);
    }
    const items = records.map((record) => {
        const players = playerRecords
            .filter((pr) => pr.game_id === record.id)
            .map((pr) => ({
            playerId: pr.player_id,
            nickname: pr.nickname,
            score: pr.final_score,
            rank: pr.rank_position,
            correctCount: pr.correct_count,
            avgResponseTime: pr.avg_response_time,
            maxStreak: pr.max_streak,
            scoreDetails: [],
        }));
        return {
            id: record.id,
            roomCode: record.room_code,
            startTime: record.start_time,
            endTime: record.end_time,
            players,
            questionCount: record.question_count,
        };
    });
    const result = {
        items,
        total: count,
        page: pageNum,
        pageSize: size,
        totalPages: Math.ceil(count / size),
    };
    res.json(result);
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        throw createError('Invalid record ID', 400);
    }
    const recordStmt = db.prepare(`
    SELECT 
      gr.id,
      gr.room_code,
      gr.start_time,
      gr.end_time,
      gr.question_count
    FROM game_records gr
    WHERE gr.id = ?
  `);
    const record = recordStmt.get(id);
    if (!record) {
        throw createError('Record not found', 404);
    }
    const playersStmt = db.prepare(`
    SELECT 
      pr.player_id,
      pr.nickname,
      pr.avatar,
      pr.final_score,
      pr.correct_count,
      pr.avg_response_time,
      pr.max_streak,
      pr.rank_position
    FROM player_records pr
    WHERE pr.game_id = ?
    ORDER BY pr.rank_position ASC
  `);
    const playerRecords = playersStmt.all(id);
    const questionRecordsStmt = db.prepare(`
    SELECT 
      qr.id,
      qr.question_id,
      qr.question_index,
      qr.correct_answer_count,
      qr.avg_response_time,
      q.text,
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.correct_answer,
      q.difficulty,
      q.category,
      q.analysis
    FROM question_records qr
    JOIN questions q ON qr.question_id = q.id
    WHERE qr.game_id = ?
    ORDER BY qr.question_index ASC
  `);
    const questionRecords = questionRecordsStmt.all(id);
    const answerRecordsStmt = db.prepare(`
    SELECT 
      ar.question_record_id,
      ar.player_id,
      ar.selected_answer,
      ar.is_correct,
      ar.response_time,
      ar.base_score,
      ar.speed_bonus,
      ar.streak_bonus,
      ar.first_bonus,
      ar.total_score,
      ar.answered_at
    FROM answer_records ar
    JOIN question_records qr ON ar.question_record_id = qr.id
    WHERE qr.game_id = ?
  `);
    const answerRecords = answerRecordsStmt.all(id);
    const players = playerRecords.map((pr) => {
        const scoreDetails = questionRecords.map((qr) => {
            const answer = answerRecords.find((a) => a.question_record_id === qr.id && a.player_id === pr.player_id);
            return {
                questionId: qr.question_id,
                isCorrect: answer ? answer.is_correct === 1 : false,
                responseTime: 
            };
        });
    });
}));
