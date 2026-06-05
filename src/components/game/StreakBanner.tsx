import { useEffect, useState } from 'react';
import { Flame, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakBannerProps {
  streak: number;
  show: boolean;
  onAnimationEnd?: () => void;
  className?: string;
}

const getStreakMessage = (streak: number): string => {
  if (streak >= 10) return '传奇连击！无人能挡！';
  if (streak >= 7) return '超神！势如破竹！';
  if (streak >= 5) return '完美连击！火力全开！';
  if (streak >= 3) return '连对3题！太棒了！';
  return '';
};

const getStreakColor = (streak: number): string => {
  if (streak >= 10) return 'from-pink-500 via-red-500 to-orange-500';
  if (streak >= 7) return 'from-red-500 via-orange-500 to-yellow-500';
  if (streak >= 5) return 'from-orange-500 via-yellow-500 to-amber-500';
  return 'from-violet-500 via-indigo-500 to-blue-500';
};

export function StreakBanner({
  streak,
  show,
  onAnimationEnd,
  className,
}: StreakBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (show && streak >= 3) {
      setIsExiting(false);
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          onAnimationEnd?.();
        }, 500);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [show, streak, onAnimationEnd]);

  if (!isVisible || streak < 3) return null;

  return (
    <div
      className={cn(
        'fixed top-20 left-1/2 z-50 transform -translate-x-1/2 transition-all duration-500 ease-out',
        isVisible && !isExiting ? 'animate-slide-in' : '',
        isExiting ? 'translate-x-full opacity-0' : '',
        className
      )}
    >
      <div
        className={cn(
          'relative px-8 py-4 rounded-2xl overflow-hidden',
          'bg-gradient-to-r',
          getStreakColor(streak),
          'shadow-2xl'
        )}
      >
        <div className="absolute inset-0 bg-white/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />

        <div className="relative flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(streak, 5) }).map((_, i) => (
              <Flame
                key={i}
                className={cn(
                  'w-6 h-6 text-yellow-300',
                  i === 0 && 'animate-pulse',
                  i === 1 && 'animate-pulse delay-100',
                  i === 2 && 'animate-pulse delay-200',
                  i === 3 && 'animate-pulse delay-300',
                  i === 4 && 'animate-pulse delay-400'
                )}
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(253, 224, 71, 0.8))',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-white" />
            <span className="text-2xl font-bold font-display text-white">
              {streak} 连击!
            </span>
          </div>

          <div className="h-8 w-px bg-white/30" />

          <span className="text-lg font-medium text-white/90">
            {getStreakMessage(streak)}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
          <div
            className="h-full bg-white/80 animate-shrink"
            style={{
              animationDuration: '2.5s',
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
            }}
          />
        </div>
      </div>
    </div>
  );
}
