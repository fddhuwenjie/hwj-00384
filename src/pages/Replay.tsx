import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  FastForward,
  Rewind,
  ArrowLeft,
  Volume2,
  MessageSquare,
  Maximize2,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Countdown } from '@/components/ui/Countdown';
import { DanmuLayer } from '@/components/DanmuLayer';
import { recordApi } from '@/api';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '../../shared/types';
import type { GameRecord, ReplayEvent, Question, DanmuMessage } from '@/types';

const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 3];

export default function Replay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<GameRecord | null>(null);
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showDanmu, setShowDanmu] = useState(true);
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [playerAnswers, setPlayerAnswers] = useState<Record<string, { answer: number; responseTime: number }>>({});
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [standings, setStandings] = useState<{ id: string; nickname: string; avatar: string; score: number }[]>([]);

  const [danmuMessages, setDanmuMessages] = useState<DanmuMessage[]>([]);

  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const mockDanmus: DanmuMessage[] = useMemo(() => [
    { id: '1', nickname: '观众A', content: '这题好难啊', color: '#FFFFFF', timestamp: 2000 },
    { id: '2', nickname: '观众B', content: '我选A！', color: '#FF6B6B', timestamp: 3500 },
    { id: '3', nickname: '观众C', content: '肯定是C', color: '#4ECDC4', timestamp: 4000 },
    { id: '4', nickname: '观众D', content: '选手加油！', color: '#FFE66D', timestamp: 5000 },
    { id: '5', nickname: '观众E', content: '这都答不对？', color: '#95E1D3', timestamp: 8000 },
    { id: '6', nickname: '观众F', content: '666', color: '#F38181', timestamp: 10000 },
  ], []);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [recordRes, replayRes] = await Promise.all([
          recordApi.getById(Number(id)),
          recordApi.getReplay(Number(id)),
        ]);
        if (recordRes.data) {
          setRecord(recordRes.data);
          const players = recordRes.data.players.map((p) => ({
            id: p.playerId,
            nickname: p.nickname,
            avatar: ['🎮', '🎯', '🎲', '🎪'][Math.floor(Math.random() * 4)],
            score: 0,
          }));
          setStandings(players);
        }
        if (replayRes.data) {
          setEvents(replayRes.data);
        }
      } catch (error) {
        console.error('Failed to load replay:', error);
        const mockRecord: GameRecord = {
          id: Number(id),
          roomCode: 'ABC123',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          players: [
            { playerId: '1', nickname: '玩家1', score: 1500, rank: 1, correctCount: 8, avgResponseTime: 3.2, maxStreak: 5, scoreDetails: [] },
            { playerId: '2', nickname: '玩家2', score: 1200, rank: 2, correctCount: 6, avgResponseTime: 4.1, maxStreak: 3, scoreDetails: [] },
          ],
          questionCount: 10,
        };
        setRecord(mockRecord);
        setStandings([
          { id: '1', nickname: '玩家1', avatar: '🎮', score: 0 },
          { id: '2', nickname: '玩家2', avatar: '🎯', score: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const totalDuration = useMemo(() => {
    if (events.length > 0) {
      return events[events.length - 1].timestamp + 5000;
    }
    if (record) {
      return record.questionCount * 15000;
    }
    return 60000;
  }, [events, record]);

  const mockQuestions: Question[] = useMemo(() => [
    {
      id: 1,
      text: '世界上最高的山峰是哪一座？',
      options: ['珠穆朗玛峰', '乔戈里峰', '干城章嘉峰', '洛子峰'],
      correctAnswer: 0,
      difficulty: 1,
      category: 'geography',
      analysis: '珠穆朗玛峰海拔8848.86米，是世界第一高峰。',
      usageCount: 100,
      correctCount: 85,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      text: 'HTML中用于定义段落的标签是？',
      options: ['<div>', '<p>', '<span>', '<section>'],
      correctAnswer: 1,
      difficulty: 2,
      category: 'technology',
      analysis: '<p>标签用于定义HTML中的段落。',
      usageCount: 150,
      correctCount: 120,
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      text: '中国的首都是哪座城市？',
      options: ['上海', '北京', '广州', '深圳'],
      correctAnswer: 1,
      difficulty: 1,
      category: 'geography',
      analysis: '北京是中华人民共和国的首都。',
      usageCount: 200,
      correctCount: 195,
      createdAt: new Date().toISOString(),
    },
  ], []);

  const processEvent = useCallback((event: ReplayEvent) => {
    switch (event.type) {
      case 'question':
        setCurrentQuestion(event.data.question || mockQuestions[questionIndex % mockQuestions.length]);
        setQuestionIndex(event.data.questionIndex || 0);
        setSelectedAnswer(null);
        setCorrectAnswer(null);
        setAnalysis('');
        setShowResult(false);
        setPlayerAnswers({});
        break;
      case 'answer':
        setPlayerAnswers((prev) => ({
          ...prev,
          [event.data.playerId]: {
            answer: event.data.answer,
            responseTime: event.data.responseTime,
          },
        }));
        setSelectedAnswer(event.data.answer);
        break;
      case 'reveal':
        setCorrectAnswer(event.data.correctAnswer ?? mockQuestions[questionIndex % mockQuestions.length].correctAnswer);
        setAnalysis(event.data.analysis || mockQuestions[questionIndex % mockQuestions.length].analysis);
        setShowResult(true);
        if (event.data.scores) {
          setStandings((prev) =>
            prev.map((p) => ({
              ...p,
              score: event.data.scores[p.id]?.totalScore || p.score,
            }))
          );
        }
        break;
      case 'score':
        if (event.data.scores) {
          setStandings((prev) =>
            prev.map((p) => ({
              ...p,
              score: event.data.scores[p.id]?.totalScore || p.score,
            }))
          );
        }
        break;
    }
  }, [mockQuestions, questionIndex]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = 100 / speed;
    timerRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        const nextTime = prev + interval;
        if (nextTime >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return nextTime;
      });
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, speed, totalDuration]);

  useEffect(() => {
    if (events.length > 0) {
      const newIndex = events.findIndex((e) => e.timestamp > currentTime) - 1;
      if (newIndex > currentEventIndex) {
        for (let i = currentEventIndex + 1; i <= newIndex; i++) {
          if (i >= 0 && i < events.length) {
            processEvent(events[i]);
          }
        }
        setCurrentEventIndex(newIndex);
      }
    } else {
      const mockEventInterval = 15000;
      const newQIndex = Math.floor(currentTime / mockEventInterval);
      if (newQIndex !== questionIndex && newQIndex < (record?.questionCount || 10)) {
        setQuestionIndex(newQIndex);
        const q = mockQuestions[newQIndex % mockQuestions.length];
        setCurrentQuestion(q);
        setSelectedAnswer(null);
        setCorrectAnswer(null);
        setShowResult(false);
        setPlayerAnswers({});

        setTimeout(() => {
          setPlayerAnswers({
            '1': { answer: Math.floor(Math.random() * 4), responseTime: 3 + Math.random() * 5 },
          });
          setTimeout(() => {
            setPlayerAnswers((prev) => ({
              ...prev,
              '2': { answer: Math.floor(Math.random() * 4), responseTime: 4 + Math.random() * 5 },
            }));
            setTimeout(() => {
              setCorrectAnswer(q.correctAnswer);
              setAnalysis(q.analysis);
              setShowResult(true);
            }, 1000);
          }, 1500);
        }, 4000);
      }
    }
  }, [currentTime, events, currentEventIndex, processEvent, mockQuestions, questionIndex, record]);

  useEffect(() => {
    if (showDanmu) {
      const visibleDanmus = mockDanmus.filter(
        (d) => d.timestamp <= currentTime && d.timestamp > currentTime - 10000
      );
      setDanmuMessages(visibleDanmus);
    }
  }, [currentTime, showDanmu, mockDanmus]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * totalDuration;
    setCurrentTime(newTime);
    setCurrentEventIndex(-1);
  };

  const handleSpeedChange = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(speed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    setSpeed(SPEED_OPTIONS[nextIndex]);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const sortedStandings = [...standings].sort((a, b) => b.score - a.score);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">加载回放中...</p>
        </div>
      </div>
    );
  }

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
            <div>
              <h1 className="font-display font-bold text-white">
                回放 · 房间 {record?.roomCode || 'ABC123'}
              </h1>
              <p className="text-xs text-slate-400">
                {record ? new Date(record.startTime).toLocaleString('zh-CN') : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xs text-slate-400">题目</div>
              <div className="text-lg font-bold font-display text-white">
                {questionIndex + 1}/{record?.questionCount || 10}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {standings.map((player) => (
                <div key={player.id} className="text-center">
                  <div className="text-2xl">{player.avatar}</div>
                  <div className="text-xs text-slate-400">{player.nickname}</div>
                  <div className="text-sm font-bold text-white">{player.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-6 flex flex-col">
          {currentQuestion && (
            <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-center">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Badge variant="info">
                    {CATEGORY_LABELS[currentQuestion.category as keyof typeof CATEGORY_LABELS]}
                  </Badge>
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
                  const isSelected = selectedAnswer === index;
                  const isCorrect = correctAnswer === index;
                  const showCorrectness = showResult;

                  let buttonClass = 'bg-white/5 border-white/10';
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
                    <div
                      key={index}
                      className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 ${buttonClass}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-lg ${
                            showCorrectness && isCorrect
                              ? 'bg-emerald-500 text-white'
                              : showCorrectness && isSelected
                              ? 'bg-red-500 text-white'
                              : isSelected
                              ? 'bg-violet-500 text-white'
                              : 'bg-white/10 text-slate-400'
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
                        {Object.entries(playerAnswers).map(([playerId, answer]) => {
                          if (answer.answer !== index) return null;
                          const player = standings.find((p) => p.id === playerId);
                          return (
                            <div key={playerId} className="text-2xl" title={player?.nickname}>
                              {player?.avatar}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {showResult && analysis && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold font-display text-white mb-2">解析</h3>
                  <p className="text-slate-300">{analysis}</p>

                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">当前排名</h4>
                    <div className="space-y-2">
                      {sortedStandings.map((player, index) => (
                        <div
                          key={player.id}
                          className={`flex items-center gap-3 p-3 rounded-xl bg-white/5`}
                        >
                          <div className="text-lg font-bold text-slate-400 w-6">
                            {index + 1}
                          </div>
                          <div className="text-2xl">{player.avatar}</div>
                          <div className="flex-1">
                            <div className="font-medium text-white">{player.nickname}</div>
                          </div>
                          <div className="text-xl font-bold text-white">{player.score}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!currentQuestion && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold font-display text-white mb-2">
                  回放准备就绪
                </h2>
                <p className="text-slate-400 mb-4">点击播放按钮开始观看</p>
              </div>
            </div>
          )}
        </div>

        {showDanmu && (
          <div className="w-72 border-l border-white/10">
            <DanmuLayer
              messages={danmuMessages}
              showInput={false}
              className="h-full"
            />
          </div>
        )}
      </div>

      <div className="glass border-t border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div
            ref={progressRef}
            className="relative h-2 bg-white/10 rounded-full cursor-pointer mb-4 group"
            onClick={handleSeek}
          >
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all"
              style={{ width: `${(currentTime / totalDuration) * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${(currentTime / totalDuration) * 100}% - 8px)` }}
            />
            <div
              className="absolute top-0 left-0 h-full bg-white/20 rounded-full pointer-events-none"
              style={{
                width: `${(currentTime / totalDuration) * 100}%`,
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentTime(Math.max(0, currentTime - 10000))}
                className="h-10 w-10 p-0"
              >
                <Rewind className="h-5 w-5" />
              </Button>
              <Button
                onClick={handlePlayPause}
                className="h-12 w-12 p-0 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-1" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 10000))}
                className="h-10 w-10 p-0"
              >
                <FastForward className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Clock className="h-4 w-4" />
                <span className="font-mono">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSpeedChange}
                className="gap-1"
              >
                <FastForward className="h-4 w-4" />
                {speed}x
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDanmu(!showDanmu)}
                className={showDanmu ? 'text-violet-400' : ''}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Volume2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
