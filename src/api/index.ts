import type {
  Question,
  CreateQuestionRequest,
  Room,
  RoomSettings,
  GameRecord,
  UserStats,
  RankingItem,
  QuestionStats,
  ApiResponse,
  ListResponse,
  ReplayEvent,
} from '@/types';

const API_BASE = '/api';

async function baseFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data as T;
}

export const questionApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    category?: string;
    difficulty?: number;
    search?: string;
  }) =>
    baseFetch<ListResponse<Question>>(
      `/questions?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),

  getById: (id: number) =>
    baseFetch<ApiResponse<Question>>(`/questions/${id}`),

  create: (data: CreateQuestionRequest) =>
    baseFetch<ApiResponse<Question>>('/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<CreateQuestionRequest>) =>
    baseFetch<ApiResponse<Question>>(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (id: number) =>
    baseFetch<ApiResponse<void>>(`/questions/${id}`, {
      method: 'DELETE',
    }),

  batchImport: (data: CreateQuestionRequest[]) =>
    baseFetch<ApiResponse<{ count: number }>>('/questions/batch', {
      method: 'POST',
      body: JSON.stringify({ questions: data }),
    }),

  getStats: () =>
    baseFetch<ApiResponse<QuestionStats>>('/questions/stats'),
};

export const roomApi = {
  getList: (params?: { page?: number; pageSize?: number }) =>
    baseFetch<ListResponse<Room>>(
      `/rooms?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),

  get: (code: string) =>
    baseFetch<ApiResponse<Room>>(`/rooms/${code}`),

  create: (data: {
    nickname: string;
    settings: Partial<RoomSettings>;
  }) =>
    baseFetch<ApiResponse<Room>>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  join: (code: string, data: { nickname: string; password?: string }) =>
    baseFetch<ApiResponse<Room>>(`/rooms/${code}/join`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  leave: (code: string, data: { playerId: string }) =>
    baseFetch<ApiResponse<void>>(`/rooms/${code}/leave`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSettings: (code: string, settings: Partial<RoomSettings>) =>
    baseFetch<ApiResponse<Room>>(`/rooms/${code}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  kick: (code: string, data: { playerId: string; reason?: string }) =>
    baseFetch<ApiResponse<void>>(`/rooms/${code}/kick`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  start: (code: string) =>
    baseFetch<ApiResponse<{ success: boolean }>>(`/rooms/${code}/start`, {
      method: 'POST',
    }),
};

export const recordApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
    playerId?: string;
  }) =>
    baseFetch<ListResponse<GameRecord>>(
      `/records?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),

  getById: (id: number) =>
    baseFetch<ApiResponse<GameRecord>>(`/records/${id}`),

  getReplay: (id: number) =>
    baseFetch<ApiResponse<ReplayEvent[]>>(`/records/${id}/replay`),
};

export const userApi = {
  getStats: (playerId: string) =>
    baseFetch<ApiResponse<UserStats>>(`/users/${playerId}/stats`),
};

export const rankingApi = {
  getList: (params?: {
    type?: 'weekly' | 'monthly' | 'allTime';
    page?: number;
    pageSize?: number;
    category?: string;
  }) =>
    baseFetch<ListResponse<RankingItem>>(
      `/users/rankings?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
};
