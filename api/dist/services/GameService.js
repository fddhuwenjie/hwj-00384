import db from '../db/database.js';
import { calculateScore } from '../utils/calculateScore.js';
import SeasonService from './SeasonService.js';
const gameStates = new Map();
export const getGameState = (roomCode) => {
    return gameStates.get(roomCode);
};
export const createGameRecord = (data) => {
    const stmt = db.prepare(`
    INSERT INTO game_records (room_code, start_time, question_count, season_id)
    VALUES (?, ?, ?, ?)
  `);
    const result = stmt.run(data.roomCode, data.startTime, data.questionCount, data.seasonId || null);
    return Number(result.lastInsertRowid);
};
export const createPlayerRecord = (data) => {
    const stmt = db.prepare(`
    INSERT INTO player_records (game_id, player_id, nickname, avatar)
    VALUES (?, ?, ?, ?)
  `);
    const result = stmt.run(data.gameId, data.playerId, data.nickname, data.avatar || null);
    return Number(result.lastInsertRowid);
};
export const createQuestionRecord = (data) => {
    const stmt = db.prepare(`
    INSERT INTO question_records (game_id, question_id, question_index)
    VALUES (?, ?, ?)
  `);
    const result = stmt.run(data.gameId, data.questionId, data.questionIndex);
    return Number(result.lastInsertRowid);
};
export const createAnswerRecord = (data) => {
    const stmt = db.prepare(`
    INSERT INTO answer_records (
      question_record_id, player_id, selected_answer, is_correct,
      response_time, base_score, speed_bonus, streak_bonus, first_bonus, total_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const result = stmt.run(data.questionRecordId, data.playerId, data.selectedAnswer, data.isCorrect ? 1 : 0, data.responseTime, data.baseScore, data.speedBonus, data.streakBonus, data.firstBonus, data.totalScore);
    return Number(result.lastInsertRowid);
};
export const updatePlayerRecord = (gameId, playerId, data) => {
    const stmt = db.prepare(`
    UPDATE player_records
    SET final_score = ?, correct_count = ?, avg_response_time = ?, max_streak = ?, rank_position = ?
    WHERE game_id = ? AND player_id = ?
  `);
    stmt.run(data.finalScore, data.correctCount, data.avgResponseTime, data.maxStreak, data.rankPosition, gameId, playerId);
};
export const updateUserStats = (playerId, nickname, data) => {
    const checkStmt = db.prepare('SELECT id FROM user_stats WHERE player_id = ?');
    const existing = checkStmt.get(playerId);
    if (!existing) {
        const insertStmt = db.prepare(`
      INSERT INTO user_stats (player_id, nickname, total_games, wins, total_score, total_correct, total_questions, avg_response_time, max_streak, last_played_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        insertStmt.run(playerId, nickname, data.totalGames || 0, data.wins || 0, data.totalScore || 0, data.totalCorrect || 0, data.totalQuestions || 0, data.avgResponseTime || 0, data.maxStreak || 0, data.lastPlayedAt || new Date().toISOString());
    }
    else {
        const updateStmt = db.prepare(`
      UPDATE user_stats
      SET total_games = total_games + ?,
          wins = wins + ?,
          total_score = total_score + ?,
          total_correct = total_correct + ?,
          total_questions = total_questions + ?,
          avg_response_time = (avg_response_time * total_games + ?) / (total_games + ?),
          max_streak = MAX(max_streak, ?),
          last_played_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `);
        updateStmt.run(data.totalGames || 0, data.wins || 0, data.totalScore || 0, data.totalCorrect || 0, data.totalQuestions || 0, data.avgResponseTime || 0, data.totalGames || 0, data.maxStreak || 0, data.lastPlayedAt || new Date().toISOString(), playerId);
    }
};
export const updateQuestionStats = (questionId, isCorrect) => {
    const stmt = db.prepare(`
    UPDATE questions
    SET usage_count = usage_count + 1,
        correct_count = correct_count + ?
    WHERE id = ?
  `);
    stmt.run(isCorrect ? 1 : 0, questionId);
};
export const startGame = (roomCode, questions, timeLimit, playerIds) => {
    const currentSeason = SeasonService.getCurrentSeason();
    const gameRecordId = createGameRecord({
        roomCode,
        startTime: new Date().toISOString(),
        questionCount: questions.length,
        seasonId: currentSeason?.id || null,
    });
    const scores = new Map();
    const playerAnswers = new Map();
    playerIds.forEach((playerId) => {
        scores.set(playerId, { total: 0, streak: 0, details: [] });
        playerAnswers.set(playerId, new Map());
    });
    const gameState = {
        questions,
        currentQuestionIndex: 0,
        timeLimit,
        phase: 'waiting',
        questionStartTime: 0,
        playerAnswers,
        firstCorrectPlayer: new Map(),
        scores,
        viewers: new Map(),
        danmus: [],
        playerIds,
        timer: null,
        gameRecordId,
    };
    gameStates.set(roomCode, gameState);
    return gameState;
};
export const submitAnswer = (roomCode, playerId, questionIndex, answer, responseTime) => {
    const gameState = gameStates.get(roomCode);
    if (!gameState || gameState.phase !== 'question') {
        return { isFirstCorrect: false };
    }
    if (questionIndex !== gameState.currentQuestionIndex) {
        return { isFirstCorrect: false };
    }
    const playerAnswers = gameState.playerAnswers.get(playerId);
    if (!playerAnswers) {
        return { isFirstCorrect: false };
    }
    if (playerAnswers.has(questionIndex)) {
        return { isFirstCorrect: false };
    }
    playerAnswers.set(questionIndex, { answer, responseTime });
    const question = gameState.questions[questionIndex];
    const isCorrect = answer === question.correctAnswer;
    let isFirstCorrect = false;
    if (isCorrect && !gameState.firstCorrectPlayer.has(questionIndex)) {
        gameState.firstCorrectPlayer.set(questionIndex, playerId);
        isFirstCorrect = true;
    }
    const playerScore = gameState.scores.get(playerId);
    if (!playerScore) {
        return { isFirstCorrect };
    }
    if (isCorrect) {
        playerScore.streak += 1;
    }
    else {
        playerScore.streak = 0;
    }
    const scoreBreakdown = calculateScore({
        isCorrect,
        responseTime,
        timeLimit: gameState.timeLimit,
        streak: playerScore.streak,
        isFirstCorrect,
    });
    const scoreDetail = {
        questionId: question.id,
        isCorrect,
        responseTime,
        baseScore: scoreBreakdown.baseScore,
        speedBonus: scoreBreakdown.speedBonus,
        streakBonus: scoreBreakdown.streakBonus,
        firstBonus: scoreBreakdown.firstBonus,
        totalScore: scoreBreakdown.totalScore,
    };
    playerScore.total += scoreBreakdown.totalScore;
    playerScore.details[questionIndex] = scoreDetail;
    return { isFirstCorrect, score: scoreDetail };
};
export const revealAnswer = (roomCode, questionIndex) => {
    const gameState = gameStates.get(roomCode);
    if (!gameState)
        return null;
    gameState.phase = 'reveal';
    if (gameState.timer) {
        clearTimeout(gameState.timer);
        gameState.timer = null;
    }
    const question = gameState.questions[questionIndex];
    const scores = {};
    for (const [playerId, playerScore] of gameState.scores) {
        const detail = playerScore.details[questionIndex];
        if (detail) {
            scores[playerId] = detail;
        }
    }
    const playersFromRoom = globalThis.rooms?.get(roomCode)?.players || [];
    const standings = playersFromRoom
        .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        score: gameState.scores.get(p.id)?.total || 0,
        streak: gameState.scores.get(p.id)?.streak || 0,
        isReady: p.isReady,
        isOnline: p.isOnline,
    }))
        .sort((a, b) => b.score - a.score);
    return {
        questionIndex,
        correctAnswer: question.correctAnswer,
        analysis: question.analysis,
        scores,
        standings,
    };
};
export const nextQuestion = (roomCode) => {
    const gameState = gameStates.get(roomCode);
    if (!gameState)
        return null;
    const nextIndex = gameState.currentQuestionIndex + 1;
    if (nextIndex >= gameState.questions.length) {
        return null;
    }
    gameState.currentQuestionIndex = nextIndex;
    gameState.phase = 'question';
    gameState.questionStartTime = Date.now();
    const question = gameState.questions[nextIndex];
    const startTime = gameState.questionStartTime;
    const endTime = startTime + gameState.timeLimit * 1000;
    return { question, questionIndex: nextIndex, startTime, endTime };
};
export const finishGame = (roomCode) => {
    const gameState = gameStates.get(roomCode);
    if (!gameState || !gameState.gameRecordId)
        return null;
    gameState.phase = 'finished';
    if (gameState.timer) {
        clearTimeout(gameState.timer);
        gameState.timer = null;
    }
    const gameRecordId = gameState.gameRecordId;
    const room = globalThis.rooms?.get(roomCode);
    const players = room?.players || [];
    for (const player of players) {
        createPlayerRecord({
            gameId: gameRecordId,
            playerId: player.id,
            nickname: player.nickname,
            avatar: player.avatar,
        });
    }
    for (let i = 0; i < gameState.questions.length; i++) {
        const question = gameState.questions[i];
        const questionRecordId = createQuestionRecord({
            gameId: gameRecordId,
            questionId: question.id,
            questionIndex: i,
        });
        let correctCount = 0;
        let totalResponseTime = 0;
        let answerCount = 0;
        for (const [playerId, answers] of gameState.playerAnswers) {
            const answer = answers.get(i);
            if (answer) {
                const isCorrect = answer.answer === question.correctAnswer;
                const scoreDetail = gameState.scores.get(playerId)?.details[i];
                if (scoreDetail) {
                    createAnswerRecord({
                        questionRecordId,
                        playerId,
                        selectedAnswer: answer.answer,
                        isCorrect,
                        responseTime: answer.responseTime,
                        baseScore: scoreDetail.baseScore,
                        speedBonus: scoreDetail.speedBonus,
                        streakBonus: scoreDetail.streakBonus,
                        firstBonus: scoreDetail.firstBonus,
                        totalScore: scoreDetail.totalScore,
                    });
                }
                if (isCorrect) {
                    correctCount++;
                }
                totalResponseTime += answer.responseTime;
                answerCount++;
                updateQuestionStats(question.id, isCorrect);
            }
        }
        const avgResponseTime = answerCount > 0 ? totalResponseTime / answerCount : 0;
        const updateQuestionStmt = db.prepare(`
      UPDATE question_records
      SET correct_answer_count = ?, avg_response_time = ?
      WHERE id = ?
    `);
        updateQuestionStmt.run(correctCount, avgResponseTime, questionRecordId);
    }
    const finalStandings = players
        .map((player) => {
        const playerScore = gameState.scores.get(player.id);
        const details = playerScore?.details || [];
        const correctCount = details.filter(d => d?.isCorrect).length;
        const responseTimes = details.filter(d => d).map(d => d.responseTime);
        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;
        const maxStreak = Math.max(0, ...details.filter(d => d).map((_, i, arr) => {
            let streak = 0;
            let max = 0;
            for (let j = 0; j <= i; j++) {
                if (arr[j]?.isCorrect) {
                    streak++;
                    max = Math.max(max, streak);
                }
                else {
                    streak = 0;
                }
            }
            return max;
        }));
        return {
            playerId: player.id,
            nickname: player.nickname,
            score: playerScore?.total || 0,
            rank: 0,
            correctCount,
            avgResponseTime,
            maxStreak,
            scoreDetails: details,
        };
    })
        .sort((a, b) => b.score - a.score)
        .map((p, index) => ({ ...p, rank: index + 1 }));
    const updateEndTimeStmt = db.prepare(`
    UPDATE game_records
    SET end_time = ?
    WHERE id = ?
  `);
    updateEndTimeStmt.run(new Date().toISOString(), gameRecordId);
    for (const standing of finalStandings) {
        updatePlayerRecord(gameRecordId, standing.playerId, {
            finalScore: standing.score,
            correctCount: standing.correctCount,
            avgResponseTime: standing.avgResponseTime,
            maxStreak: standing.maxStreak,
            rankPosition: standing.rank,
        });
        updateUserStats(standing.playerId, standing.nickname, {
            totalGames: 1,
            wins: standing.rank === 1 ? 1 : 0,
            totalScore: standing.score,
            totalCorrect: standing.correctCount,
            totalQuestions: gameState.questions.length,
            avgResponseTime: standing.avgResponseTime,
            maxStreak: standing.maxStreak,
            lastPlayedAt: new Date().toISOString(),
        });
        SeasonService.updateSeasonScore(standing.playerId, standing.score, standing.rank === 1);
    }
    gameStates.delete(roomCode);
    return {
        recordId: gameRecordId,
        finalStandings,
    };
};
export const setQuestionTimer = (roomCode, callback) => {
    const gameState = gameStates.get(roomCode);
    if (!gameState)
        return;
    if (gameState.timer) {
        clearTimeout(gameState.timer);
    }
    gameState.timer = setTimeout(callback, gameState.timeLimit * 1000);
};
export const addViewer = (roomCode, viewerId, nickname, socketId) => {
    const gameState = gameStates.get(roomCode);
    if (!gameState)
        return 0;
    gameState.viewers.set(viewerId, { nickname, socketId });
    return gameState.viewers.size;
};
export const removeViewer = (roomCode, viewerId) => {
    const gameState = gameStates.get(roomCode);
    if (!gameState)
        return 0;
    gameState.viewers.delete(viewerId);
    return gameState.viewers.size;
};
export const addDanmu = (roomCode, viewerId, nickname, content, color = '#ffffff') => {
    const gameState = gameStates.get(roomCode);
    const danmu = {
        id: crypto.randomUUID(),
        nickname,
        content,
        color,
        timestamp: Date.now(),
    };
    if (gameState) {
        gameState.danmus.push(danmu);
        if (gameState.danmus.length > 100) {
            gameState.danmus.shift();
        }
    }
    return danmu;
};
export const getViewerCount = (roomCode) => {
    const gameState = gameStates.get(roomCode);
    return gameState?.viewers.size || 0;
};
export default {
    getGameState,
    startGame,
    submitAnswer,
    revealAnswer,
    nextQuestion,
    finishGame,
    setQuestionTimer,
    addViewer,
    removeViewer,
    addDanmu,
    getViewerCount,
};
