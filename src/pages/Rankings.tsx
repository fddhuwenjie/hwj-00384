import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Crown, Medal, ChevronDown, TrendingUp, Users, Target, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { rankingApi } from '@/api';
import { CATEGORIES, CATEGORY_LABELS } from '../../shared/types';
import type { RankingItem } from '@/types';

type RankingType = 'weekly' | 'monthly' | 'allTime';

const RANKING_TABS: { value: RankingType; label: string }[] = [
  { value: 'weekly', label: '周榜' },
  { value: 'monthly', label: '月榜' },
  { value: 'allTime', label: '总榜' },
];

const AVATARS = ['🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯', '🐸', '🦄', '👾', '🤖'];

function getAvatar(playerId: string) {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

export default function Rankings() {
  const navigate = useNavigate();
  const [type, setType] = useState<RankingType>('weekly');
  const [category, setCategory] = useState('');
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRankings = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        type: RankingType;
        pageSize: number;
        category?: string;
      } = { type, pageSize: 50 };
      if (category) params.category = category;

      const response = await rankingApi.getList(params);
      setRankings(response.items);
    } catch (error) {
      console.error('Failed to load rankings:', error);
    } finally {
      setLoading(false);
    }
  }, [type, category]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  const topThree = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold font-display text-white mb-2 flex items-center justify-center gap-3">
            <Trophy className="h-10 w-10 text-yellow-400" />
            排行榜
          </h1>
          <p className="text-slate-400">看看谁是最强答题王者</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2">
                {RANKING_TABS.map((tab) => (
                  <Button
                    key={tab.value}
                    variant={type === tab.value ? 'primary' : 'ghost'}
                    onClick={() => setType(tab.value)}
                    size="sm"
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <div className="w-48">
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: '', label: '全部分类' },
                    ...CATEGORIES.map((c) => ({
                      value: c,
                      label: CATEGORY_LABELS[c],
                    })),
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">加载中...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-slate-400">暂无排行数据</p>
          </div>
        ) : (
          <>
            {topThree.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="order-2">
                  <div className="relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                      <div className="w-12 h-12 rounded-full bg-slate-400/20 border-2 border-slate-400 flex items-center justify-center text-2xl">
                        🥈
                      </div>
                    </div>
                    <Card className="pt-10 text-center border-slate-400/30 bg-gradient-to-b from-slate-400/10 to-transparent">
                      <div className="text-5xl mb-2">
                        {getAvatar(topThree[1]?.playerId || '')}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1 truncate">
                        {topThree[1]?.nickname || '-'}
                      </h3>
                      <div className="text-2xl font-bold font-display text-slate-300 mb-2">
                        {topThree[1]?.score?.toLocaleString() || 0}
                      </div>
                      <div className="flex justify-center gap-4 text-xs text-slate-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {((topThree[1]?.winRate || 0) * 100).toFixed(0)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {topThree[1]?.games || 0}场
                        </span>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="order-1 md:order-2">
                  <div className="relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                      <div className="w-16 h-16 rounded-full bg-yellow-400/20 border-2 border-yellow-400 flex items-center justify-center text-3xl shadow-neon-purple animate-pulse">
                        👑
                      </div>
                    </div>
                    <Card className="pt-12 text-center border-yellow-400/30 bg-gradient-to-b from-yellow-400/10 to-transparent shadow-neon-purple">
                      <div className="text-6xl mb-2">
                        {getAvatar(topThree[0]?.playerId || '')}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1 truncate">
                        {topThree[0]?.nickname || '-'}
                      </h3>
                      <Badge variant="warning" className="mb-2">
                        <Crown className="h-3 w-3 mr-1" />
                        冠军
                      </Badge>
                      <div className="text-3xl font-bold font-display gradient-text mb-2">
                        {topThree[0]?.score?.toLocaleString() || 0}
                      </div>
                      <div className="flex justify-center gap-4 text-xs text-slate-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">
                            {((topThree[0]?.winRate || 0) * 100).toFixed(0)}%
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {topThree[0]?.games || 0}场
                        </span>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="order-3">
                  <div className="relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                      <div className="w-12 h-12 rounded-full bg-amber-600/20 border-2 border-amber-600 flex items-center justify-center text-2xl">
                        🥉
                      </div>
                    </div>
                    <Card className="pt-10 text-center border-amber-600/30 bg-gradient-to-b from-amber-600/10 to-transparent">
                      <div className="text-5xl mb-2">
                        {getAvatar(topThree[2]?.playerId || '')}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1 truncate">
                        {topThree[2]?.nickname || '-'}
                      </h3>
                      <div className="text-2xl font-bold font-display text-amber-400 mb-2">
                        {topThree[2]?.score?.toLocaleString() || 0}
                      </div>
                      <div className="flex justify-center gap-4 text-xs text-slate-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {((topThree[2]?.winRate || 0) * 100).toFixed(0)}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {topThree[2]?.games || 0}场
                        </span>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-violet-400" />
                  完整榜单
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rest.map((player, index) => (
                    <div
                      key={player.playerId}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/profile/${player.playerId}`)}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          index + 3 <= 10
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {index + 4}
                      </div>
                      <div className="text-3xl">
                        {getAvatar(player.playerId)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {player.nickname}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-emerald-400" />
                            {(player.winRate * 100).toFixed(1)}%
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {player.games}场
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold font-display text-white">
                          {player.score.toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">积分</div>
                      </div>
                      <ChevronDown className="h-5 w-5 text-slate-500 -rotate-90" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
