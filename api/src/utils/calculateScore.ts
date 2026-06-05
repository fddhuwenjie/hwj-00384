import type { ScoreCalculationParams, ScoreBreakdown } from '../types/index.js';

export const calculateScore = (params: ScoreCalculationParams): ScoreBreakdown => {
  const { isCorrect, responseTime, timeLimit, streak, isFirstCorrect } = params;

  if (!isCorrect) {
    return {
      baseScore: 0,
      speedBonus: 0,
      streakBonus: 0,
      firstBonus: 0,
      totalScore: 0,
    };
  }

  const baseScore = 10;

  const remainingTime = Math.max(0, timeLimit - responseTime);
  const speedBonus = Math.round((remainingTime / timeLimit) * 10);

  const streakBonus = streak >= 3 ? 3 : 0;

  const firstBonus = isFirstCorrect ? 5 : 0;

  const totalScore = baseScore + speedBonus + streakBonus + firstBonus;

  return {
    baseScore,
    speedBonus,
    streakBonus,
    firstBonus,
    totalScore,
  };
};

export default calculateScore;
