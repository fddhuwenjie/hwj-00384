import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { cn } from '@/lib/utils';
import type { Achievement } from '@/types';

const rarityStyles: Record<Achievement['rarity'], { border: string; glow: string; text: string; bg: string }> = {
  legendary: {
    border: 'border-yellow-400',
    glow: 'shadow-yellow-400/50',
    text: 'text-yellow-400',
    bg: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/10',
  },
  epic: {
    border: 'border-purple-400',
    glow: 'shadow-purple-400/50',
    text: 'text-purple-400',
    bg: 'bg-gradient-to-br from-purple-500/20 to-violet-500/10',
  },
  rare: {
    border: 'border-blue-400',
    glow: 'shadow-blue-400/50',
    text: 'text-blue-400',
    bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10',
  },
  common: {
    border: 'border-slate-400',
    glow: 'shadow-slate-400/30',
    text: 'text-slate-400',
    bg: 'bg-gradient-to-br from-slate-500/20 to-slate-600/10',
  },
};

const rarityLabels: Record<Achievement['rarity'], string> = {
  legendary: '传说',
  epic: '史诗',
  rare: '稀有',
  common: '普通',
};

export function AchievementUnlockModal() {
  const { currentAchievement, setCurrentAchievement } = useNotificationStore();
  const [visible, setVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (currentAchievement) {
      setVisible(true);
      setTimeout(() => setShowContent(true), 100);
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentAchievement]);

  const handleClose = () => {
    setShowContent(false);
    setTimeout(() => {
      setVisible(false);
      setCurrentAchievement(null);
    }, 300);
  };

  if (!visible || !currentAchievement) return null;

  const { achievement } = currentAchievement;
  const style = rarityStyles[achievement.rarity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-md rounded-3xl p-8 text-center border-2',
          style.bg,
          style.border,
          'shadow-2xl',
          style.glow,
          'transition-all duration-300',
          showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 h-8 w-8 p-0 text-slate-400 hover:text-white"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className={cn(
          'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6',
          'transition-all duration-500 delay-100',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4',
          style.bg,
          style.border,
          'border',
          style.text
        )}>
          <Sparkles className="h-4 w-4" />
          成就解锁 · {rarityLabels[achievement.rarity]}
        </div>

        <div className={cn(
          'text-8xl mb-6 transition-all duration-500 delay-200',
          showContent ? 'opacity-100 scale-100 animate-bounce-in' : 'opacity-0 scale-50'
        )}>
          {achievement.icon}
        </div>

        <h2 className={cn(
          'text-3xl font-bold font-display text-white mb-2',
          'transition-all duration-500 delay-300',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}>
          {achievement.name}
        </h2>

        <p className={cn(
          'text-slate-300 mb-6',
          'transition-all duration-500 delay-400',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}>
          {achievement.description}
        </p>

        <div className={cn(
          'flex items-center justify-center gap-6 text-sm',
          'transition-all duration-500 delay-500',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}>
          <div className="text-center">
            <div className={cn('text-2xl font-bold font-display', style.text)}>
              +{achievement.points}
            </div>
            <div className="text-slate-500">成就点数</div>
          </div>
        </div>
      </div>
    </div>
  );
}
