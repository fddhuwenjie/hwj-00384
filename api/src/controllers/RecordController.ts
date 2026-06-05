import { Router, type Request, type Response } from 'express';
import db from '../db/database.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import type { GameRecord, PlayerResult, ScoreDetail, ReplayEvent, Question } from '../../../shared/types.js';
import type { PaginatedResult } from '../types/index.js';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    pageSize = 20,
    playerId,
  } = req.query;

  const pageNum = Number(page);
  const size = Number(pageSize);
  const offset = (pageNum - 1) * size;

  let whereClause = '';
  let params: any[] = [];

  if (playerId) {
    whereClause = 'WHERE gr.id IN (SELECT game_id FROM player_records WHERE player_id = ?)';
    params.push(playerId);
  }

  const countStmt = db.prepare(`
    SELECT COUNT(DISTINCT gr.id) as count
    FROM game_records gr
    ${whereClause}
  `);
  const { count } = countStmt.get(...params) as { count: number };

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

  const gameIds = records.map((r: any) => r.id);
  let playerRecords: any[] = [];

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

  const items: GameRecord[] = records.map((record: any) => {
    const players = playerRecords
      .filter((pr: any) => pr.game_id === record.id)
      .map((pr: any) => ({
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

  const result: PaginatedResult<GameRecord> = {
    items,
    total: count,
    page: pageNum,
    pageSize: size,
    totalPages: Math.ceil(count / size),
  };

  res.json(result);
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
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
  const record = recordStmt.get(id) as {
    id: number;
    room_code: string;
    start_time: string;
    end_time: string;
    question_count: number;
  } | undefined;

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
  const playerRecords = playersStmt.all(id) as {
    player_id: string;
    nickname: string;
    avatar: string | null;
    final_score: number;
    correct_count: number;
    avg_response_time: number;
    max_streak: number;
    rank_position: number;
  }[];

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
  const questionRecords = questionRecordsStmt.all(id) as {
    id: number;
    question_id: number;
    question_index: number;
    correct_answer_count: number;
    avg_response_time: number;
    text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: number;
    difficulty: number;
    category: string;
    analysis: string | null;
  }[];

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
  const answerRecords = answerRecordsStmt.all(id) as {
    question_record_id: number;
    player_id: string;
    selected_answer: number | null;
    is_correct: number;
    response_time: number;
    base_score: number;
    speed_bonus: number;
    streak_bonus: number;
    first_bonus: number;
    total_score: number;
    answered_at: string;
  }[];

  const players: PlayerResult[] = playerRecords.map((pr) => {
    const scoreDetails: ScoreDetail[] = questionRecords.map((qr) => {
      const answer = answerRecords.find(
        (a) => a.question_record_id === qr.id && a.player_id === pr.player_id
      );

      return {
        questionId: qr.question_id,
        isCorrect: answer ? answer.is_correct === 1 : false,
        responseTime: answer ? answer.response_time : 0,
        baseScore: answer ? answer.base_score : 0,
        speedBonus: answer ? answer.speed_bonus : 0,
        streakBonus: answer ? answer.streak_bonus : 0,
        firstBonus: answer ? answer.first_bonus : 0,
        totalScore: answer ? answer.total_score : 0,
      };
    });

    return {
      playerId: pr.player_id,
      nickname: pr.nickname,
      score: pr.final_score,
      rank: pr.rank_position,
      correctCount: pr.correct_count,
      avgResponseTime: pr.avg_response_time,
      maxStreak: pr.max_streak,
      scoreDetails,
    };
  });

  const questions = questionRecords.map((qr) => ({
    id: qr.question_id,
    text: qr.text,
    options: [qr.option_a, qr.option_b, qr.option_c, qr.option_d],
    correctAnswer: qr.correct_answer,
    difficulty: qr.difficulty,
    category: qr.category as any,
    analysis: qr.analysis || '',
    usageCount: 0,
    correctCount: qr.correct_answer_count,
    createdAt: '',
  }));

  const gameRecord: GameRecord & { questions: Question[] } = {
    id: record.id,
    roomCode: record.room_code,
    startTime: record.start_time,
    endTime: record.end_time,
    players,
    questionCount: record.question_count,
    questions,
  };

  res.json(gameRecord);
}));

router.get('/:id/replay', asyncHandler(async (req: Request, res: Response) => {
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
  const record = recordStmt.get(id) as {
    id: number;
    room_code: string;
    start_time: string;
    end_time: string;
    question_count: number;
  } | undefined;

  if (!record) {
    throw createError('Record not found', 404);
  }

  const questionRecordsStmt = db.prepare(`
    SELECT 
      qr.id,
      qr.question_id,
      qr.question_index,
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
      ar.total_score,
      ar.answered_at,
      pr.nickname
    FROM answer_records ar
    JOIN question_records qr ON ar.question_record_id = qr.id
    JOIN player_records pr ON ar.player_id = pr.player_id AND pr.game_id = qr.game_id
    WHERE qr.game_id = ?
    ORDER BY ar.response_time ASC
  `);
  const answerRecords = answerRecordsStmt.all(id);

  const playersStmt = db.prepare(`
    SELECT 
      pr.player_id,
      pr.nickname,
      pr.avatar,
      pr.final_score,
      pr.rank_position
    FROM player_records pr
    WHERE pr.game_id = ?
    ORDER BY pr.rank_position ASC
  `);
  const playerRecords = playersStmt.all(id);

  const events: ReplayEvent[] = [];
  let currentTime = 0;

  events.push({
    timestamp: currentTime,
    type: 'question',
    data: {
      totalQuestions: record.question_count,
      players: playerRecords.map((p: any) => ({
        playerId: p.player_id,
        nickname: p.nickname,
        avatar: p.avatar,
      })),
    },
  });

  questionRecords.forEach((qr: any, index: number) => {
    currentTime += 1000;

    const question: Question = {
      id: qr.question_id,
      text: qr.text,
      options: [qr.option_a, qr.option_b, qr.option_c, qr.option_d],
      correctAnswer: qr.correct_answer,
      difficulty: qr.difficulty,
      category: qr.category,
      analysis: qr.analysis || '',
      usageCount: 0,
      correctCount: 0,
      createdAt: '',
    };

    events.push({
      timestamp: currentTime,
      type: 'question',
      data: {
        questionIndex: index,
        question,
      },
    });

    const questionAnswers = answerRecords.filter((a: any) => a.question_record_id === qr.id);
    questionAnswers.forEach((answer: any) => {
      events.push({
        timestamp: currentTime + answer.response_time * 1000,
        type: 'answer',
        data: {
          questionIndex: index,
          playerId: answer.player_id,
          nickname: answer.nickname,
          answer: answer.selected_answer,
          responseTime: answer.response_time,
          isCorrect: answer.is_correct === 1,
        },
      });
    });

    currentTime += 15000;

    const scores: Record<string, ScoreDetail> = {};
    questionAnswers.forEach((answer: any) => {
      scores[answer.player_id] = {
        questionId: qr.question_id,
        isCorrect: answer.is_correct === 1,
        responseTime: answer.response_time,
        baseScore: 0,
        speedBonus: 0,
        streakBonus: 0,
        firstBonus: 0,
        totalScore: answer.total_score,
      };
    });

    events.push({
      timestamp: currentTime,
      type: 'reveal',
      data: {
        questionIndex: index,
        correctAnswer: qr.correct_answer,
        analysis: qr.analysis,
        scores,
      },
    });
  });

  currentTime += 2000;

  const standings = playerRecords.map((p: any) => ({
    playerId: p.player_id,
    nickname: p.nickname,
    score: p.final_score,
    rank: p.rank_position,
  }));

  events.push({
    timestamp: currentTime,
    type: 'score',
    data: {
      finalStandings: standings,
      recordId: id,
    },
  });

  res.json({
    recordId: id,
    roomCode: record.room_code,
    events,
    players: playerRecords.map((p: any) => ({
      playerId: p.player_id,
      nickname: p.nickname,
      avatar: p.avatar,
      finalScore: p.final_score,
      rank: p.rank_position,
    })),
  });
}));

export default router;
