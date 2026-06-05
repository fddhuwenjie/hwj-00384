import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ScoreAnimationProps {
  value: number;
  showParticles?: boolean;
  particleCount?: number;
  className?: string;
  textClassName?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

const PARTICLE_COLORS = [
  '#8B5CF6',
  '#A78BFA',
  '#22D3EE',
  '#F59E0B',
  '#10B981',
  '#EC4899',
];

export function ScoreAnimation({
  value,
  showParticles = true,
  particleCount = 30,
  className,
  textClassName,
}: ScoreAnimationProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showPlus, setShowPlus] = useState(false);

  const createParticles = useCallback(() => {
    if (!showParticles) return;

    const newParticles: Particle[] = [];
    const centerX = 50;
    const centerY = 50;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;

      newParticles.push({
        id: Date.now() + i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        size: 3 + Math.random() * 5,
        life: 1,
      });
    }

    setParticles(newParticles);
  }, [showParticles, particleCount]);

  useEffect(() => {
    if (value !== prevValue && value > prevValue) {
      setShowPlus(true);
      createParticles();

      const diff = value - prevValue;
      const steps = Math.min(30, diff);
      const stepValue = diff / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        setDisplayValue(Math.round(prevValue + stepValue * currentStep));
        if (currentStep >= steps) {
          clearInterval(interval);
          setDisplayValue(value);
          setTimeout(() => setShowPlus(false), 500);
        }
      }, 30);

      setPrevValue(value);
      return () => clearInterval(interval);
    } else if (value !== prevValue) {
      setDisplayValue(value);
      setPrevValue(value);
    }
  }, [value, prevValue, createParticles]);

  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15,
            life: p.life - 0.025,
          }))
          .filter((p) => p.life > 0)
      );
    }, 16);

    return () => clearInterval(interval);
  }, [particles.length]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                backgroundColor: particle.color,
                opacity: particle.life,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
                transition: 'none',
              }}
            />
          ))}
        </div>
      )}

      <span
        className={cn(
          'relative font-mono tabular-nums font-bold transition-all duration-200',
          showPlus && 'scale-110',
          textClassName
        )}
      >
        {showPlus && (
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-emerald-400 text-sm animate-score-up whitespace-nowrap">
            +{value - prevValue || 0}
          </span>
        )}
        {displayValue.toLocaleString()}
      </span>
    </div>
  );
}
