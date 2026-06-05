export type Category = 'technology' | 'history' | 'geography' | 'literature' | 'sports' | 'entertainment';

export interface QuestionRow {
  id: number;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: number;
  difficulty: number;
  category: Category;
  analysis: string | null;
  usage_count: number;
  correct_count: number;
  contributor_id: string | null;
  created_at: string;
}

export interface GameRecordRow {
  id: number;
  room_code: string;
  start_time: string;
  end_time: string | null;
  question_count: number;
  season_id: number | null;
  created_at: string;
}

export interface PlayerRecordRow {
  id: number;
  game_id: number;
  player_id: string;
  nickname: string;
  avatar: string | null;
  final_score: number;
  correct_count: number;
  avg_response_time: number;
  max_streak: number;
  rank_position: number | null;
}

export interface QuestionRecordRow {
  id: number;
  game_id: number;
  question_id: number;
  question_index: number;
  correct_answer_count: number;
  avg_response_time: number;
}

export interface AnswerRecordRow {
  id: number;
  question_record_id: number;
  player_id: string;
  selected_answer: number | null;
  is_correct: number;
  response_time: number;
  base_score: number;
  speed_bonus: number;
  streak_bonus: number;
  first_bonus: number;
  total_score: number;
  answered_at: string;
}

export interface UserStatsRow {
  id: number;
  player_id: string;
  nickname: string;
  avatar: string | null;
  total_games: number;
  wins: number;
  total_score: number;
  season_score: number;
  total_correct: number;
  total_questions: number;
  avg_response_time: number;
  max_streak: number;
  current_streak: number;
  last_played_at: string | null;
  is_online: number;
  is_in_game: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryStatsRow {
  id: number;
  player_id: string;
  category: Category;
  total_questions: number;
  correct_questions: number;
  total_score: number;
  avg_response_time: number;
}

export interface SeasonRow {
  id: number;
  name: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'frozen' | 'archived';
  created_at: string;
}

export interface SeasonRankingRow {
  id: number;
  season_id: number;
  player_id: string;
  nickname: string;
  avatar: string | null;
  rank_position: number;
  score: number;
  wins: number;
  games: number;
  win_rate: number;
  created_at: string;
}

export interface FriendRequestRow {
  id: number;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface FriendshipRow {
  id: number;
  player_id1: string;
  player_id2: string;
  created_at: string;
}

export interface AchievementRow {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  created_at: string;
}

export interface PlayerAchievementRow {
  id: number;
  player_id: string;
  achievement_id: number;
  unlocked_at: string;
}

export interface ContributedQuestionRow {
  id: number;
  contributor_id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: number;
  difficulty: number;
  category: Category;
  analysis: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface TeamRow {
  id: number;
  name: string;
  avatar: string | null;
  description: string | null;
  owner_id: string;
  total_wins: number;
  total_losses: number;
  total_score: number;
  created_at: string;
}

export interface TeamMemberRow {
  id: number;
  team_id: number;
  player_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface TeamMatchRow {
  id: number;
  team1_id: number;
  team2_id: number;
  team1_score: number;
  team2_score: number;
  winner_id: number | null;
  room_code: string | null;
  status: 'pending' | 'playing' | 'finished' | 'cancelled';
  created_at: string;
  finished_at: string | null;
}

export interface TeamMatchPlayerRow {
  id: number;
  match_id: number;
  team_id: number;
  player_id: string;
  score: number;
  correct_count: number;
}

export interface SeedQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: number;
  category: Category;
  analysis: string;
}

export interface ScoreCalculationParams {
  isCorrect: boolean;
  responseTime: number;
  timeLimit: number;
  streak: number;
  isFirstCorrect: boolean;
}

export interface ScoreBreakdown {
  baseScore: number;
  speedBonus: number;
  streakBonus: number;
  firstBonus: number;
  totalScore: number;
}

export interface DatabaseQuestion {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: number;
  category: Category;
  analysis: string | null;
  usageCount: number;
  correctCount: number;
  createdAt: string;
}

export interface CreateGameRecordData {
  roomCode: string;
  startTime: string;
  questionCount: number;
}

export interface CreatePlayerRecordData {
  gameId: number;
  playerId: string;
  nickname: string;
  avatar?: string | null;
}

export interface CreateQuestionRecordData {
  gameId: number;
  questionId: number;
  questionIndex: number;
}

export interface CreateAnswerRecordData {
  questionRecordId: number;
  playerId: string;
  selectedAnswer: number | null;
  isCorrect: boolean;
  responseTime: number;
  baseScore: number;
  speedBonus: number;
  streakBonus: number;
  firstBonus: number;
  totalScore: number;
}

export interface UpdatePlayerRecordData {
  finalScore: number;
  correctCount: number;
  avgResponseTime: number;
  maxStreak: number;
  rankPosition: number;
}

export interface UpdateUserStatsData {
  totalGames?: number;
  wins?: number;
  totalScore?: number;
  totalCorrect?: number;
  totalQuestions?: number;
  avgResponseTime?: number;
  maxStreak?: number;
  lastPlayedAt?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
