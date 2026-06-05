import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Eye, Clock, Users, Trophy, CheckCircle2, XCircle, ArrowLeft, Gamepad2 } from 'lucide-react';
import { Countdown } from '@/components/ui/Countdown';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DanmuLayer } from '@/components/DanmuLayer';
import { useSocket } from '@/socket/useSocket';
import { useUserStore } from '@/stores/useUserStore';
import type { Question, DanmuMessage, Player } from '@/types';

interface PlayerState {
  answered: boolean;
  score: number;
  streak: number;
  avatar?: string;
  nickname?: string;
}

export default function WatchGame() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { connect, emit, bindEvents, isConnected } = useSocket();
  const { playerId, nickname, avatar } = useUserStore();

  const [phase, setPhase] = useState<'waiting' | 'question' | 'reveal' | 'finished'>('waiting');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [remainingTime, setRemainingTime] = useState(10);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [playerStates, setPlayerStates] = useState<Record<string, PlayerState>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [standings, setStandings] = useState<Player[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [danmuMessages, setDanmuMessages] = useState<DanmuMessage[]>([]);
  const [showGameEnd, setShowGameEnd] = useState(false);
  const [finalStandings, setFinalStandings] = useState<Player[]>([]);

  const viewerId = useMemo(() => playerId || `viewer_${Date.now()}`, [playerId]);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (!isConnected) return;

    const cleanup = bindEvents({
      'watch:viewerJoined': (data) => {
        setViewerCount(data.count);
      },
      'watch:viewerLeft': (data) => {
        setViewerCount(data.count);
      },
      'watch:danmu': (data) => {
        setDanmuMessages((prev) => [...prev, data]);
      },
      'watch:gameState': (data) => {
        setPhase(data.phase);
        if (data.question) {
          setCurrentQuestion(data.question);
        }
        if (data.questionIndex !== undefined) {
          setQuestionIndex(data.questionIndex);
        }
        if (data.remainingTime !== undefined) {
          setRemainingTime(data.remainingTime);
        }
        setPlayerStates(data.playerStates);
      },
      'game:started': (data) => {
        setTotalQuestions(data.totalQuestions);
        setPhase('question');
      },
      'game:question': (data) => {
        setCurrentQuestion(data.question);
        setQuestionIndex(data.questionIndex);
        setRemainingTime(Math.ceil((data.endTime - Date.now()) / 1000));
        setCorrectAnswer(null);
        setAnalysis('');
        setPhase('question');
      },
      'game:reveal': (data) => {
        setCorrectAnswer(data.correctAnswer);
        setAnalysis(data.analysis);
        setStandings(data.standings);
        setPhase('reveal');
      },
      'game:finished': (data) => {
        setFinalStandings(data.finalStandings.map((p) => ({
          id: p.playerId,
          nickname: p.nickname,
          avatar: players.find((pl) => pl.id === p.playerId)?.avatar || '👤',
          score: p.score,
          streak: p.maxStreak,
          isReady: true,
          isOnline: true,
        })));
        setPhase('finished');
        setShowGameEnd(true);
      },
    });

    return cleanup;
  }, [isConnected, bindEvents, players]);

  useEffect(() => {
    if (isConnected && code) {
      emit('watch:join', {
        roomCode: code,
        viewerId,
        nickname: nickname || '匿名观众',
      });
    }
    return () => {
      if (code) {
        emit('watch:leave', { roomCode: code, viewerId });
      }
    };
  }, [isConnected, code, viewerId, nickname, emit]);

  const handleSendDanmu = (content: string, color: string) => {
    if (!code) return;
    emit('watch:danmu', {
      roomCode: code,
      viewerId,
      nickname: nickname || '匿名观众',
      content,
      color,
    });
  };

  const sortedPlayers = useMemo(() => {
    return Object.entries(playerStates)
      .map(([id, state]) => ({
        id,
        ...state,
        avatar: players.find((p) => p.id === id)?.avatar || '👤',
        nickname: players.find((p) => p.id === id)?.nickname || '选手',
      }))
      .sort((a, b) => b.score - a.score);
  }, [playerStates, players]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="glass border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-violet-400" />
              <span className="font-display font-bold text-white">
                观战模式 · 房间 {code}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-300">
              <Eye className="h-4 w-4 text-cyan-400" />
              <span className="text-sm">
                <span className="font-bold text-white">{viewerCount}</span> 人观战
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Users className="h-4 w-4 text-violet-400" />
              <span className="text-sm">
                <span className="font-bold text-white">{sortedPlayers.length}</span> 名选手
              </span>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400">题目</div>
              <div className="text-xl font-bold font-display text-white">
                {questionIndex + 1}/{totalQuestions}
              </div>
            </div>
            {phase === 'question' && (
              <Countdown value={remainingTime} size="md" />
            )}
            {phase === 'reveal' && (
              <Badge variant="warning">答案揭晓中</Badge>
            )}
            {phase === 'finished' && (
              <Badge variant="success">游戏已结束</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-6 flex flex-col">
          {currentQuestion && phase !== 'waiting' && phase !== 'finished' && (
            <div className="max-w-4xl mx-auto w-full">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="info">{currentQuestion.category}</Badge>
                  <Badge variant="default">
                    难度 {'★'.repeat(currentQuestion.difficulty)}
                  </Badge>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold font-display text-white leading-relaxed">
                  {currentQuestion.text}
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {currentQuestion.options.map((option, index) => {
                  const isCorrect = correctAnswer === index;
                  const showCorrectness = phase === 'reveal';

                  let buttonClass = 'bg-white/5 border-white/10';
                  if (showCorrectness) {
                    if (isCorrect) {
                      buttonClass = 'bg-emerald-500/20 border-emerald-500/50';
                    } else {
                      buttonClass = 'bg-white/5 border-white/10 opacity-50';
                    }
                  }

                  return (
                    <div
                      key={index}
                      className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${buttonClass}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-lg ${
                            showCorrectness && isCorrect
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {showCorrectness && isCorrect ? (
                            <CheckCircle2 className="h-6 w-6" />
                          ) : showCorrectness && !isCorrect ? (
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
                      </div>
                    </div>
                  );
                })}
              </div>

              {phase === 'reveal' && analysis && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold font-display text-white mb-2">解析</h3>
                  <p className="text-slate-300">{analysis}</p>
                </div>
              )}
            </div>
          )}

          {phase === 'waiting' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4 animate-pulse">🎮</div>
                <h2 className="text-2xl font-bold font-display text-white mb-2">
                  等待游戏开始...
                </h2>
                <p className="text-slate-400">选手正在准备中</p>
              </div>
            </div>
          )}

          {phase === 'finished' && !showGameEnd && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold font-display text-white mb-2">
                  游戏已结束
                </h2>
                <p className="text-slate-400">感谢观战</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 border-l border-white/10 flex flex-col">
          <div className="glass border-b border-white/10 p-4">
            <h3 className="font-display font-bold text-white mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              实时排名
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                    player.answered
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-white/5'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? 'bg-yellow-500 text-white'
                        : index === 1
                        ? 'bg-slate-400 text-white'
                        : index === 2
                        ? 'bg-amber-600 text-white'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="text-xl">{player.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">
                      {player.nickname}
                    </div>
                    <div className="text-xs text-slate-400">
                      🔥 连击 x{player.streak}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-sm">
                      {player.score}
                    </div>
                    <div className="flex items-center gap-1">
                      {player.answered ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Clock className="h-3 w-3 text-slate-500 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <DanmuLayer
              messages={danmuMessages}
              onSend={handleSendDanmu}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {showGameEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <Card className="max-w-lg w-full mx-4">
            <div className="text-center mb-6">
              <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold font-display text-white">
                游戏结束
              </h2>
              <p className="text-slate-400 mt-2">感谢观战</p>
            </div>

            <div className="space-y-2 mb-6">
              <h3 className="font-medium text-white mb-3">最终排名</h3>
              {finalStandings.slice(0, 5).map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    index === 0
                      ? 'bg-yellow-500/20 border border-yellow-500/30'
                      : index === 1
                      ? 'bg-slate-500/20 border border-slate-500/30'
                      : index === 2
                      ? 'bg-amber-600/20 border border-amber-600/30'
                      : 'bg-white/5'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0
                        ? 'bg-yellow-500 text-white'
                        : index === 1
                        ? 'bg-slate-400 text-white'
                        : index === 2
                        ? 'bg-amber-600 text-white'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="text-2xl">{player.avatar}</div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{player.nickname}</div>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {player.score}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowGameEnd(false)}
              >
                查看详情
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => navigate('/lobby')}
              >
                返回大厅
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
