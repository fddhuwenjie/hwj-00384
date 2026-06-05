export type Category = 'technology' | 'history' | 'geography' | 'literature' | 'sports' | 'entertainment';

export const CATEGORIES: Category[] = ['technology', 'history', 'geography', 'literature', 'sports', 'entertainment'];

export const CATEGORY_LABELS: Record<Category, string> = {
  technology: '科技',
  history: '历史',
  geography: '地理',
  literature: '文学',
  sports: '体育',
  entertainment: '娱乐',
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: '简单',
  2: '较易',
  3: '中等',
  4: '较难',
  5: '困难',
};

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: number;
  category: Category;
  analysis: string;
  usageCount: number;
  correctCount: number;
  contributorId?: string;
  createdAt: string;
}

export interface CreateQuestionRequest {
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: number;
  category: Category;
  analysis: string;
}

export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  isReady: boolean;
  isOnline: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  questionCount: 5 | 10 | 20;
  timeLimit: 5 | 10 | 15;
  categories: Category[];
  minDifficulty: number;
  maxDifficulty: number;
  password?: string;
  gameMode?: 'normal' | 'team';
  teamId?: number;
  matchId?: number;
}

export interface Room {
  code: string;
  ownerId: string;
  players: Player[];
  settings: RoomSettings;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: string;
  hasPassword: boolean;
}

export interface ScoreDetail {
  questionId: number;
  isCorrect: boolean;
  responseTime: number;
  baseScore: number;
  speedBonus: number;
  streakBonus: number;
  firstBonus: number;
  totalScore: number;
}

export interface PlayerResult {
  playerId: string;
  nickname: string;
  score: number;
  rank: number;
  correctCount: number;
  avgResponseTime: number;
  maxStreak: number;
  scoreDetails: ScoreDetail[];
}

export interface GameRecord {
  id: number;
  roomCode: string;
  startTime: string;
  endTime: string;
  players: PlayerResult[];
  questionCount: number;
}

export interface UserStats {
  playerId: string;
  nickname: string;
  avatar?: string;
  totalGames: number;
  wins: number;
  winRate: number;
  bestCategory: Category;
  avgResponseTime: number;
  maxStreak: number;
  totalScore: number;
  seasonScore: number;
  isOnline: boolean;
  isInGame: boolean;
  contributedQuestions: number;
  contributedQuestionUsage: number;
  teamId?: number;
  teamRole?: string;
  rank: {
    weekly: number;
    monthly: number;
    allTime: number;
    season: number;
  };
}

export interface RankingItem {
  rank: number;
  playerId: string;
  nickname: string;
  avatar?: string;
  score: number;
  winRate: number;
  games: number;
}

export interface Season {
  id: number;
  name: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'frozen' | 'archived';
  createdAt: string;
}

export interface SeasonRankingItem {
  rank: number;
  playerId: string;
  nickname: string;
  avatar?: string;
  score: number;
  wins: number;
  games: number;
  winRate: number;
}

export interface Friend {
  playerId: string;
  nickname: string;
  avatar?: string;
  isOnline: boolean;
  isInGame: boolean;
  roomCode?: string;
  addedAt: string;
}

export interface FriendRequest {
  id: number;
  senderId: string;
  senderNickname: string;
  senderAvatar?: string;
  receiverId: string;
  receiverNickname: string;
  receiverAvatar?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
}

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  conditionType: string;
  conditionValue: number;
}

export interface PlayerAchievement {
  achievement: Achievement;
  unlockedAt: string;
}

export interface ContributedQuestion {
  id: number;
  contributorId: string;
  contributorNickname: string;
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: number;
  category: Category;
  analysis: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerId?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ContributorRankingItem {
  rank: number;
  playerId: string;
  nickname: string;
  avatar?: string;
  contributedCount: number;
  usedCount: number;
}

export interface Team {
  id: number;
  name: string;
  avatar?: string;
  description: string;
  ownerId: string;
  totalWins: number;
  totalLosses: number;
  totalScore: number;
  memberCount: number;
  createdAt: string;
}

export interface TeamMember {
  playerId: string;
  nickname: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface TeamMatch {
  id: number;
  team1: Team;
  team2: Team;
  team1Score: number;
  team2Score: number;
  winnerId?: number;
  roomCode?: string;
  status: 'pending' | 'playing' | 'finished' | 'cancelled';
  createdAt: string;
  finishedAt?: string;
}

export interface TeamRankingItem {
  rank: number;
  teamId: number;
  teamName: string;
  teamAvatar?: string;
  wins: number;
  losses: number;
  winRate: number;
  totalScore: number;
}

export interface QuestionResult {
  question: Question;
  playerAnswers: Record<string, { answer: number; responseTime: number }>;
}

export interface ReplayEvent {
  timestamp: number;
  type: 'question' | 'answer' | 'reveal' | 'score';
  data: any;
}

export interface DanmuMessage {
  id: string;
  nickname: string;
  content: string;
  color: string;
  timestamp: number;
}

export interface FriendInviteData {
  id: string;
  inviterId: string;
  inviterNickname: string;
  inviterAvatar?: string;
  roomCode: string;
  roomName?: string;
  expiresAt: number;
}

export interface ClientToServerEvents {
  'room:join': (data: { roomCode: string; playerId: string }) => void;
  'room:leave': (data: { roomCode: string; playerId: string }) => void;
  'room:playerUpdate': (data: { roomCode: string; player: Partial<Player> }) => void;
  
  'game:answer': (data: {
    roomCode: string;
    playerId: string;
    questionIndex: number;
    answer: number;
    responseTime: number;
  }) => void;
  
  'watch:join': (data: { roomCode: string; viewerId: string; nickname: string }) => void;
  'watch:leave': (data: { roomCode: string; viewerId: string }) => void;
  'watch:danmu': (data: {
    roomCode: string;
    viewerId: string;
    nickname: string;
    content: string;
    color?: string;
  }) => void;

  'user:online': (data: { playerId: string }) => void;
  'user:offline': (data: { playerId: string }) => void;
  
  'friend:invite': (data: { friendId: string; roomCode: string }) => void;
  'friend:invite:accept': (data: { inviteId: string }) => void;
  'friend:invite:decline': (data: { inviteId: string }) => void;
}

export interface ServerToClientEvents {
  'room:playerJoined': (data: { player: Player }) => void;
  'room:playerLeft': (data: { playerId: string }) => void;
  'room:playerKicked': (data: { playerId: string; reason: string }) => void;
  'room:settingsUpdated': (data: { settings: RoomSettings }) => void;
  'room:gameStarting': (data: { countdown: number }) => void;
  
  'game:started': (data: {
    totalQuestions: number;
    timeLimit: number;
  }) => void;
  'game:question': (data: {
    question: Question;
    questionIndex: number;
    startTime: number;
    endTime: number;
  }) => void;
  'game:playerAnswered': (data: {
    playerId: string;
    questionIndex: number;
    responseTime: number;
  }) => void;
  'game:reveal': (data: {
    questionIndex: number;
    correctAnswer: number;
    analysis: string;
    scores: Record<string, ScoreDetail>;
    standings: Player[];
  }) => void;
  'game:finished': (data: {
    recordId: number;
    finalStandings: PlayerResult[];
  }) => void;
  
  'watch:viewerJoined': (data: { viewerId: string; nickname: string; count: number }) => void;
  'watch:viewerLeft': (data: { viewerId: string; count: number }) => void;
  'watch:danmu': (data: DanmuMessage) => void;
  'watch:gameState': (data: {
    phase: 'waiting' | 'question' | 'reveal' | 'finished';
    question?: Question;
    questionIndex?: number;
    remainingTime?: number;
    playerStates: Record<string, { answered: boolean; score: number; streak: number }>;
  }) => void;

  'friend:request:received': (data: FriendRequest) => void;
  'friend:request:accepted': (data: Friend) => void;
  'friend:online': (data: { playerId: string }) => void;
  'friend:offline': (data: { playerId: string }) => void;
  'friend:game:start': (data: { playerId: string; roomCode: string }) => void;
  'friend:game:end': (data: { playerId: string }) => void;

  'friend:invite:received': (data: FriendInviteData) => void;

  'achievement:unlocked': (data: {
    achievement: Achievement;
    unlockedAt: string;
  }) => void;

  'notification': (data: {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    createdAt: number;
  }) => void;
}
