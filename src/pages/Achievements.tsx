import { useState, useEffect, useMemo } from 'react';
import { Trophy, Lock, Star, Sparkles, Award, Gem, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { achievementApi } from '@/api';
import { useUserStore } from '@/stores/useUserStore';
import type { Achievement, PlayerAchievement } from '@/types';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

const rarityConfig: Record<Rarity, { color: string; bgColor: string; borderColor: string; label: string; icon: typeof Star }> = {
  common: {
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/30',
    label: '普通',
    icon: Star,
  },
  rare: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    label: '稀有',
    icon: Gem,
  },
  epic: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    label: '史诗',
    icon: Sparkles,
  },
  legendary: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    label: '传说',
    icon: Crown,
  },
};

const rarityOrder: Record<Rarity, number> = {
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

export default function Achievements() {
  const { playerId } = useUserStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [playerAchievements, setPlayerAchievements] = useState<PlayerAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!playerId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [allRes, playerRes] = await Promise.all([
          achievementApi.getAll(),
          achievementApi.getPlayerAchievements(playerId),
        ]);
        setAchievements(allRes.items);
        if (playerRes.data) {
          setPlayerAchievements(playerRes.data.unlocked);
          const progress = playerRes.data.progress;
          let points = 0;
          Object.values(progress).forEach((p) => {
            points += p.unlocked * 10;
          });
          setTotalPoints(points);
        }
      } catch (error) {
        console.error('Failed to load achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [playerId]);

  const { unlockedAchievements, lockedAchievements } = useMemo(() => {
    const unlockedIds = new Set(playerAchievements.map((pa) => pa.achievement.id));
    const unlocked = achievements
      .filter((a) => unlockedIds.has(a.id))
      .sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
    const locked = achievements
      .filter((a) => !unlockedIds.has(a.id))
      .sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
    return { unlockedAchievements: unlocked, lockedAchievements: locked };
  }, [achievements, playerAchievements]);

  const getUnlockedAt = (achievementId: number) => {
    const pa = playerAchievements.find((p) => p.achievement.id === achievementId);
    return pa?.unlockedAt;
  };

  const AchievementCard = ({ achievement, isUnlocked }: { achievement: Achievement; isUnlocked: boolean }) => {
    const config = rarityConfig[achievement.rarity];
    const RarityIcon = config.icon;
    const unlockedAt = getUnlockedAt(achievement.id);

    return (
      <Card
        className={`relative overflow-hidden transition-all duration-300 ${
          isUnlocked
            ? 'glass-hover'
            : 'opacity-60 grayscale'
        }`}
      >
        {isUnlocked && (
          <div
            className={`absolute top-0 right-0 w-32 h-32 ${config.bgColor} rounded-full -mr-16 -mt-16`}
          />
        )}
        <CardContent className="pt-6 relative">
          <div className="flex items-start gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isUnlocked
                  ? `${config.bgColor} ${config.borderColor} border-2`
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              {isUnlocked ? (
                <span className="text-3xl">{achievement.icon}</span>
              ) : (
                <Lock className="h-6 w-6 text-slate-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-bold font-display ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                  {achievement.name}
                </h3>
                <Badge
                  className={`${config.bgColor} ${config.color} ${config.borderColor} border`}
                >
                  <RarityIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              <p className={`text-sm mb-2 ${isUnlocked ? 'text-slate-400' : 'text-slate-600'}`}>
                {achievement.description}
              </p>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1 text-sm ${isUnlocked ? config.color : 'text-slate-600'}`}>
                  <Award className="h-4 w-4" />
                  <span>{achievement.points} 积分</span>
                </div>
                {isUnlocked && unlockedAt && (
                  <div className="text-xs text-slate-500">
                    解锁于 {new Date(unlockedAt).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-white mb-2">成就徽章</h1>
          <p className="text-slate-400">收集徽章，展示你的实力</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">已解锁</p>
                  <p className="text-2xl font-bold font-display text-white">
                    {unlockedAchievements.length} <span className="text-slate-500 text-lg">/ {achievements.length}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">总积分</p>
                  <p className="text-2xl font-bold font-display text-yellow-400">
                    {totalPoints}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">完成度</p>
                  <p className="text-2xl font-bold font-display text-emerald-400">
                    {achievements.length > 0
                      ? ((unlockedAchievements.length / achievements.length) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {unlockedAchievements.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <h2 className="text-xl font-bold font-display text-white">已解锁</h2>
              <Badge variant="success">{unlockedAchievements.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unlockedAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  isUnlocked={true}
                />
              ))}
            </div>
          </div>
        )}

        {lockedAchievements.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-slate-500" />
              <h2 className="text-xl font-bold font-display text-slate-400">未解锁</h2>
              <Badge variant="default">{lockedAchievements.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lockedAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  isUnlocked={false}
                />
              ))}
            </div>
          </div>
        )}

        {achievements.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-white mb-2">暂无成就</h3>
            <p className="text-slate-400">继续努力，解锁更多成就徽章！</p>
          </div>
        )}
      </div>
    </div>
  );
}
