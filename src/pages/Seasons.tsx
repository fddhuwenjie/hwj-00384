import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Crown, ChevronLeft, ChevronRight, Clock, Target, Users, Calendar, Snowflake, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { seasonApi } from '@/api';
import type { Season, SeasonRankingItem } from '@/types';

const AVATARS = ['🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯', '🐸', '🦄', '👾', '🤖'];

function getAvatar(playerId: string) {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Seasons() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [rankings, setRankings] = useState<SeasonRankingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadSeasons = useCallback(async () => {
    setLoading(true);
    try {
      const response = await seasonApi.getList({ pageSize: 100 });
      setSeasons(response.items);
    } catch (error) {
      console.error('Failed to load seasons:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeasons();
  }, [loadSeasons]);

  const loadRankings = useCallback(async (season: Season, pageNum: number) => {
    setRankingsLoading(true);
    try {
      let response;
      if (season.status === 'active') {
        response = await seasonApi.getCurrentRankings({ page: pageNum, pageSize });
      } else {
        response = await seasonApi.getSeasonRankings(season.id, { page: pageNum, pageSize });
      }
      setRankings(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load rankings:', error);
    } finally {
      setRankingsLoading(false);
    }
  }, []);

  const handleSeasonClick = (season: Season) => {
    setSelectedSeason(season);
    setPage(1);
    loadRankings(season, 1);
  };

  const handleBack = () => {
    setSelectedSeason(null);
    setRankings([]);
    setPage(1);
    setTotal(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (selectedSeason) {
      loadRankings(selectedSeason, newPage);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const getStatusBadge = (status: Season['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <Flame className="h-3 w-3" />
            进行中
          </Badge>
        );
      case 'frozen':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Snowflake className="h-3 w-3" />
            已冻结
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            已归档
          </Badge>
        );
    }
  };

  const topThree = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  if (selectedSeason) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
              <ChevronLeft className="h-4 w-4 mr-1" />
              返回赛季列表
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-display text-white mb-2 flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-400" />
                  {selectedSeason.name}
                </h1>
                <div className="flex items-center gap-4 text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedSeason.startDate)} - {formatDate(selectedSeason.endDate)}
                  </span>
                  {getStatusBadge(selectedSeason.status)}
                </div>
              </div>
            </div>
          </div>

          {rankingsLoading ? (
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
                            <Trophy className="h-3 w-3" />
                            {topThree[1]?.wins || 0}胜
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
                            <Trophy className="h-3 w-3" />
                            {topThree[0]?.wins || 0}胜
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
                            <Trophy className="h-3 w-3" />
                            {topThree[2]?.wins || 0}胜
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
                  <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-violet-400" />
                    排行榜
                  </div>
                  <span className="text-sm font-normal text-slate-400">
                    共 {total} 人
                  </span>
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
                              <Trophy className="h-3 w-3" />
                              {player.wins}胜
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
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
                        <ChevronRight className="h-5 w-5 text-slate-500" />
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-slate-400 text-sm">
                        第 {page} / {totalPages} 页
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold font-display text-white mb-2 flex items-center justify-center gap-3">
            <Trophy className="h-10 w-10 text-yellow-400" />
            赛季
          </h1>
          <p className="text-slate-400">查看历史赛季和排行</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">加载中...</p>
          </div>
        ) : seasons.length === 0 ? (
          <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-slate-400">暂无赛季数据</p>
        </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {seasons.map((season) => (
              <Card
                key={season.id}
                hover
                className="cursor-pointer"
                onClick={() => handleSeasonClick(season)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{season.name}</CardTitle>
                    {getStatusBadge(season.status)}
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(season.startDate)} - {formatDate(season.endDate)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      {season.year}年{season.month}月
                    </div>
                    <div className="flex items-center gap-1 text-violet-400">
                      查看排行
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
