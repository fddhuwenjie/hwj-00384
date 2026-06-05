import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Medal, Home, RotateCcw, Eye, Zap, Target, Clock, ChevronDown, ChevronUp, Flame, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreAnimation } from '@/components/game/ScoreAnimation';
import { useUserStore } from '@/stores/useUserStore';
import { useRoomStore } from '@/stores/useRoomStore';
import type { PlayerResult, ScoreDetail } from '@/types';
import { cn } from '@/lib/utils';

export default function GameResult() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { playerId } = useUserStore();
  const { resetRoom } = useRoomStore();

  const standings = (location.state as { standings?: PlayerResult[] })?.standings || [];
  const recordId = (location.state as { recordId?: number })?.recordId;

  const [visiblePlayers, setVisiblePlayers] = useState<number[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showContent, setShowContent] = useState(false);
  const [showMedals, setShowMedals] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showContent) {
      const timers: NodeJS.Timeout[] = [];
      standings.forEach((_, index) => {
        timers.push(
          setTimeout(() => {
            setVisiblePlayers((prev) => [...prev, index]);
            if (index === 0) {
              setTimeout(() => setShowMedals(true), 300);
            }
          }, index * 300)
        );
      });
      return () => timers.forEach(clearTimeout);
    }
  }, [showContent, standings.length]);

  useEffect(() => {
    return () => {
      resetRoom();
    };
  }, [resetRoom]);

  const myResult = standings.find((r) => r.playerId === playerId);
  const sortedStandings = [...standings].sort((a, b) => a.rank - b.rank);

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getRankIcon = (rank: number, animate: boolean) => {
    const baseClass = cn('transition-all duration-500', animate && showMedals && 'animate-bounce-in');

    switch (rank) {
      case 1:
        return <Trophy className={cn('h-8 w-8 text-yellow-400', baseClass)} style={{ filter: 'drop-shadow(0 0 12px rgba(250, 204, 21, 0.6))' }} />;
      case 2:
        return <Medal className={cn('h-8 w-8 text-slate-300', baseClass)} style={{ filter: 'drop-shadow(0 0 8px rgba(203, 213, 225, 0.5))' }} />;
      case 3:
        return <Medal className={cn('h-8 w-8 text-amber-600', baseClass)} style={{ filter: 'drop-shadow(0 0 8px rgba(217, 119, 6, 0.5))' }} />;
      default:
        return <span className="text-2xl font-bold text-slate-500">{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-slate-400/20 to-slate-300/20 border-slate-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30';
      default:
        return 'bg-white/5 border-white/10';
    }
  };

  const getScoreBreakdown = (scoreDetails: ScoreDetail[]) => {
    return scoreDetails.reduce(
      (acc, detail) => ({
        base: acc.base + detail.baseScore,
        speed: acc.speed + detail.speedBonus,
        streak: acc.streak + detail.streakBonus,
        first: acc.first + detail.firstBonus,
      }),
      { base: 0, speed: 0, streak: 0, first: 0 }
    );
  };

  const maxScore = Math.max(...sortedStandings.map((s) => s.score), 1);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 py-12">
      <div className="w-full max-w-4xl">
        <div className={cn(
          'text-center mb-10 transition-all duration-700',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
        )}>
          <div className="inline-flex mb-6">
            {myResult?.rank === 1 ? (
              <div className="text-8xl animate-bounce">🏆</div>
            ) : myResult?.rank === 2 ? (
              <div className="text-8xl animate-float">🥈</div>
            ) : myResult?.rank === 3 ? (
              <div className="text-8xl animate-float">🥉</div>
            ) : (
              <div className="text-8xl animate-float">🎮</div>
            )}
          </div>
          <h1 className="text-5xl font-bold font-display gradient-text mb-2">
            游戏结束！
          </h1>
          <p className="text-xl text-slate-400">
            {myResult ? (
              <>
                你获得了第 <span className="text-violet-400 font-bold">{myResult.rank}</span> 名
              </>
            ) : (
              '查看最终排名'
            )}
          </p>
        </div>

        {myResult && (
          <div className={cn(
            'grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 transition-all duration-700 delay-200',
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          )}>
            <Card className="text-center">
              <Target className="h-6 w-6 text-violet-400 mx-auto mb-2" />
              <div className="text-2xl font-bold font-display text-white">
                <ScoreAnimation value={myResult.score} />
              </div>
              <div className="text-sm text-slate-400">总得分</div>
            </Card>
            <Card className="text-center">
              <Zap className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold font-display text-white">
                {myResult.correctCount}/{standings.length > 0 && myResult.scoreDetails ? myResult.scoreDetails.length : 0}
              </div>
              <div className="text-sm text-slate-400">正确数</div>
            </Card>
            <Card className="text-center">
              <Clock className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold font-display text-white">
                {myResult.avgResponseTime.toFixed(1)}s
              </div>
              <div className="text-sm text-slate-400">平均用时</div>
            </Card>
            <Card className="text-center">
              <Flame className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold font-display text-white">
                {myResult.maxStreak}
              </div>
              <div className="text-sm text-slate-400">最高连击</div>
            </Card>
          </div>
        )}

        <Card className={cn(
          'mb-8 transition-all duration-700 delay-400',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        )}>
          <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            最终排名
          </h2>

          <div className="space-y-3">
            {sortedStandings.map((result, index) => {
              const breakdown = getScoreBreakdown(result.scoreDetails || []);
              const isVisible = visiblePlayers.includes(index);
              const isCurrentPlayer = result.playerId === playerId;
              const prevRank = index + 2;
              const rankChanged = result.rank !== prevRank;

              return (
                <div
                  key={result.playerId}
                  className={cn(
                    'flex flex-col p-4 rounded-xl border transition-all duration-500',
                    getRankBg(result.rank),
                    isCurrentPlayer && 'ring-2 ring-violet-500/50',
                    isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 flex justify-center">
                      {getRankIcon(result.rank, index < 3)}
                    </div>
                    <div className="text-3xl">
                      {standings.find((p) => p.playerId === result.playerId)?.nickname?.charAt(0) || '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {result.nickname}
                        </span>
                        {isCurrentPlayer && (
                          <Badge variant="info" className="ml-2">你</Badge>
                        )}
                        {rankChanged && (
                          <span className="flex items-center text-xs">
                            {result.rank < prevRank ? (
                              <TrendingUp className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">
                        正确率 {((result.correctCount / (result.scoreDetails?.length || 1)) * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-display gradient-text">
                        <ScoreAnimation value={result.score} />
                      </div>
                      <div className="text-xs text-slate-500">分</div>
                    </div>
                  </div>

                  {isVisible && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="text-sm text-slate-400 mb-2">得分构成</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Star className="w-4 h-4 text-violet-400 flex-shrink-0" />
                          <span className="text-xs text-slate-300 w-16">基础分</span>
                          <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-500 rounded-full transition-all duration-1000"
                              style={{ width: `${(breakdown.base / maxScore) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-violet-300 w-12 text-right">
                            {breakdown.base}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          <span className="text-xs text-slate-300 w-16">速度奖励</span>
                          <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500 rounded-full transition-all duration-1000 delay-100"
                              style={{ width: `${(breakdown.speed / maxScore) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-yellow-300 w-12 text-right">
                            +{breakdown.speed}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <span className="text-xs text-slate-300 w-16">连对奖励</span>
                          <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full transition-all duration-1000 delay-200"
                              style={{ width: `${(breakdown.streak / maxScore) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-orange-300 w-12 text-right">
                            +{breakdown.streak}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Star className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          <span className="text-xs text-slate-300 w-16">首答奖励</span>
                          <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 rounded-full transition-all duration-1000 delay-300"
                              style={{ width: `${(breakdown.first / maxScore) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-cyan-300 w-12 text-right">
                            +{breakdown.first}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {myResult?.scoreDetails && myResult.scoreDetails.length > 0 && (
          <Card className={cn(
            'mb-8 transition-all duration-700 delay-600',
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          )}>
            <h2 className="text-xl font-bold font-display text-white mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-400" />
              答题详情
            </h2>

            <div className="space-y-2">
              {myResult.scoreDetails.map((detail, index) => {
                const isExpanded = expandedQuestions.has(index);

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleQuestion(index)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center font-bold',
                        detail.isCorrect
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-white">
                          第 {index + 1} 题
                        </div>
                        <div className="text-xs text-slate-400">
                          {detail.isCorrect ? (
                            <span className="text-emerald-400">回答正确</span>
                          ) : (
                            <span className="text-red-400">回答错误</span>
                          )}
                          {' · '}
                          用时 {detail.responseTime.toFixed(1)}s
                        </div>
                      </div>
                      <div className="text-right mr-2">
                        <div className={cn(
                          'font-mono font-bold',
                          detail.isCorrect ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {detail.isCorrect ? `+${detail.totalScore}` : '+0'}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-white/10">
                        <div className="p-3 bg-white/5 rounded-lg mt-3">
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="info">基础分 +{detail.baseScore}</Badge>
                            {detail.speedBonus > 0 && (
                              <Badge variant="success">速度 +{detail.speedBonus}</Badge>
                            )}
                            {detail.streakBonus > 0 && (
                              <Badge variant="warning">连击 +{detail.streakBonus}</Badge>
                            )}
                            {detail.firstBonus > 0 && (
                              <Badge variant="info">首答 +{detail.firstBonus}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className={cn(
          'flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-800',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        )}>
          <Button size="lg" onClick={() => navigate('/lobby')}>
            <Home className="h-5 w-5 mr-2" />
            返回大厅
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate(`/room/${code}`)}>
            <RotateCcw className="h-5 w-5 mr-2" />
            再来一局
          </Button>
          {recordId && (
            <Button size="lg" variant="ghost" onClick={() => navigate(`/replay/${recordId}`)}>
              <Eye className="h-5 w-5 mr-2" />
              查看回放
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
