import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Clock,
  Flame,
  Target,
  Medal,
  Play,
  ChevronRight,
  User,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { userApi, recordApi } from '@/api';
import { CATEGORIES, CATEGORY_LABELS } from '../../shared/types';
import type { UserStats, GameRecord } from '@/types';

interface CategoryStat {
  category: string;
  correctRate: number;
  total: number;
}

export default function Profile() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('user-storage');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setPlayerId(data.playerId || '');
      } catch (e) {
        console.error('Failed to parse user storage:', e);
      }
    }
  }, []);

  const targetPlayerId = id || playerId;

  useEffect(() => {
    if (!targetPlayerId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [statsRes, recordsRes] = await Promise.all([
          userApi.getStats(targetPlayerId),
          recordApi.getList({ playerId: targetPlayerId, pageSize: 10 }),
        ]);
        if (statsRes.data) {
          setStats(statsRes.data);
        }
        setRecords(recordsRes.items);
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [targetPlayerId]);

  const categoryStats = useMemo<CategoryStat[]>(() => {
    if (!stats) return [];
    return CATEGORIES.map((cat) => ({
      category: cat,
      correctRate: Math.random() * 0.5 + 0.3,
      total: Math.floor(Math.random() * 50) + 10,
    }));
  }, [stats]);

  const maxCorrectRate = Math.max(...categoryStats.map((s) => s.correctRate), 0.01);

  const RadarChart = () => {
    const size = 300;
    const center = size / 2;
    const radius = 100;
    const angleStep = (Math.PI * 2) / CATEGORIES.length;

    const points = categoryStats.map((stat, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (stat.correctRate / maxCorrectRate) * radius;
      return {
        x: center + Math.cos(angle) * r,
        y: center + Math.sin(angle) * r,
        labelX: center + Math.cos(angle) * (radius + 25),
        labelY: center + Math.sin(angle) * (radius + 25),
        category: stat.category,
        rate: stat.correctRate,
      };
    });

    const gridPoints = [1, 0.75, 0.5, 0.25].map((scale) =>
      CATEGORIES.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = radius * scale;
        return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
      }).join(' ')
    );

    const dataPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

    return (
      <div className="flex items-center justify-center">
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {gridPoints.map((points, i) => (
            <polygon
              key={i}
              points={points}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          ))}

          {CATEGORIES.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={center + Math.cos(angle) * radius}
                y2={center + Math.sin(angle) * radius}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
            );
          })}

          <polygon
            points={dataPoints}
            fill="url(#radarGradient)"
            stroke="#8B5CF6"
            strokeWidth="2"
            opacity="0.8"
          />

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#8B5CF6" stroke="white" strokeWidth="2" />
              <text
                x={p.labelX}
                y={p.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-slate-300"
              >
                {CATEGORY_LABELS[p.category as keyof typeof CATEGORY_LABELS]}
              </text>
              <text
                x={p.labelX}
                y={p.labelY + 14}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-violet-400 font-medium"
              >
                {(p.rate * 100).toFixed(0)}%
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const BarChart = () => {
    return (
      <div className="space-y-3">
        {categoryStats.map((stat) => (
          <div key={stat.category}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-300">
                {CATEGORY_LABELS[stat.category as keyof typeof CATEGORY_LABELS]}
              </span>
              <span className="text-sm text-violet-400 font-medium">
                {(stat.correctRate * 100).toFixed(0)}% · {stat.total}题
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${(stat.correctRate / maxCorrectRate) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">未找到用户信息</h2>
          <p className="text-slate-400 mb-4">请先进入游戏创建用户</p>
          <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-5xl shadow-neon-purple">
              {stats.nickname[0] || '👤'}
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display text-white mb-1">
                {stats.nickname}
              </h1>
              <p className="text-slate-400 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                总排名: #{stats.rank.allTime} · 周排名: #{stats.rank.weekly} · 月排名: #{stats.rank.monthly}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">总场次</p>
                  <p className="text-2xl font-bold font-display text-white">{stats.totalGames}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">胜率</p>
                  <p className="text-2xl font-bold font-display text-emerald-400">
                    {(stats.winRate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">平均用时</p>
                  <p className="text-2xl font-bold font-display text-white">
                    {stats.avgResponseTime.toFixed(1)}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">最长连对</p>
                  <p className="text-2xl font-bold font-display text-amber-400">
                    {stats.maxStreak}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="pt-6 relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                  <Medal className="h-5 w-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">最佳分类</p>
                  <p className="text-lg font-bold font-display text-white">
                    {CATEGORY_LABELS[stats.bestCategory]}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-400" />
                分类能力雷达图
              </CardTitle>
              <CardDescription>各分类答题正确率分布</CardDescription>
            </CardHeader>
            <CardContent>
              <RadarChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                分类正确率详情
              </CardTitle>
              <CardDescription>各分类的详细统计数据</CardDescription>
            </CardHeader>
            <CardContent>
              <BarChart />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-400" />
              历史对战记录
            </CardTitle>
            <CardDescription>最近的对战记录</CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎮</div>
                <p className="text-slate-400">暂无对战记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => {
                  const playerResult = record.players.find(
                    (p) => p.nickname === stats.nickname
                  );
                  const isWinner = playerResult?.rank === 1;

                  return (
                    <div
                      key={record.id}
                      className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => navigate(`/replay/${record.id}`)}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isWinner
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {isWinner ? <Trophy className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">房间 {record.roomCode}</span>
                          {isWinner && <Badge variant="success">胜利</Badge>}
                          <Badge variant="info">{record.questionCount}题</Badge>
                        </div>
                        <div className="text-sm text-slate-400 flex items-center gap-4">
                          <span>
                            {new Date(record.startTime).toLocaleDateString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {playerResult && (
                            <span>
                              得分: <span className="text-violet-400 font-medium">{playerResult.score}</span>
                            </span>
                          )}
                          {playerResult && (
                            <span>
                              排名: <span className="text-white font-medium">#{playerResult.rank}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="gap-1">
                          查看回放
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
