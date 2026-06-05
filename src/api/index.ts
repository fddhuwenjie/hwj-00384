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
  Season,
  SeasonRankingItem,
  Friend,
  FriendRequest,
  Achievement,
  PlayerAchievement,
  ContributedQuestion,
  ContributorRankingItem,
  Team,
  TeamMember,
  TeamMatch,
  TeamRankingItem,
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

export const seasonApi = {
  getList: (params?: { page?: number; pageSize?: number }) =>
    baseFetch<ListResponse<Season>>(
      `/seasons?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  getCurrent: () => baseFetch<ApiResponse<Season>>('/seasons/current'),
  getById: (id: number) => baseFetch<ApiResponse<Season>>(`/seasons/${id}`),
  getCurrentRankings: (params?: { page?: number; pageSize?: number }) =>
    baseFetch<ListResponse<SeasonRankingItem>>(
      `/seasons/current/rankings?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  getSeasonRankings: (id: number, params?: { page?: number; pageSize?: number }) =>
    baseFetch<ListResponse<SeasonRankingItem>>(
      `/seasons/${id}/rankings?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  getPlayerRank: (playerId: string) =>
    baseFetch<ApiResponse<{ rank: number; score: number }>>(`/seasons/player/${playerId}/rank`),
};

export const friendApi = {
  search: (nickname: string) =>
    baseFetch<ListResponse<{
      playerId: string;
      nickname: string;
      avatar?: string;
      isOnline: boolean;
      isFriend: boolean;
      hasPendingRequest: boolean;
    }>>(`/friends/search?nickname=${encodeURIComponent(nickname)}`),
  sendRequest: (receiverId: string) =>
    baseFetch<ApiResponse<FriendRequest>>('/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ receiverId }),
    }),
  getRequests: () => baseFetch<ListResponse<FriendRequest>>('/friends/requests'),
  acceptRequest: (id: number) =>
    baseFetch<ApiResponse<Friend>>(`/friends/requests/${id}/accept`, {
      method: 'POST',
    }),
  rejectRequest: (id: number) =>
    baseFetch<ApiResponse<void>>(`/friends/requests/${id}/reject`, {
      method: 'POST',
    }),
  getFriends: () => baseFetch<ListResponse<Friend>>('/friends'),
  removeFriend: (playerId: string) =>
    baseFetch<ApiResponse<void>>(`/friends/${playerId}`, {
      method: 'DELETE',
    }),
};

export const achievementApi = {
  getAll: () => baseFetch<ListResponse<Achievement>>('/achievements'),
  getById: (id: number) => baseFetch<ApiResponse<Achievement>>(`/achievements/${id}`),
  getByCode: (code: string) => baseFetch<ApiResponse<Achievement>>(`/achievements/code/${code}`),
  getPlayerAchievements: (playerId: string) =>
    baseFetch<ApiResponse<{
      unlocked: PlayerAchievement[];
      total: number;
      unlockedCount: number;
      progress: Record<string, { total: number; unlocked: number }>;
    }>>(`/achievements/player/${playerId}`),
  getPlayerProgress: (playerId: string) =>
    baseFetch<ApiResponse<Record<string, { total: number; unlocked: number; points: number }>>>(
      `/achievements/player/${playerId}/progress`
    ),
  checkAchievements: (playerId: string) =>
    baseFetch<ApiResponse<PlayerAchievement[]>>(`/achievements/player/${playerId}/check`),
};

export const contributionApi = {
  submitQuestion: (data: {
    text: string;
    options: string[];
    correctAnswer: number;
    difficulty: number;
    category: string;
    analysis: string;
    contributorId: string;
  }) =>
    baseFetch<ApiResponse<ContributedQuestion>>('/contributions/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMyQuestions: (params?: {
    page?: number;
    pageSize?: number;
    status?: 'pending' | 'approved' | 'rejected';
  }) =>
    baseFetch<ListResponse<ContributedQuestion>>(
      `/contributions/questions?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  getPending: (params?: { page?: number; pageSize?: number }) =>
    baseFetch<ListResponse<ContributedQuestion>>(
      `/contributions/questions/pending?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  approveQuestion: (id: number) =>
    baseFetch<ApiResponse<ContributedQuestion>>(`/contributions/questions/${id}/approve`, {
      method: 'POST',
    }),
  rejectQuestion: (id: number, reviewNote?: string) =>
    baseFetch<ApiResponse<ContributedQuestion>>(`/contributions/questions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reviewNote }),
    }),
  getRankings: (params?: { page?: number; pageSize?: number }) =>
    baseFetch<ListResponse<ContributorRankingItem>>(
      `/contributions/rankings?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  getPlayerStats: (playerId: string) =>
    baseFetch<ApiResponse<{
      submitted: number;
      approved: number;
      pending: number;
      rejected: number;
      usedCount: number;
    }>>(`/contributions/player/${playerId}/stats`),
};

export const teamApi = {
  create: (data: { playerId: string; name: string; avatar?: string; description?: string }) =>
    baseFetch<ApiResponse<Team>>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getList: (params?: { page?: number; pageSize?: number; search?: string }) =>
    baseFetch<ListResponse<Team>>(
      `/teams?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  getById: (id: number) => baseFetch<ApiResponse<Team>>(`/teams/${id}`),
  getMembers: (id: number) => baseFetch<ListResponse<TeamMember>>(`/teams/${id}/members`),
  join: (id: number, playerId: string) =>
    baseFetch<ApiResponse<TeamMember>>(`/teams/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    }),
  leave: (id: number, playerId: string) =>
    baseFetch<ApiResponse<void>>(`/teams/${id}/leave`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    }),
  kick: (id: number, playerId: string, operatorId: string) =>
    baseFetch<ApiResponse<void>>(`/teams/${id}/kick/${playerId}`, {
      method: 'POST',
      body: JSON.stringify({ operatorId }),
    }),
  getRankings: (params?: { page?: number; pageSize?: number }) =>
    baseFetch<ListResponse<TeamRankingItem>>(
      `/teams/rankings?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  createMatch: (team1Id: number, team2Id: number) =>
    baseFetch<ApiResponse<TeamMatch>>('/teams/matches', {
      method: 'POST',
      body: JSON.stringify({ team1Id, team2Id }),
    }),
  getMatches: (params?: {
    page?: number;
    pageSize?: number;
    status?: 'pending' | 'playing' | 'finished' | 'cancelled';
  }) =>
    baseFetch<ListResponse<TeamMatch>>(
      `/teams/matches?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),
  startMatch: (id: number, operatorId: string) =>
    baseFetch<ApiResponse<TeamMatch>>(`/teams/matches/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ operatorId }),
    }),
  getPlayerTeam: (playerId: string) =>
    baseFetch<ApiResponse<{ team: Team; role: string } | null>>(`/teams/player/${playerId}`),
};
