import { Check, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Player } from '@/types';
import { AnimatedNumber } from '@/components/ui/Countdown';

interface PlayerStatusBarProps {
  players: Player[];
  answeredPlayers: string[];
  currentPlayerId?: string;
  className?: string;
}

export function PlayerStatusBar({
  players,
  answeredPlayers,
  currentPlayerId,
  className,
}: PlayerStatusBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-3', className)}>
      {players.map((player) => {
        const hasAnswered = answeredPlayers.includes(player.id);
        const isCurrentPlayer = player.id === currentPlayerId;

        return (
          <div
            key={player.id}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300',
              isCurrentPlayer
                ? 'bg-violet-500/20 border-violet-500/50 shadow-neon-purple'
                : 'bg-white/5 border-white/10',
              hasAnswered && 'border-emerald-500/50 bg-emerald-500/10'
            )}
          >
            <div className="relative">
              <div className="text-2xl">{player.avatar}</div>
              {hasAnswered && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce-in">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    'text-sm font-medium',
                    isCurrentPlayer ? 'text-violet-300' : 'text-white'
                  )}
                >
                  {player.nickname}
                  {isCurrentPlayer && (
                    <span className="ml-1 text-xs text-violet-400">(你)</span>
                  )}
                </span>
                {player.streak >= 3 && (
                  <div className="flex items-center gap-0.5 text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded-full">
                    <Flame className="w-3 h-3" />
                    <span className="text-xs font-bold">{player.streak}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-white">
                  <AnimatedNumber value={player.score} />
                </span>
                {hasAnswered && (
                  <span className="text-xs text-emerald-400 font-medium">
                    已作答
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
