import { Router, type Request, type Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { generateRoomCode } from '../utils/generateRoomCode.js';
import { generateAvatar } from '../utils/generateAvatar.js';
import db from '../db/database.js';
import type { Room, RoomSettings, Player, Category } from '../../../shared/types.js';

const router = Router();

export const rooms = new Map<string, Room>();

const getRandomQuestions = (settings: RoomSettings): any[] => {
  const { categories, minDifficulty, maxDifficulty, questionCount } = settings;

  const placeholders = categories.map(() => '?').join(',');
  const params = [...categories, minDifficulty, maxDifficulty];

  const stmt = db.prepare(`
    SELECT * FROM questions
    WHERE category IN (${placeholders})
      AND difficulty BETWEEN ? AND ?
    ORDER BY RANDOM()
    LIMIT ?
  `);

  const rows = stmt.all(...params, questionCount);
  return rows;
};

const mapRowToQuestion = (row: any) => {
  return {
    id: row.id,
    text: row.text,
    options: [row.option_a, row.option_b, row.option_c, row.option_d],
    correctAnswer: row.correct_answer,
    difficulty: row.difficulty,
    category: row.category as Category,
    analysis: row.analysis || '',
    usageCount: row.usage_count,
    correctCount: row.correct_count,
    createdAt: row.created_at,
  };
};

export const getRoomQuestions = (roomCode: string) => {
  const room = rooms.get(roomCode);
  if (!room) return null;
  return getRandomQuestions(room.settings).map(mapRowToQuestion);
};

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const publicRooms = Array.from(rooms.values())
    .filter(room => !room.hasPassword && room.status === 'waiting')
    .map(room => ({
      code: room.code,
      ownerId: room.ownerId,
      playerCount: room.players.length,
      maxPlayers: room.settings.maxPlayers,
      settings: {
        questionCount: room.settings.questionCount,
        timeLimit: room.settings.timeLimit,
        categories: room.settings.categories,
        minDifficulty: room.settings.minDifficulty,
        maxDifficulty: room.settings.maxDifficulty,
      },
      status: room.status,
      createdAt: room.createdAt,
      players: room.players.map(p => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        isReady: p.isReady,
      })),
    }));

  res.json(publicRooms);
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { nickname, settings } = req.body as {
    nickname: string;
    settings: RoomSettings;
  };

  if (!nickname || !settings) {
    throw createError('Nickname and settings are required', 400);
  }

  if (!settings.categories || settings.categories.length === 0) {
    throw createError('At least one category is required', 400);
  }

  let code: string;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const availableQuestions = getRandomQuestions(settings);
  if (availableQuestions.length < settings.questionCount) {
    throw createError(`Not enough questions available. Found ${availableQuestions.length}, need ${settings.questionCount}`, 400);
  }

  const playerId = crypto.randomUUID();
  const avatar = generateAvatar(nickname);

  const owner: Player = {
    id: playerId,
    nickname,
    avatar,
    score: 0,
    streak: 0,
    isReady: false,
    isOnline: true,
  };

  const room: Room = {
    code,
    ownerId: playerId,
    players: [owner],
    settings,
    status: 'waiting',
    createdAt: new Date().toISOString(),
    hasPassword: !!settings.password,
  };

  rooms.set(code, room);

  res.status(201).json({
    room: {
      code: room.code,
      ownerId: room.ownerId,
      settings: {
        ...settings,
        password: undefined,
      },
      status: room.status,
      createdAt: room.createdAt,
      hasPassword: room.hasPassword,
    },
    player: owner,
  });
}));

router.post('/:code/join', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const { nickname, password } = req.body as {
    nickname: string;
    password?: string;
  };

  if (!nickname) {
    throw createError('Nickname is required', 400);
  }

  const room = rooms.get(code);
  if (!room) {
    throw createError('Room not found', 404);
  }

  if (room.hasPassword && room.settings.password !== password) {
    throw createError('Invalid password', 403);
  }

  if (room.players.length >= room.settings.maxPlayers) {
    throw createError('Room is full', 400);
  }

  if (room.status !== 'waiting') {
    throw createError('Game already started', 400);
  }

  const existingNickname = room.players.find(p => p.nickname === nickname);
  if (existingNickname) {
    throw createError('Nickname already taken', 400);
  }

  const playerId = crypto.randomUUID();
  const avatar = generateAvatar(nickname);

  const player: Player = {
    id: playerId,
    nickname,
    avatar,
    score: 0,
    streak: 0,
    isReady: false,
    isOnline: true,
  };

  room.players.push(player);

  res.json({
    room: {
      code: room.code,
      ownerId: room.ownerId,
      settings: {
        ...room.settings,
        password: undefined,
      },
      status: room.status,
      createdAt: room.createdAt,
      hasPassword: room.hasPassword,
    },
    player,
    players: room.players,
  });
}));

router.post('/:code/leave', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const { playerId } = req.body as { playerId: string };

  if (!playerId) {
    throw createError('Player ID is required', 400);
  }

  const room = rooms.get(code);
  if (!room) {
    throw createError('Room not found', 404);
  }

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    throw createError('Player not found in room', 404);
  }

  room.players.splice(playerIndex, 1);

  if (room.players.length === 0) {
    rooms.delete(code);
  } else if (room.ownerId === playerId) {
    room.ownerId = room.players[0].id;
  }

  res.json({
    success: true,
    room: {
      code: room.code,
      ownerId: room.ownerId,
      players: room.players,
      status: room.status,
    },
  });
}));

router.put('/:code/settings', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const { ownerId, settings } = req.body as {
    ownerId: string;
    settings: Partial<RoomSettings>;
  };

  if (!ownerId) {
    throw createError('Owner ID is required', 400);
  }

  const room = rooms.get(code);
  if (!room) {
    throw createError('Room not found', 404);
  }

  if (room.ownerId !== ownerId) {
    throw createError('Only room owner can update settings', 403);
  }

  if (room.status !== 'waiting') {
    throw createError('Cannot update settings after game starts', 400);
  }

  room.settings = {
    ...room.settings,
    ...settings,
  };

  if (settings.password !== undefined) {
    room.hasPassword = !!settings.password;
  }

  res.json({
    success: true,
    settings: {
      ...room.settings,
      password: undefined,
    },
  });
}));

router.post('/:code/kick', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const { ownerId, playerId } = req.body as {
    ownerId: string;
    playerId: string;
  };

  if (!ownerId || !playerId) {
    throw createError('Owner ID and Player ID are required', 400);
  }

  const room = rooms.get(code);
  if (!room) {
    throw createError('Room not found', 404);
  }

  if (room.ownerId !== ownerId) {
    throw createError('Only room owner can kick players', 403);
  }

  if (ownerId === playerId) {
    throw createError('Cannot kick yourself', 400);
  }

  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    throw createError('Player not found in room', 404);
  }

  room.players.splice(playerIndex, 1);

  res.json({
    success: true,
    kickedPlayerId: playerId,
    players: room.players,
  });
}));

router.post('/:code/start', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const { ownerId } = req.body as { ownerId: string };

  if (!ownerId) {
    throw createError('Owner ID is required', 400);
  }

  const room = rooms.get(code);
  if (!room) {
    throw createError('Room not found', 404);
  }

  if (room.ownerId !== ownerId) {
    throw createError('Only room owner can start the game', 403);
  }

  if (room.status !== 'waiting') {
    throw createError('Game already started', 400);
  }

  if (room.players.length < 1) {
    throw createError('At least 1 player required', 400);
  }

  const questions = getRandomQuestions(room.settings);
  if (questions.length < room.settings.questionCount) {
    throw createError('Not enough questions available', 400);
  }

  room.status = 'playing';
  room.players.forEach(p => {
    p.score = 0;
    p.streak = 0;
  });

  if ((globalThis as any).startGame) {
    (globalThis as any).startGame(code);
  }

  res.json({
    success: true,
    status: room.status,
    totalQuestions: room.settings.questionCount,
    timeLimit: room.settings.timeLimit,
    players: room.players,
  });
}));

export default router;
