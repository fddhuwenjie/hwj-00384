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
  totalGames: number;
  wins: number;
  winRate: number;
  bestCategory: Category;
  avgResponseTime: number;
  maxStreak: number;
  totalScore: number;
  rank: {
    weekly: number;
    monthly: number;
    allTime: number;
  };
}

export interface RankingItem {
  rank: number;
  playerId: string;
  nickname: string;
  score: number;
  winRate: number;
  games: number;
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
}
