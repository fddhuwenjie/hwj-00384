export * from '../../shared/types';

export type GamePhase = 'waiting' | 'countdown' | 'question' | 'reveal' | 'finished';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QuestionStats {
  total: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<number, number>;
  avgCorrectRate: number;
}

export interface SocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}
