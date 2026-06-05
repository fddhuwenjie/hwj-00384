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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      question_count INTEGER NOT NULL,
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
      total_games INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      total_correct INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      avg_response_time REAL DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      last_played_at DATETIME,
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

    CREATE INDEX IF NOT EXISTS idx_game_records_room_code ON game_records(room_code);
    CREATE INDEX IF NOT EXISTS idx_player_records_game_id ON player_records(game_id);
    CREATE INDEX IF NOT EXISTS idx_player_records_player_id ON player_records(player_id);
    CREATE INDEX IF NOT EXISTS idx_question_records_game_id ON question_records(game_id);
    CREATE INDEX IF NOT EXISTS idx_answer_records_question_record_id ON answer_records(question_record_id);
    CREATE INDEX IF NOT EXISTS idx_answer_records_player_id ON answer_records(player_id);
    CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
    CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
    CREATE INDEX IF NOT EXISTS idx_user_stats_player_id ON user_stats(player_id);
    CREATE INDEX IF NOT EXISTS idx_category_stats_player_id ON category_stats(player_id);
  `);
};

createTables();

export default db;
