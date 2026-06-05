import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Clock, Zap, CheckCircle2, XCircle, Award, Flame } from 'lucide-react';
import { Countdown } from '@/components/ui/Countdown';
import { Badge } from '@/components/ui/Badge';
import { PlayerStatusBar } from '@/components/game/PlayerStatusBar';
import { ScoreAnimation } from '@/components/game/ScoreAnimation';
import { StreakBanner } from '@/components/game/StreakBanner';
import { useSocket } from '@/socket/useSocket';
import { useRoomStore } from '@/stores/useRoomStore';
import { useUserStore } from '@/stores/useUserStore';
import type { Question, Player, ScoreDetail } from '@/types';

export default function GamePlay() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { connect, emit, useEvents, isConnected } = useSocket();
  const {
    players,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    setGamePhase,
    setCurrentQuestion,
    currentQuestion,
    answeredPlayers,
    addAnsweredPlayer,
    clearAnsweredPlayers,
    updatePlayer,
  } = useRoomStore();
  const { playerId } = useUserStore();

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [scores, setScores] = useState<Record<string, ScoreDetail>>({});
  const [hasAnswered, setHasAnswered] = useState(false);
  const [standings, setStandings] = useState<Player[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [showStreakBanner, setShowStreakBanner] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [gameStartCountdown, setGameStartCountdown] = useState<number | null>(null);
  const [showGameStart, setShowGameStart] = useState(false);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    const myPlayer = players.find((p) => p.id === playerId);
    if (myPlayer && myPlayer.streak !== currentStreak) {
      setCurrentStreak(myPlayer.streak);
      if (myPlayer.streak >= 3) {
        setShowStreakBanner(true);
      }
    }
  }, [players, playerId, currentStreak]);

  const handleStreakBannerEnd = useCallback(() => {
    setShowStreakBanner(false);
  }, []);

  useEvents({
    'room:gameStarting': (data) => {
      setGameStartCountdown(data.countdown);
      setShowGameStart(true);
      setGamePhase('countdown');
    },
    'game:started': (data) => {
      setTotalQuestions(data.totalQuestions);
      setTimeRemaining(data.timeLimit);
      setGamePhase('question');
      setShowGameStart(false);
      setGameStartCountdown(null);
    },
    'game:question': (data) => {
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.questionIndex);
      setSelectedAnswer(null);
      setShowResult(false);
      setHasAnswered(false);
      clearAnsweredPlayers();
      setTimeRemaining(Math.ceil((data.endTime - Date.now()) / 1000));
      setGamePhase('question');
    },
    'game:playerAnswered': (data) => {
      addAnsweredPlayer(data.playerId, 0, data.responseTime);
      if (data.playerId === playerId) {
        setHasAnswered(true);
      }
    },
    'game:reveal': (data) => {
      setShowResult(true);
      setScores(data.scores);
      setStandings(data.standings);
      setGamePhase('reveal');
      data.standings.forEach((player) => {
        updatePlayer(player.id, { score: player.score, streak: player.streak });
      });
    },
    'game:finished': (data) => {
      setGamePhase('finished');
      navigate(`/result/${code}`, { state: { recordId: data.recordId, standings: data.finalStandings } });
    },
  });

  useEffect(() => {
    if (gameStartCountdown !== null && gameStartCountdown > 0) {
      const timer = setTimeout(() => {
        setGameStartCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameStartCountdown]);

  useEffect(() => {
    if (isConnected && playerId && code) {
      emit('room:join', { roomCode: code, playerId });
    }
  }, [isConnected, playerId, code, emit]);

  useEffect(() => {
    if (timeRemaining > 0 && !showResult && currentQuestion) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, showResult, currentQuestion]);

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null || showResult || !code || !playerId || !currentQuestion) return;

    setSelectedAnswer(answerIndex);
    const responseTime = 10 - timeRemaining;

    emit('game:answer', {
      roomCode: code,
      playerId,
      questionIndex: currentQuestionIndex,
      answer: answerIndex,
      responseTime,
    });

    addAnsweredPlayer(playerId, answerIndex, responseTime);
    setHasAnswered(true);
  };

  const myScore = playerId ? scores[playerId] : null;
  const myPlayer = players.find((p) => p.id === playerId);

  const sortedStandings = [...standings].sort((a, b) => b.score - a.score);

  if (showGameStart || gameStartCountdown !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-900/50 via-indigo-900/50 to-purple-900/50">
        <div className="text-center">
          {gameStartCountdown !== null && gameStartCountdown > 0 ? (
            <div className="animate-countdown-pop">
              <div className="text-9xl font-bold font-display text-white mb-4 animate-pulse">
                {gameStartCountdown}
              </div>
              <div className="text-2xl text-violet-300 font-medium">
                准备开始...
              </div>
            </div>
          ) : (
              <div className="animate-bounce-in">
                <div className="text-8xl mb-6">🎮</div>
                <div className="text-6xl font-bold font-display gradient-text mb-4">
                  游戏开始!
                </div>
              </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StreakBanner
        streak={currentStreak}
        show={showStreakBanner}
        onAnimationEnd={handleStreakBannerEnd}
      />

      <div className="glass border-b border-white/10 px-6 py-3">
        <div className="flex flex-col lg:flex-row items-center justify-between max-w-6xl mx-auto gap-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-slate-400">题目</div>
              <div className="text-xl font-bold font-display text-white">
                {currentQuestionIndex + 1}/{totalQuestions}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400">我的得分</div>
              <div className="text-xl font-bold font-display text-violet-400">
                <ScoreAnimation value={myPlayer?.score || 0} showParticles={true} />
              </div>
            </div>
            {myPlayer && myPlayer.streak >= 3 && (
              <div className="flex items-center gap-1 bg-orange-500/20 px-3 py-1 rounded-full">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-400">
                  {myPlayer.streak} 连击</span>
              </div>
            )}
          </div>

          <Countdown
            value={timeRemaining}
            onComplete={() => setShowResult(true)}
            size="lg"
          />

          <div className="flex items-center gap-4">
            <PlayerStatusBar
              players={players}
              answeredPlayers={answeredPlayers}
              currentPlayerId={playerId}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {currentQuestion && (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="info">
                    {currentQuestion.category}
                  </Badge>
                  <Badge variant="default">
                    难度 {'★'.repeat(currentQuestion.difficulty)}
                  </Badge>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold font-display text-white leading-relaxed">
                  {currentQuestion.text}
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = currentQuestion.correctAnswer === index;
                  const showCorrectness = showResult;
                  const isLocked = selectedAnswer !== null || showResult;

                  let buttonClass = 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-violet-500/50';
                  if (showCorrectness) {
                    if (isCorrect) {
                      buttonClass = 'bg-emerald-500/20 border-emerald-500/50';
                    } else if (isSelected && !isCorrect) {
                      buttonClass = 'bg-red-500/20 border-red-500/50';
                    } else {
                      buttonClass = 'bg-white/5 border-white/10 opacity-50';
                    }
                  } else if (isSelected) {
                    buttonClass = 'bg-violet-500/20 border-violet-500/50';
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={isLocked}
                      className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${buttonClass} ${
                        isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-lg ${
                            showCorrectness
                              ? isCorrect
                                ? 'bg-emerald-500 text-white'
                                : isSelected
                                ? 'bg-red-500 text-white'
                                : 'bg-white/10 text-slate-400'
                              : isSelected
                              ? 'bg-violet-500 text-white'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {showCorrectness && isCorrect ? (
                            <CheckCircle2 className="h-6 w-6" />
                          ) : showCorrectness && isSelected ? (
                            <XCircle className="h-6 w-6" />
                          ) : (
                            String.fromCharCode(65 + index)
                          )}
                        </div>
                        <span className="text-lg text-white flex-1">{option}</span>
                        {showCorrectness && isCorrect && (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            正确答案
                          </Badge>
                        )}
                        {hasAnswered && isSelected && !showCorrectness && (
                          <Badge variant="info">
                            已作答
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {showResult && (
                <div className="mt-8 glass rounded-2xl p-6 animate-fade-in">
                  <h3 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2">
                    <Award className="h-6 w-6 text-yellow-400" />
                    本题结果
                  </h3>

                  {myScore && (
                    <div className="flex flex-col md:flex-row items-center gap-6 mb-4 p-4 rounded-xl bg-violet-500/10">
                      <div className="text-center">
                        <div className="text-3xl font-bold font-display text-white">
                          {myScore.isCorrect ? '✓' : '✗'}
                        </div>
                        <div className="text-xs text-slate-400">你的答案</div>
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm text-slate-300">
                            用时: {myScore.responseTime.toFixed(1)}秒
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="info">基础分 +{myScore.baseScore}</Badge>
                          {myScore.speedBonus > 0 && (
                            <Badge variant="success">速度加成 +{myScore.speedBonus}</Badge>
                          )}
                          {myScore.streakBonus > 0 && (
                            <Badge variant="warning">连击加成 +{myScore.streakBonus}</Badge>
                          )}
                          {myScore.firstBonus > 0 && (
                            <Badge variant="info">首答加成 +{myScore.firstBonus}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold font-display gradient-text">
                          <ScoreAnimation value={myScore.totalScore} showParticles={myScore.isCorrect} />
                        </div>
                        <div className="text-xs text-slate-400">本题得分</div>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-slate-400 bg-white/5 rounded-xl p-4">
                    <span className="text-violet-400 font-medium">解析：</span>
                    {currentQuestion.analysis}
                  </div>

                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">当前排名</h4>
                    <div className="space-y-2">
                      {sortedStandings.slice(0, 4).map((player, index) => (
                        <div
                          key={player.id}
                          className={`flex items-center gap-3 p-3 rounded-xl ${
                            player.id === playerId ? 'bg-violet-500/20' : 'bg-white/5'
                          }`}
                        >
                          <div className="text-lg font-bold text-slate-400 w-6">
                            {index + 1}
                          </div>
                          <div className="text-2xl">{player.avatar}</div>
                          <div className="flex-1">
                            <div className="font-medium text-white">
                              {player.nickname}
                              {player.id === playerId && ' (你)'}
                            </div>
                            {player.streak >= 3 && (
                              <div className="flex items-center gap-1 text-xs text-orange-400">
                              <Flame className="w-3 h-3" />
                              连击 {player.streak}
                              </div>
                            )}
                          </div>
                          <div className="text-xl font-bold text-white">
                            <ScoreAnimation value={player.score} showParticles={false} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
