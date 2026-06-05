import db from '../db/database.js';
import type { Question, CreateQuestionRequest, Category } from '../../../shared/types.js';
import type { DatabaseQuestion, PaginatedResult } from '../types/index.js';

const rowToQuestion = (row: any): Question => ({
  id: row.id,
  text: row.text,
  options: [row.option_a, row.option_b, row.option_c, row.option_d],
  correctAnswer: row.correct_answer,
  difficulty: row.difficulty,
  category: row.category,
  analysis: row.analysis || '',
  usageCount: row.usage_count,
  correctCount: row.correct_count,
  createdAt: row.created_at,
});

const rowToDatabaseQuestion = (row: any): DatabaseQuestion => ({
  id: row.id,
  text: row.text,
  options: [row.option_a, row.option_b, row.option_c, row.option_d],
  correctAnswer: row.correct_answer,
  difficulty: row.difficulty,
  category: row.category,
  analysis: row.analysis,
  usageCount: row.usage_count,
  correctCount: row.correct_count,
  createdAt: row.created_at,
});

export const QuestionService = {
  getList(params: {
    page: number;
    pageSize: number;
    category?: Category;
    difficulty?: number;
    keyword?: string;
  }): PaginatedResult<Question> {
    const { page, pageSize, category, difficulty, keyword } = params;
    const offset = (page - 1) * pageSize;

    const whereClauses: string[] = [];
    const queryParams: any[] = [];

    if (category) {
      whereClauses.push('category = ?');
      queryParams.push(category);
    }
    if (difficulty) {
      whereClauses.push('difficulty = ?');
      queryParams.push(difficulty);
    }
    if (keyword) {
      whereClauses.push('text LIKE ?');
      queryParams.push(`%${keyword}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM questions ${whereSql}`);
    const total = (countStmt.get(...queryParams) as { count: number }).count;

    const stmt = db.prepare(`
      SELECT * FROM questions ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...queryParams, pageSize, offset) as any[];

    return {
      items: rows.map(rowToQuestion),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getById(id: number): Question | null {
    const stmt = db.prepare('SELECT * FROM questions WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? rowToQuestion(row) : null;
  },

  create(data: CreateQuestionRequest): Question {
    const stmt = db.prepare(`
      INSERT INTO questions (text, option_a, option_b, option_c, option_d, correct_answer, difficulty, category, analysis)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.text,
      data.options[0],
      data.options[1],
      data.options[2],
      data.options[3],
      data.correctAnswer,
      data.difficulty,
      data.category,
      data.analysis
    );
    return QuestionService.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: CreateQuestionRequest): Question | null {
    const stmt = db.prepare(`
      UPDATE questions
      SET text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
          correct_answer = ?, difficulty = ?, category = ?, analysis = ?
      WHERE id = ?
    `);
    const result = stmt.run(
      data.text,
      data.options[0],
      data.options[1],
      data.options[2],
      data.options[3],
      data.correctAnswer,
      data.difficulty,
      data.category,
      data.analysis,
      id
    );
    return result.changes > 0 ? QuestionService.getById(id) : null;
  },

  remove(id: number): boolean {
    const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  batchImport(questions: CreateQuestionRequest[]): Question[] {
    const insertStmt = db.prepare(`
      INSERT INTO questions (text, option_a, option_b, option_c, option_d, correct_answer, difficulty, category, analysis)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items: CreateQuestionRequest[]) => {
      const ids: number[] = [];
      for (const q of items) {
        const result = insertStmt.run(
          q.text,
          q.options[0],
          q.options[1],
          q.options[2],
          q.options[3],
          q.correctAnswer,
          q.difficulty,
          q.category,
          q.analysis
        );
        ids.push(result.lastInsertRowid as number);
      }
      return ids;
    });

    const ids = insertMany(questions);
    return ids.map(id => QuestionService.getById(id)!).filter(Boolean);
  },

  getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM questions');
    const total = (totalStmt.get() as { count: number }).count;

    const usageStmt = db.prepare('SELECT SUM(usage_count) as total FROM questions');
    const totalUsage = (usageStmt.get() as { total: number }).total || 0;

    const correctStmt = db.prepare('SELECT SUM(correct_count) as correct, SUM(usage_count) as usage FROM questions');
    const correctRow = correctStmt.get() as { correct: number; usage: number };
    const avgAccuracy = correctRow.usage > 0 ? Math.round((correctRow.correct / correctRow.usage) * 100) : 0;

    const categoryStmt = db.prepare('SELECT category, COUNT(*) as count FROM questions GROUP BY category');
    const categoryStats = categoryStmt.all() as { category: Category; count: number }[];

    const difficultyStmt = db.prepare('SELECT difficulty, COUNT(*) as count FROM questions GROUP BY difficulty');
    const difficultyStats = difficultyStmt.all() as { difficulty: number; count: number }[];

    return {
      total,
      totalUsage,
      avgAccuracy,
      byCategory: categoryStats.reduce((acc, item) => {
        acc[item.category] = item.count;
        return acc;
      }, {} as Record<Category, number>),
      byDifficulty: difficultyStats.reduce((acc, item) => {
        acc[item.difficulty] = item.count;
        return acc;
      }, {} as Record<number, number>),
    };
  },

  getRandomQuestions(params: {
    count: number;
    categories?: Category[];
    minDifficulty?: number;
    maxDifficulty?: number;
  }): DatabaseQuestion[] {
    const { count, categories, minDifficulty = 1, maxDifficulty = 5 } = params;

    const whereClauses: string[] = ['difficulty BETWEEN ? AND ?'];
    const queryParams: any[] = [minDifficulty, maxDifficulty];

    if (categories && categories.length > 0) {
      const placeholders = categories.map(() => '?').join(',');
      whereClauses.push(`category IN (${placeholders})`);
      queryParams.push(...categories);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const stmt = db.prepare(`
      SELECT * FROM questions ${whereSql}
      ORDER BY RANDOM()
      LIMIT ?
    `);
    const rows = stmt.all(...queryParams, count) as any[];

    return rows.map(rowToDatabaseQuestion);
  },

  incrementUsage(id: number, isCorrect: boolean): void {
    const stmt = db.prepare(`
      UPDATE questions
      SET usage_count = usage_count + 1,
          correct_count = correct_count + ?
      WHERE id = ?
    `);
    stmt.run(isCorrect ? 1 : 0, id);
  },
};

export default QuestionService;
