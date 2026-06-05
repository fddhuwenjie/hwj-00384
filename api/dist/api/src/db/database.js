import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../data/quiz.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
const createTables = () => {
    db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
      difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
      category TEXT NOT NULL,
      analysis TEXT,
      usage_count INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      contributor_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contributor_id) REFERENCES user_stats(player_id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS game_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      question_count INTEGER NOT NULL,
      season_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar TEXT,
      final_score INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      avg_response_time REAL DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      rank_position INTEGER,
      FOREIGN KEY (game_id) REFERENCES game_records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS question_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      question_index INTEGER NOT NULL,
      correct_answer_count INTEGER DEFAULT 0,
      avg_response_time REAL DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES game_records(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS answer_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_record_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      selected_answer INTEGER CHECK (selected_answer BETWEEN 0 AND 3),
      is_correct INTEGER DEFAULT 0,
      response_time INTEGER NOT NULL,
      base_score INTEGER DEFAULT 0,
      speed_bonus INTEGER DEFAULT 0,
      streak_bonus INTEGER DEFAULT 0,
      first_bonus INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (question_record_id) REFERENCES question_records(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT UNIQUE NOT NULL,
      nickname TEXT NOT NULL,
      avatar TEXT,
      total_games INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      season_score INTEGER DEFAULT 0,
      total_correct INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      avg_response_time REAL DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      last_played_at DATETIME,
      is_online INTEGER DEFAULT 0,
      is_in_game INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS category_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      category TEXT NOT NULL,
      total_questions INTEGER DEFAULT 0,
      correct_questions INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      avg_response_time REAL DEFAULT 0,
      UNIQUE(player_id, category),
      FOREIGN KEY (player_id) REFERENCES user_stats(player_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'archived')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year, month)
    );

    CREATE TABLE IF NOT EXISTS season_rankings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar TEXT,
      rank_position INTEGER NOT NULL,
      score INTEGER NOT NULL,
      wins INTEGER NOT NULL,
      games INTEGER NOT NULL,
      win_rate REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
      UNIQUE(season_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES user_stats(player_id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES user_stats(player_id) ON DELETE CASCADE,
      UNIQUE(sender_id, receiver_id)
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id1 TEXT NOT NULL,
      player_id2 TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id1) REFERENCES user_stats(player_id) ON DELETE CASCADE,
      FOREIGN KEY (player_id2) REFERENCES user_stats(player_id) ON DELETE CASCADE,
      UNIQUE(player_id1, player_id2)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      condition_type TEXT NOT NULL,
      condition_value INTEGER NOT NULL,
      rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
      points INTEGER NOT NULL DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      achievement_id INTEGER NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES user_stats(player_id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE(player_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS contributed_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contributor_id TEXT NOT NULL,
      text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
      difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
      category TEXT NOT NULL,
      analysis TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewer_id TEXT,
      review_note TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contributor_id) REFERENCES user_stats(player_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      avatar TEXT,
      description TEXT,
      owner_id TEXT NOT NULL,
      total_wins INTEGER DEFAULT 0,
      total_losses INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES user_stats(player_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES user_stats(player_id) ON DELETE CASCADE,
      UNIQUE(player_id)
    );

    CREATE TABLE IF NOT EXISTS team_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team1_id INTEGER NOT NULL,
      team2_id INTEGER NOT NULL,
      team1_score INTEGER DEFAULT 0,
      team2_score INTEGER DEFAULT 0,
      winner_id INTEGER,
      room_code TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'finished', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS team_match_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      FOREIGN KEY (match_id) REFERENCES team_matches(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES user_stats(player_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_game_records_room_code ON game_records(room_code);
    CREATE INDEX IF NOT EXISTS idx_game_records_season_id ON game_records(season_id);
    CREATE INDEX IF NOT EXISTS idx_player_records_game_id ON player_records(game_id);
    CREATE INDEX IF NOT EXISTS idx_player_records_player_id ON player_records(player_id);
    CREATE INDEX IF NOT EXISTS idx_question_records_game_id ON question_records(game_id);
    CREATE INDEX IF NOT EXISTS idx_answer_records_question_record_id ON answer_records(question_record_id);
    CREATE INDEX IF NOT EXISTS idx_answer_records_player_id ON answer_records(player_id);
    CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
    CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
    CREATE INDEX IF NOT EXISTS idx_questions_contributor_id ON questions(contributor_id);
    CREATE INDEX IF NOT EXISTS idx_user_stats_player_id ON user_stats(player_id);
    CREATE INDEX IF NOT EXISTS idx_user_stats_nickname ON user_stats(nickname);
    CREATE INDEX IF NOT EXISTS idx_category_stats_player_id ON category_stats(player_id);
    CREATE INDEX IF NOT EXISTS idx_seasons_status ON seasons(status);
    CREATE INDEX IF NOT EXISTS idx_season_rankings_season_id ON season_rankings(season_id);
    CREATE INDEX IF NOT EXISTS idx_season_rankings_score ON season_rankings(score DESC);
    CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
    CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_player1 ON friendships(player_id1);
    CREATE INDEX IF NOT EXISTS idx_friendships_player2 ON friendships(player_id2);
    CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements(player_id);
    CREATE INDEX IF NOT EXISTS idx_contributed_questions_status ON contributed_questions(status);
    CREATE INDEX IF NOT EXISTS idx_contributed_questions_contributor ON contributed_questions(contributor_id);
    CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_matches_status ON team_matches(status);
  `);
};
createTables();
export default db;
