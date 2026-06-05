import http from 'http';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import questionController from './controllers/QuestionController.js';
import roomController, { rooms, getRoomQuestions } from './controllers/RoomController.js';
import recordController from './controllers/RecordController.js';
import userController from './controllers/UserController.js';
import seasonController from './controllers/SeasonController.js';
import achievementController from './controllers/AchievementController.js';
import friendController from './controllers/FriendController.js';
import contributionController from './controllers/ContributionController.js';
import teamController from './controllers/TeamController.js';
import { errorHandler, createError } from './middleware/errorHandler.js';
import { seedQuestions } from './db/seed.js';
import * as GameService from './services/GameService.js';
import SeasonService from './services/SeasonService.js';
import AchievementService from './services/AchievementService.js';
import FriendService from './services/FriendService.js';
import db from './db/database.js';

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Question,
  ScoreDetail,
  PlayerResult,
} from '../../shared/types.js';

dotenv.config();

const PORT = 8384;

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/questions', questionController);
app.use('/api/rooms', roomController);
app.use('/api/records', recordController);
app.use('/api/users', userController);
app.use('/api/seasons', seasonController);
app.use('/api/achievements', achievementController);
app.use('/api/friends', friendController);
app.use('/api/contributions', contributionController);
app.use('/api/teams', teamController);

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError('API not found', 404));
});

app.use(errorHandler);

const socketRooms = new Map<string, Set<string>>();
const playerSockets = new Map<string, string>();
const viewerSockets = new Map<string, { roomCode: string; socketId: string }>();
const pendingInvites = new Map<string, {
  id: string;
  inviterId: string;
  inviterNickname: string;
  inviterAvatar?: string;
  roomCode: string;
  receiverId: string;
  expiresAt: number;
}>();

const updateUserOnlineStatus = (playerId: string, isOnline: boolean) => {
  const stmt = db.prepare(`
    UPDATE user_stats SET is_online = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?
  `);
  stmt.run(isOnline ? 1 : 0, playerId);

  const friends = FriendService.getFriends(playerId, rooms);
  friends.forEach((friend) => {
    const socketId = playerSockets.get(friend.playerId);
    if (socketId) {
      io.to(socketId).emit(isOnline ? 'friend:online' : 'friend:offline', { playerId });
    }
  });
};

const updateUserInGameStatus = (playerId: string, isInGame: boolean, roomCode?: string) => {
  const stmt = db.prepare(`
    UPDATE user_stats SET is_in_game = ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?
  `);
  stmt.run(isInGame ? 1 : 0, playerId);

  const friends = FriendService.getFriends(playerId, rooms);
  friends.forEach((friend) => {
    const socketId = playerSockets.get(friend.playerId);
    if (socketId) {
      if (isInGame && roomCode) {
        io.to(socketId).emit('friend:game:start', { playerId, roomCode });
      } else {
        io.to(socketId).emit('friend:game:end', { playerId });
      }
    }
  });
};

const sendGameStateToViewers = (roomCode: string) => {
  const gameState = GameService.getGameState(roomCode);
  if (!gameState) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const playerStates: Record<string, { answered: boolean; score: number; streak: number }> = {};
  room.players.forEach((player) => {
    const score = gameState.scores.get(player.id);
    const answers = gameState.playerAnswers.get(player.id);
    playerStates[player.id] = {
      answered: answers?.has(gameState.currentQuestionIndex) || false,
      score: score?.total || 0,
      streak: score?.streak || 0,
    };
  });

  const currentQuestion = gameState.phase === 'question' || gameState.phase === 'reveal'
    ? gameState.questions[gameState.currentQuestionIndex]
    : undefined;

  const remainingTime = gameState.phase === 'question' && gameState.questionStartTime > 0
    ? Math.max(0, gameState.timeLimit * 1000 - (Date.now() - gameState.questionStartTime))
    : undefined;

  io.to(`room:${roomCode}:watch`).emit('watch:gameState', {
    phase: gameState.phase,
    question: currentQuestion,
    questionIndex: gameState.currentQuestionIndex,
    remainingTime,
    playerStates,
  });
};

const processQuestion = async (roomCode: string, questionData: {
  question: Question;
  questionIndex: number;
  startTime: number;
  endTime: number;
}) => {
  const { question, questionIndex, startTime, endTime } = questionData;

  io.to(`room:${roomCode}`).emit('game:question', {
    question: {
      ...question,
      correctAnswer: undefined as any,
      analysis: '',
    },
    questionIndex,
    startTime,
    endTime,
  });

  sendGameStateToViewers(roomCode);

  GameService.setQuestionTimer(roomCode, () => {
    const revealResult = GameService.revealAnswer(roomCode, questionIndex);
    if (revealResult) {
      io.to(`room:${roomCode}`).emit('game:reveal', revealResult);
      sendGameStateToViewers(roomCode);
    }

    setTimeout(() => {
      const nextQuestion = GameService.nextQuestion(roomCode);
      if (nextQuestion) {
        processQuestion(roomCode, nextQuestion);
      } else {
        const finishResult = GameService.finishGame(roomCode);
        if (finishResult) {
          io.to(`room:${roomCode}`).emit('game:finished', finishResult);
          io.to(`room:${roomCode}:watch`).emit('game:finished', finishResult);

          for (const standing of finishResult.finalStandings) {
            updateUserInGameStatus(standing.playerId, false);
            
            const unlockedAchievements = AchievementService.checkAndUnlockAchievements(standing.playerId);
            for (const ua of unlockedAchievements) {
              const socketId = playerSockets.get(standing.playerId);
              if (socketId) {
                io.to(socketId).emit('achievement:unlocked', ua);
              }
            }
          }
        }

        const room = rooms.get(roomCode);
        if (room) {
          room.status = 'finished';
        }
      }
    }, 3000);
  });
};

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('user:online', (data) => {
    const { playerId } = data;
    console.log(`[Socket] user:online - ${playerId}`);
    playerSockets.set(playerId, socket.id);
    updateUserOnlineStatus(playerId, true);
  });

  socket.on('user:offline', (data) => {
    const { playerId } = data;
    console.log(`[Socket] user:offline - ${playerId}`);
    playerSockets.delete(playerId);
    updateUserOnlineStatus(playerId, false);
  });

  socket.on('friend:invite', (data) => {
    const { friendId, roomCode } = data;
    const inviterId = Array.from(playerSockets.entries()).find(([_, sid]) => sid === socket.id)?.[0];
    
    if (!inviterId) {
      console.log('[Socket] friend:invite - inviter not found');
      return;
    }

    console.log(`[Socket] friend:invite - ${inviterId} inviting ${friendId} to room ${roomCode}`);

    const inviterStmt = db.prepare('SELECT nickname, avatar FROM user_stats WHERE player_id = ?');
    const inviter = inviterStmt.get(inviterId) as { nickname: string; avatar?: string } | undefined;
    
    if (!inviter) return;

    const inviteId = crypto.randomUUID();
    const invite = {
      id: inviteId,
      inviterId,
      inviterNickname: inviter.nickname,
      inviterAvatar: inviter.avatar || undefined,
      roomCode,
      receiverId: friendId,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    pendingInvites.set(inviteId, invite);

    const receiverSocketId = playerSockets.get(friendId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('friend:invite:received', {
        id: invite.id,
        inviterId: invite.inviterId,
        inviterNickname: invite.inviterNickname,
        inviterAvatar: invite.inviterAvatar,
        roomCode: invite.roomCode,
        expiresAt: invite.expiresAt,
      });
    }

    setTimeout(() => {
      pendingInvites.delete(inviteId);
    }, 5 * 60 * 1000);
  });

  socket.on('friend:invite:accept', (data) => {
    const { inviteId } = data;
    console.log(`[Socket] friend:invite:accept - ${inviteId}`);

    const invite = pendingInvites.get(inviteId);
    if (!invite || invite.expiresAt < Date.now()) {
      pendingInvites.delete(inviteId);
      return;
    }

    pendingInvites.delete(inviteId);

    const inviterSocketId = playerSockets.get(invite.inviterId);
    if (inviterSocketId) {
      io.to(inviterSocketId).emit('notification', {
        id: crypto.randomUUID(),
        type: 'success',
        title: '邀请已接受',
        message: `${invite.inviterNickname} 接受了你的房间邀请`,
        createdAt: Date.now(),
      });
    }
  });

  socket.on('friend:invite:decline', (data) => {
    const { inviteId } = data;
    console.log(`[Socket] friend:invite:decline - ${inviteId}`);

    const invite = pendingInvites.get(inviteId);
    if (!invite) return;

    pendingInvites.delete(inviteId);

    const inviterSocketId = playerSockets.get(invite.inviterId);
    if (inviterSocketId) {
      io.to(inviterSocketId).emit('notification', {
        id: crypto.randomUUID(),
        type: 'info',
        title: '邀请已拒绝',
        message: `${invite.inviterNickname} 拒绝了你的房间邀请`,
        createdAt: Date.now(),
      });
    }
  });

  socket.on('room:join', async (data) => {
    const { roomCode, playerId } = data;
    console.log(`[Socket] room:join - ${socket.id} joining room ${roomCode} as ${playerId}`);

    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('room:playerKicked', {
        playerId,
        reason: 'Room not found',
      });
      return;
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      socket.emit('room:playerKicked', {
        playerId,
        reason: 'Player not in room',
      });
      return;
    }

    player.isOnline = true;
    playerSockets.set(playerId, socket.id);

    socket.join(`room:${roomCode}`);

    let roomSockets = socketRooms.get(roomCode);
    if (!roomSockets) {
      roomSockets = new Set();
      socketRooms.set(roomCode, roomSockets);
    }
    roomSockets.add(socket.id);

    io.to(`room:${roomCode}`).emit('room:playerJoined', { player });
  });

  socket.on('room:leave', (data) => {
    const { roomCode, playerId } = data;
    console.log(`[Socket] room:leave - ${socket.id} leaving room ${roomCode}`);

    const room = rooms.get(roomCode);
    if (room) {
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.isOnline = false;
      }
    }

    socket.leave(`room:${roomCode}`);
    playerSockets.delete(playerId);

    const roomSockets = socketRooms.get(roomCode);
    if (roomSockets) {
      roomSockets.delete(socket.id);
      if (roomSockets.size === 0) {
        socketRooms.delete(roomCode);
      }
    }

    io.to(`room:${roomCode}`).emit('room:playerLeft', { playerId });
  });

  socket.on('game:answer', (data) => {
    const { roomCode, playerId, questionIndex, answer, responseTime } = data;
    console.log(`[Socket] game:answer - ${playerId} answered question ${questionIndex} in room ${roomCode}`);

    const result = GameService.submitAnswer(roomCode, playerId, questionIndex, answer, responseTime);

    io.to(`room:${roomCode}`).emit('game:playerAnswered', {
      playerId,
      questionIndex,
      responseTime,
    });

    sendGameStateToViewers(roomCode);

    const gameState = GameService.getGameState(roomCode);
    if (gameState) {
      const room = rooms.get(roomCode);
      if (room) {
        const player = room.players.find((p) => p.id === playerId);
        if (player && result.score) {
          player.score += result.score.totalScore;
          player.streak = result.score.isCorrect ? player.streak + 1 : 0;
        }

        const allAnswered = room.players.every((p) => {
          const answers = gameState.playerAnswers.get(p.id);
          return answers?.has(questionIndex);
        });

        if (allAnswered) {
          const revealResult = GameService.revealAnswer(roomCode, questionIndex);
          if (revealResult) {
            io.to(`room:${roomCode}`).emit('game:reveal', revealResult);
            sendGameStateToViewers(roomCode);
          }

          setTimeout(() => {
            const nextQuestion = GameService.nextQuestion(roomCode);
            if (nextQuestion) {
              processQuestion(roomCode, nextQuestion);
            } else {
              const finishResult = GameService.finishGame(roomCode);
              if (finishResult) {
                io.to(`room:${roomCode}`).emit('game:finished', finishResult);
                io.to(`room:${roomCode}:watch`).emit('game:finished', finishResult);

                for (const standing of finishResult.finalStandings) {
                  updateUserInGameStatus(standing.playerId, false);
                  
                  const unlockedAchievements = AchievementService.checkAndUnlockAchievements(standing.playerId);
                  for (const ua of unlockedAchievements) {
                    const socketId = playerSockets.get(standing.playerId);
                    if (socketId) {
                      io.to(socketId).emit('achievement:unlocked', ua);
                    }
                  }
                }
              }

              if (room) {
                room.status = 'finished';
              }
            }
          }, 3000);
        }
      }
    }
  });

  socket.on('watch:join', (data) => {
    const { roomCode, viewerId, nickname } = data;
    console.log(`[Socket] watch:join - ${viewerId} (${nickname}) watching room ${roomCode}`);

    const viewerCount = GameService.addViewer(roomCode, viewerId, nickname, socket.id);
    viewerSockets.set(viewerId, { roomCode, socketId: socket.id });

    socket.join(`room:${roomCode}:watch`);

    io.to(`room:${roomCode}:watch`).emit('watch:viewerJoined', {
      viewerId,
      nickname,
      count: viewerCount,
    });

    sendGameStateToViewers(roomCode);
  });

  socket.on('watch:leave', (data) => {
    const { roomCode, viewerId } = data;
    console.log(`[Socket] watch:leave - ${viewerId} leaving watch room ${roomCode}`);

    const viewerCount = GameService.removeViewer(roomCode, viewerId);
    viewerSockets.delete(viewerId);

    socket.leave(`room:${roomCode}:watch`);

    io.to(`room:${roomCode}:watch`).emit('watch:viewerLeft', {
      viewerId,
      count: viewerCount,
    });
  });

  socket.on('watch:danmu', (data) => {
    const { roomCode, viewerId, nickname, content, color } = data;
    console.log(`[Socket] watch:danmu - ${nickname}: ${content} in room ${roomCode}`);

    const danmu = GameService.addDanmu(roomCode, viewerId, nickname, content, color);

    io.to(`room:${roomCode}`).emit('watch:danmu', danmu);
    io.to(`room:${roomCode}:watch`).emit('watch:danmu', danmu);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);

    for (const [playerId, socketId] of playerSockets) {
      if (socketId === socket.id) {
        for (const [roomCode, room] of rooms) {
          const player = room.players.find((p) => p.id === playerId);
          if (player) {
            player.isOnline = false;
            io.to(`room:${roomCode}`).emit('room:playerLeft', { playerId });
            break;
          }
        }
        updateUserOnlineStatus(playerId, false);
        updateUserInGameStatus(playerId, false);
        playerSockets.delete(playerId);
        break;
      }
    }

    for (const [viewerId, info] of viewerSockets) {
      if (info.socketId === socket.id) {
        const roomCode = info.roomCode;
        const viewerCount = GameService.removeViewer(roomCode, viewerId);
        io.to(`room:${roomCode}:watch`).emit('watch:viewerLeft', {
          viewerId,
          count: viewerCount,
        });
        viewerSockets.delete(viewerId);
        break;
      }
    }
  });
});

const startGame = (roomCode: string) => {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'playing') return;

  const questions = getRoomQuestions(roomCode);
  if (!questions || questions.length === 0) {
    console.error(`[Game] No questions found for room ${roomCode}`);
    return;
  }

  const playerIds = room.players.map((p) => p.id);
  const gameState = GameService.startGame(roomCode, questions, room.settings.timeLimit, playerIds);

  playerIds.forEach((playerId) => {
    updateUserInGameStatus(playerId, true, roomCode);
  });

  io.to(`room:${roomCode}`).emit('game:started', {
    totalQuestions: questions.length,
    timeLimit: room.settings.timeLimit,
  });

  gameState.phase = 'question';
  gameState.questionStartTime = Date.now();
  gameState.currentQuestionIndex = 0;

  const firstQuestion = {
    question: questions[0],
    questionIndex: 0,
    startTime: gameState.questionStartTime,
    endTime: gameState.questionStartTime + room.settings.timeLimit * 1000,
  };

  setTimeout(() => {
    processQuestion(roomCode, firstQuestion);
  }, 1000);
};

(globalThis as any).startGame = startGame;

const initDatabase = async () => {
  try {
    console.log('[DB] Initializing database...');
    const result = await seedQuestions();
    console.log(`[DB] Seed complete: ${result.inserted} questions inserted, ${result.total} total`);

    console.log('[Achievement] Initializing achievements...');
    AchievementService.init();
    console.log('[Achievement] Achievements initialized');

    console.log('[Season] Initializing current season...');
    const season = SeasonService.initCurrentSeason();
    console.log(`[Season] Current season: ${season.name} (ID: ${season.id})`);

    SeasonService.checkAndResetSeasonScores();
    console.log('[Season] Season score check completed');
  } catch (error) {
    console.error('[DB] Seed failed:', error);
  }
};

server.listen(PORT, async () => {
  console.log(`[Server] HTTP server running on port ${PORT}`);
  console.log(`[Server] WebSocket server attached`);
  console.log(`[Server] API Base URL: http://localhost:${PORT}/api`);

  await initDatabase();

  console.log('[Server] Ready to accept connections');
});

export default app;
