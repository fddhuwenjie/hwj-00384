import { Router } from 'express';
import db from '../db/database.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
const router = Router();
const mapRowToQuestion = (row) => {
    return {
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
    };
};
const mapRowToDatabaseQuestion = (row) => {
    return {
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
    };
};
router.get('/', asyncHandler(async (req, res) => {
    const { page = 1, pageSize = 20, category, difficulty, search, sortBy = 'created_at', sortOrder = 'desc', } = req.query;
    const pageNum = Number(page);
    const size = Number(pageSize);
    const offset = (pageNum - 1) * size;
    let whereConditions = [];
    let params = [];
    if (category) {
        whereConditions.push('category = ?');
        params.push(category);
    }
    if (difficulty) {
        whereConditions.push('difficulty = ?');
        params.push(Number(difficulty));
    }
    if (search) {
        whereConditions.push('text LIKE ?');
        params.push(`%${search}%`);
    }
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM questions ${whereClause}`);
    const { count } = countStmt.get(...params);
    const validSortFields = ['id', 'text', 'difficulty', 'category', 'usage_count', 'correct_count', 'created_at'];
    const orderBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const stmt = db.prepare(`
    SELECT * FROM questions ${whereClause}
    ORDER BY ${orderBy} ${order}
    LIMIT ? OFFSET ?
  `);
    const rows = stmt.all(...params, size, offset);
    const items = rows.map(mapRowToQuestion);
    const result = {
        items,
        total: count,
        page: pageNum,
        pageSize: size,
        totalPages: Math.ceil(count / size),
    };
    res.json(result);
}));
router.get('/stats', asyncHandler(async (req, res) => {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM questions');
    const { count: total } = totalStmt.get();
    const categoryStmt = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM questions
    GROUP BY category
  `);
    const categoryStats = categoryStmt.all();
    const difficultyStmt = db.prepare(`
    SELECT difficulty, COUNT(*) as count
    FROM questions
    GROUP BY difficulty
  `);
    const difficultyStats = difficultyStmt.all();
    const usageStmt = db.prepare(`
    SELECT 
      SUM(usage_count) as totalUsage,
      SUM(correct_count) as totalCorrect
    FROM questions
  `);
    const { totalUsage, totalCorrect } = usageStmt.get();
    res.json({
        total,
        totalUsage,
        totalCorrect,
        accuracyRate: totalUsage > 0 ? (totalCorrect / totalUsage).toFixed(4) : 0,
        byCategory: categoryStats,
        byDifficulty: difficultyStats,
    });
}));
router.get('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        throw createError('Invalid question ID', 400);
    }
    const stmt = db.prepare('SELECT * FROM questions WHERE id = ?');
    const row = stmt.get(id);
    if (!row) {
        throw createError('Question not found', 404);
    }
    const question = mapRowToQuestion(row);
    res.json(question);
}));
router.post('/', asyncHandler(async (req, res) => {
    const data = req.body;
    if (!data.text || !data.options || data.options.length !== 4 ||
        data.correctAnswer == null || data.difficulty == null || !data.category) {
        throw createError('Invalid question data', 400);
    }
    if (data.correctAnswer < 0 || data.correctAnswer > 3) {
        throw createError('Correct answer must be between 0 and 3', 400);
    }
    if (data.difficulty < 1 || data.difficulty > 5) {
        throw createError('Difficulty must be between 1 and 5', 400);
    }
    const stmt = db.prepare(`
    INSERT INTO questions (text, option_a, option_b, option_c, option_d, correct_answer, difficulty, category, analysis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const result = stmt.run(data.text, data.options[0], data.options[1], data.options[2], data.options[3], data.correctAnswer, data.difficulty, data.category, data.analysis || null);
    const selectStmt = db.prepare('SELECT * FROM questions WHERE id = ?');
    const row = selectStmt.get(result.lastInsertRowid);
    const question = mapRowToQuestion(row);
    res.status(201).json(question);
}));
router.put('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        throw createError('Invalid question ID', 400);
    }
    const checkStmt = db.prepare('SELECT * FROM questions WHERE id = ?');
    const existing = checkStmt.get(id);
    if (!existing) {
        throw createError('Question not found', 404);
    }
    const data = req.body;
    const updates = [];
    const params = [];
    if (data.text !== undefined) {
        updates.push('text = ?');
        params.push(data.text);
    }
    if (data.options !== undefined) {
        updates.push('option_a = ?', 'option_b = ?', 'option_c = ?', 'option_d = ?');
        params.push(...data.options);
    }
    if (data.correctAnswer !== undefined) {
        if (data.correctAnswer < 0 || data.correctAnswer > 3) {
            throw createError('Correct answer must be between 0 and 3', 400);
        }
        updates.push('correct_answer = ?');
        params.push(data.correctAnswer);
    }
    if (data.difficulty !== undefined) {
        if (data.difficulty < 1 || data.difficulty > 5) {
            throw createError('Difficulty must be between 1 and 5', 400);
        }
        updates.push('difficulty = ?');
        params.push(data.difficulty);
    }
    if (data.category !== undefined) {
        updates.push('category = ?');
        params.push(data.category);
    }
    if (data.analysis !== undefined) {
        updates.push('analysis = ?');
        params.push(data.analysis || null);
    }
    if (updates.length === 0) {
        const question = mapRowToQuestion(existing);
        res.json(question);
        return;
    }
    params.push(id);
    const updateStmt = db.prepare(`UPDATE questions SET ${updates.join(', ')} WHERE id = ?`);
    updateStmt.run(...params);
    const row = checkStmt.get(id);
    const question = mapRowToQuestion(row);
    res.json(question);
}));
router.delete('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        throw createError('Invalid question ID', 400);
    }
    const checkStmt = db.prepare('SELECT * FROM questions WHERE id = ?');
    const existing = checkStmt.get(id);
    if (!existing) {
        throw createError('Question not found', 404);
    }
    const deleteStmt = db.prepare('DELETE FROM questions WHERE id = ?');
    deleteStmt.run(id);
    res.json({ success: true, message: 'Question deleted' });
}));
router.post('/batch', asyncHandler(async (req, res) => {
    const questions = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
        throw createError('Invalid batch data', 400);
    }
    const insert = db.transaction((items) => {
        const stmt = db.prepare(`
      INSERT INTO questions (text, option_a, option_b, option_c, option_d, correct_answer, difficulty, category, analysis)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const ids = [];
        for (const item of items) {
            if (!item.text || !item.options || item.options.length !== 4 ||
                item.correctAnswer == null || item.difficulty == null || !item.category) {
                throw createError('Invalid question data in batch', 400);
            }
            const result = stmt.run(item.text, item.options[0], item.options[1], item.options[2], item.options[3], item.correctAnswer, item.difficulty, item.category, item.analysis || null);
            ids.push(Number(result.lastInsertRowid));
        }
        return ids;
    });
    const ids = insert(questions);
    const placeholders = ids.map(() => '?').join(',');
    const selectStmt = db.prepare(`SELECT * FROM questions WHERE id IN (${placeholders})`);
    const rows = selectStmt.all(...ids);
    const insertedQuestions = rows.map(mapRowToQuestion);
    res.status(201).json({
        inserted: insertedQuestions.length,
        questions: insertedQuestions,
    });
}));
export default router;
