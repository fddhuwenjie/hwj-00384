import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface CountdownProps {
  value: number;
  duration?: number;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showWarning?: boolean;
  warningThreshold?: number;
  className?: string;
}

const sizeStyles = {
  sm: 'text-2xl font-mono w-12 h-12',
  md: 'text-4xl font-mono w-20 h-20',
  lg: 'text-6xl font-mono w-32 h-32',
};

export function Countdown({
  value,
  duration = 1000,
  onComplete,
  size = 'md',
  showWarning = true,
  warningThreshold = 3,
  className,
}: CountdownProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  useEffect(() => {
    if (displayValue <= 0) {
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setDisplayValue((prev) => prev - 1);
        setIsAnimating(false);
      }, 150);
    }, duration);

    return () => clearTimeout(timer);
  }, [displayValue, duration, onComplete]);

  const isWarning = showWarning && displayValue <= warningThreshold && displayValue > 0;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl font-bold transition-all duration-200',
        sizeStyles[size],
        isWarning
          ? 'bg-red-500/20 text-red-400 animate-pulse border-2 border-red-500/50'
          : 'bg-violet-500/20 text-violet-300 border-2 border-violet-500/30',
        isAnimating && 'scale-110',
        className
      )}
    >
      {displayValue}
    </div>
  );
}

interface AnimatedNumberProps {
  value: number;
  className?: string;
}

export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value !== prevValue) {
      setPrevValue(value);
      const diff = value - prevValue;
      const steps = 20;
      const stepValue = diff / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        setDisplayValue(Math.round(prevValue + stepValue * currentStep));
        if (currentStep >= steps) {
          clearInterval(interval);
          setDisplayValue(value);
        }
      }, 30);

      return () => clearInterval(interval);
    }
  }, [value, prevValue]);

  return (
    <span className={cn('font-mono tabular-nums transition-all', className)}>
      {displayValue.toLocaleString()}
    </span>
  );
}
