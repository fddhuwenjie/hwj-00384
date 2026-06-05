import db from '../db/database.js';
import type { CreateQuestionRequest, Category, ContributedQuestion, ContributorRankingItem } from '../../../shared/types.js';
import type { ContributedQuestionRow, PaginatedResult } from '../types/index.js';

const rowToContributedQuestion = (row: ContributedQuestionRow): ContributedQuestion => ({
  id: row.id,
  contributorId: row.contributor_id,
  contributorNickname: '',
  text: row.text,
  options: [row.option_a, row.option_b, row.option_c, row.option_d],
  correctAnswer: row.correct_answer,
  difficulty: row.difficulty,
  category: row.category,
  analysis: row.analysis,
  status: row.status,
  reviewerId: row.reviewer_id || undefined,
  reviewNote: row.review_note || undefined,
  reviewedAt: row.reviewed_at || undefined,
  createdAt: row.created_at,
});

export const ContributionService = {
  submitQuestion(contributorId: string, data: CreateQuestionRequest): ContributedQuestion {
    const stmt = db.prepare(`
      INSERT INTO contributed_questions (
        contributor_id, text, option_a, option_b, option_c, option_d,
        correct_answer, difficulty, category, analysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      contributorId,
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
    return ContributionService.getById(result.lastInsertRowid as number)!;
  },

  getById(id: number): ContributedQuestion | null {
    const stmt = db.prepare(`
      SELECT cq.*, us.nickname as contributor_nickname
      FROM contributed_questions cq
      LEFT JOIN user_stats us ON cq.contributor_id = us.player_id
      WHERE cq.id = ?
    `);
    const row = stmt.get(id) as (ContributedQuestionRow & { contributor_nickname: string }) | undefined;
    if (!row) return null;
    const question = rowToContributedQuestion(row);
    question.contributorNickname = row.contributor_nickname || '';
    return question;
  },

  getByContributor(contributorId: string, params: {
    page: number;
    pageSize: number;
    status?: string;
  }): PaginatedResult<ContributedQuestion> {
    const { page, pageSize, status } = params;
    const offset = (page - 1) * pageSize;

    const whereClauses: string[] = ['contributor_id = ?'];
    const queryParams: any[] = [contributorId];

    if (status) {
      whereClauses.push('status = ?');
      queryParams.push(status);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM contributed_questions ${whereSql}`);
    const total = (countStmt.get(...queryParams) as { count: number }).count;

    const stmt = db.prepare(`
      SELECT cq.*, us.nickname as contributor_nickname
      FROM contributed_questions cq
      LEFT JOIN user_stats us ON cq.contributor_id = us.player_id
      ${whereSql}
      ORDER BY cq.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...queryParams, pageSize, offset) as (ContributedQuestionRow & { contributor_nickname: string })[];

    return {
      items: rows.map(row => {
        const q = rowToContributedQuestion(row);
        q.contributorNickname = row.contributor_nickname || '';
        return q;
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getPending(params: {
    page: number;
    pageSize: number;
  }): PaginatedResult<ContributedQuestion> {
    const { page, pageSize } = params;
    const offset = (page - 1) * pageSize;

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM contributed_questions WHERE status = 'pending'`);
    const total = (countStmt.get() as { count: number }).count;

    const stmt = db.prepare(`
      SELECT cq.*, us.nickname as contributor_nickname
      FROM contributed_questions cq
      LEFT JOIN user_stats us ON cq.contributor_id = us.player_id
      WHERE cq.status = 'pending'
      ORDER BY cq.created_at ASC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(pageSize, offset) as (ContributedQuestionRow & { contributor_nickname: string })[];

    return {
      items: rows.map(row => {
        const q = rowToContributedQuestion(row);
        q.contributorNickname = row.contributor_nickname || '';
        return q;
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  approveQuestion(id: number, reviewerId: string, reviewNote?: string): { success: boolean; questionId?: number } {
    const pending = db.prepare('SELECT * FROM contributed_questions WHERE id = ? AND status = ?').get(id, 'pending') as ContributedQuestionRow | undefined;
    if (!pending) return { success: false };

    const insertQuestion = db.prepare(`
      INSERT INTO questions (
        text, option_a, option_b, option_c, option_d, correct_answer,
        difficulty, category, analysis, contributor_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateContributed = db.prepare(`
      UPDATE contributed_questions
      SET status = 'approved', reviewer_id = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const tx = db.transaction(() => {
      const questionResult = insertQuestion.run(
        pending.text,
        pending.option_a,
        pending.option_b,
        pending.option_c,
        pending.option_d,
        pending.correct_answer,
        pending.difficulty,
        pending.category,
        pending.analysis,
        pending.contributor_id
      );

      updateContributed.run(reviewerId, reviewNote || null, id);

      return questionResult.lastInsertRowid as number;
    });

    const questionId = tx();
    return { success: true, questionId };
  },

  rejectQuestion(id: number, reviewerId: string, reviewNote?: string): boolean {
    const pending = db.prepare('SELECT * FROM contributed_questions WHERE id = ? AND status = ?').get(id, 'pending') as ContributedQuestionRow | undefined;
    if (!pending) return false;

    const stmt = db.prepare(`
      UPDATE contributed_questions
      SET status = 'rejected', reviewer_id = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const result = stmt.run(reviewerId, reviewNote || null, id);
    return result.changes > 0;
  },

  getRankings(params: {
    page: number;
    pageSize: number;
  }): PaginatedResult<ContributorRankingItem> {
    const { page, pageSize } = params;
    const offset = (page - 1) * pageSize;

    const countStmt = db.prepare(`
      SELECT COUNT(DISTINCT contributor_id) as count
      FROM contributed_questions
      WHERE status = 'approved'
    `);
    const total = (countStmt.get() as { count: number }).count;

    const stmt = db.prepare(`
      SELECT 
        us.player_id,
        us.nickname,
        us.avatar,
        COUNT(DISTINCT cq.id) as contributed_count,
        COALESCE(SUM(q.usage_count), 0) as used_count
      FROM user_stats us
      LEFT JOIN contributed_questions cq ON us.player_id = cq.contributor_id AND cq.status = 'approved'
      LEFT JOIN questions q ON cq.contributor_id = q.contributor_id
      WHERE cq.id IS NOT NULL
      GROUP BY us.player_id
      ORDER BY contributed_count DESC, used_count DESC, us.created_at ASC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(pageSize, offset) as {
      player_id: string;
      nickname: string;
      avatar: string | null;
      contributed_count: number;
      used_count: number;
    }[];

    return {
      items: rows.map((row, index) => ({
        rank: offset + index + 1,
        playerId: row.player_id,
        nickname: row.nickname,
        avatar: row.avatar || undefined,
        contributedCount: row.contributed_count,
        usedCount: row.used_count,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getPlayerStats(playerId: string): {
    contributedCount: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    usedCount: number;
  } {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM contributed_questions
      WHERE contributor_id = ?
    `);
    const counts = stmt.get(playerId) as {
      total: number;
      approved: number;
      pending: number;
      rejected: number;
    };

    const usageStmt = db.prepare(`
      SELECT COALESCE(SUM(usage_count), 0) as used_count
      FROM questions
      WHERE contributor_id = ?
    `);
    const usage = usageStmt.get(playerId) as { used_count: number };

    return {
      contributedCount: counts.total || 0,
      approvedCount: counts.approved || 0,
      pendingCount: counts.pending || 0,
      rejectedCount: counts.rejected || 0,
      usedCount: usage.used_count || 0,
    };
  },
};

export default ContributionService;
