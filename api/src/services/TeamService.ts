import db from '../db/database.js';
import type { Team, TeamMember, TeamMatch, TeamRankingItem } from '../../../shared/types.js';
import type { TeamRow, TeamMemberRow, TeamMatchRow, PaginatedResult } from '../types/index.js';
import generateRoomCode from '../utils/generateRoomCode.js';

const MIN_TEAM_SIZE = 2;
const MAX_TEAM_SIZE = 10;
const TEAM_MATCH_PLAYERS = 3;

const getMemberCount = (teamId: number): number => {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?');
  const result = stmt.get(teamId) as { count: number };
  return result.count;
};

const getTeamById = (id: number): TeamRow | undefined => {
  const stmt = db.prepare('SELECT * FROM teams WHERE id = ?');
  return stmt.get(id) as TeamRow | undefined;
};

const getPlayerTeam = (playerId: string): TeamMemberRow | undefined => {
  const stmt = db.prepare('SELECT * FROM team_members WHERE player_id = ?');
  return stmt.get(playerId) as TeamMemberRow | undefined;
};

const mapToTeam = (row: TeamRow, memberCount: number): Team => ({
  id: row.id,
  name: row.name,
  avatar: row.avatar || undefined,
  description: row.description || '',
  ownerId: row.owner_id,
  totalWins: row.total_wins,
  totalLosses: row.total_losses,
  totalScore: row.total_score,
  memberCount,
  createdAt: row.created_at,
});

const mapToTeamMember = (row: TeamMemberRow & { nickname: string; avatar: string | null }): TeamMember => ({
  playerId: row.player_id,
  nickname: row.nickname,
  avatar: row.avatar || undefined,
  role: row.role,
  joinedAt: row.joined_at,
});

export const TeamService = {
  createTeam(playerId: string, name: string, avatar?: string, description?: string): Team {
    const existingTeam = getPlayerTeam(playerId);
    if (existingTeam) {
      throw new Error('您已经加入了一个战队');
    }

    const nameStmt = db.prepare('SELECT id FROM teams WHERE name = ?');
    const existingName = nameStmt.get(name) as { id: number } | undefined;
    if (existingName) {
      throw new Error('战队名称已存在');
    }

    const insertStmt = db.prepare(`
      INSERT INTO teams (name, avatar, description, owner_id)
      VALUES (?, ?, ?, ?)
    `);
    const result = insertStmt.run(name, avatar || null, description || null, playerId);
    const teamId = Number(result.lastInsertRowid);

    const memberStmt = db.prepare(`
      INSERT INTO team_members (team_id, player_id, role)
      VALUES (?, ?, 'owner')
    `);
    memberStmt.run(teamId, playerId);

    const team = getTeamById(teamId)!;
    return mapToTeam(team, 1);
  },

  getTeams(
    pagination?: { page: number; pageSize: number },
    search?: string
  ): PaginatedResult<Team> {
    const { page = 1, pageSize = 20 } = pagination || {};
    const offset = (page - 1) * pageSize;

    let whereSql = '';
    const params: any[] = [];

    if (search) {
      whereSql = 'WHERE t.name LIKE ?';
      params.push(`%${search}%`);
    }

    const countStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM teams t
      ${whereSql}
    `);
    const total = (countStmt.get(...params) as { count: number }).count;

    const stmt = db.prepare(`
      SELECT t.*, COUNT(tm.id) as member_count
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      ${whereSql}
      GROUP BY t.id
      ORDER BY t.total_score DESC, t.id ASC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...params, pageSize, offset) as Array<TeamRow & { member_count: number }>;

    const items: Team[] = rows.map((row) => mapToTeam(row, row.member_count));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getTeamById(id: number): Team | null {
    const team = getTeamById(id);
    if (!team) {
      return null;
    }
    const memberCount = getMemberCount(id);
    return mapToTeam(team, memberCount);
  },

  getTeamMembers(teamId: number): TeamMember[] {
    const stmt = db.prepare(`
      SELECT tm.*, us.nickname, us.avatar
      FROM team_members tm
      INNER JOIN user_stats us ON tm.player_id = us.player_id
      WHERE tm.team_id = ?
      ORDER BY CASE tm.role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        ELSE 3
      END, tm.joined_at ASC
    `);
    const rows = stmt.all(teamId) as Array<TeamMemberRow & { nickname: string; avatar: string | null }>;
    return rows.map(mapToTeamMember);
  },

  joinTeam(teamId: number, playerId: string): TeamMember {
    const existingTeam = getPlayerTeam(playerId);
    if (existingTeam) {
      throw new Error('您已经加入了一个战队');
    }

    const team = getTeamById(teamId);
    if (!team) {
      throw new Error('战队不存在');
    }

    const memberCount = getMemberCount(teamId);
    if (memberCount >= MAX_TEAM_SIZE) {
      throw new Error('战队人数已满');
    }

    const insertStmt = db.prepare(`
      INSERT INTO team_members (team_id, player_id, role)
      VALUES (?, ?, 'member')
    `);
    insertStmt.run(teamId, playerId);

    const stmt = db.prepare(`
      SELECT tm.*, us.nickname, us.avatar
      FROM team_members tm
      INNER JOIN user_stats us ON tm.player_id = us.player_id
      WHERE tm.team_id = ? AND tm.player_id = ?
    `);
    const row = stmt.get(teamId, playerId) as TeamMemberRow & { nickname: string; avatar: string | null };
    return mapToTeamMember(row);
  },

  leaveTeam(teamId: number, playerId: string): void {
    const membership = getPlayerTeam(playerId);
    if (!membership || membership.team_id !== teamId) {
      throw new Error('您不在该战队中');
    }

    const team = getTeamById(teamId);
    if (!team) {
      throw new Error('战队不存在');
    }

    if (membership.role === 'owner') {
      const memberCount = getMemberCount(teamId);
      if (memberCount > 1) {
        throw new Error('队长无法离开战队，请先转让队长或解散战队');
      }

      const deleteTeamStmt = db.prepare('DELETE FROM teams WHERE id = ?');
      deleteTeamStmt.run(teamId);
    }

    const deleteStmt = db.prepare('DELETE FROM team_members WHERE team_id = ? AND player_id = ?');
    deleteStmt.run(teamId, playerId);
  },

  kickMember(teamId: number, playerId: string, operatorId: string): void {
    const operatorMembership = getPlayerTeam(operatorId);
    if (!operatorMembership || operatorMembership.team_id !== teamId) {
      throw new Error('您不在该战队中');
    }
    if (operatorMembership.role !== 'owner' && operatorMembership.role !== 'admin') {
      throw new Error('您没有权限执行此操作');
    }

    const targetMembership = getPlayerTeam(playerId);
    if (!targetMembership || targetMembership.team_id !== teamId) {
      throw new Error('该玩家不在该战队中');
    }
    if (targetMembership.role === 'owner') {
      throw new Error('无法踢出队长');
    }
    if (operatorMembership.role === 'admin' && targetMembership.role === 'admin') {
      throw new Error('管理员无法踢出其他管理员');
    }

    const deleteStmt = db.prepare('DELETE FROM team_members WHERE team_id = ? AND player_id = ?');
    deleteStmt.run(teamId, playerId);
  },

  getRankings(
    pagination?: { page: number; pageSize: number }
  ): PaginatedResult<TeamRankingItem> {
    const { page = 1, pageSize = 20 } = pagination || {};
    const offset = (page - 1) * pageSize;

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM teams');
    const total = (countStmt.get() as { count: number }).count;

    const stmt = db.prepare(`
      SELECT t.*, COUNT(tm.id) as member_count
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      GROUP BY t.id
      ORDER BY t.total_score DESC, t.total_wins DESC, t.id ASC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(pageSize, offset) as Array<TeamRow & { member_count: number }>;

    const items: TeamRankingItem[] = rows.map((row, index) => ({
      rank: offset + index + 1,
      teamId: row.id,
      teamName: row.name,
      teamAvatar: row.avatar || undefined,
      wins: row.total_wins,
      losses: row.total_losses,
      winRate: row.total_wins + row.total_losses > 0
        ? Math.round((row.total_wins / (row.total_wins + row.total_losses)) * 100)
        : 0,
      totalScore: row.total_score,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  createMatch(team1Id: number, team2Id: number): TeamMatch {
    const team1 = getTeamById(team1Id);
    const team2 = getTeamById(team2Id);

    if (!team1 || !team2) {
      throw new Error('战队不存在');
    }

    const team1MemberCount = getMemberCount(team1Id);
    const team2MemberCount = getMemberCount(team2Id);

    if (team1MemberCount < MIN_TEAM_SIZE || team2MemberCount < MIN_TEAM_SIZE) {
      throw new Error('战队人数不足，至少需要2人');
    }

    const pendingMatchStmt = db.prepare(`
      SELECT id FROM team_matches
      WHERE (team1_id = ? OR team2_id = ? OR team1_id = ? OR team2_id = ?)
      AND status IN ('pending', 'playing')
    `);
    const pendingMatch = pendingMatchStmt.get(team1Id, team1Id, team2Id, team2Id) as { id: number } | undefined;
    if (pendingMatch) {
      throw new Error('该战队已有进行中的比赛');
    }

    const roomCode = generateRoomCode();

    const insertStmt = db.prepare(`
      INSERT INTO team_matches (team1_id, team2_id, room_code, status)
      VALUES (?, ?, ?, 'pending')
    `);
    const result = insertStmt.run(team1Id, team2Id, roomCode);
    const matchId = Number(result.lastInsertRowid);

    return TeamService.getMatchById(matchId)!;
  },

  getMatches(
    pagination?: { page: number; pageSize: number },
    status?: string
  ): PaginatedResult<TeamMatch> {
    const { page = 1, pageSize = 20 } = pagination || {};
    const offset = (page - 1) * pageSize;

    let whereSql = '';
    const params: any[] = [];

    if (status) {
      whereSql = 'WHERE tm.status = ?';
      params.push(status);
    }

    const countStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM team_matches tm
      ${whereSql}
    `);
    const total = (countStmt.get(...params) as { count: number }).count;

    const stmt = db.prepare(`
      SELECT tm.*
      FROM team_matches tm
      ${whereSql}
      ORDER BY tm.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(...params, pageSize, offset) as TeamMatchRow[];

    const items: TeamMatch[] = rows.map((row) => {
      const team1 = getTeamById(row.team1_id)!;
      const team2 = getTeamById(row.team2_id)!;
      const team1MemberCount = getMemberCount(row.team1_id);
      const team2MemberCount = getMemberCount(row.team2_id);

      return {
        id: row.id,
        team1: mapToTeam(team1, team1MemberCount),
        team2: mapToTeam(team2, team2MemberCount),
        team1Score: row.team1_score,
        team2Score: row.team2_score,
        winnerId: row.winner_id || undefined,
        roomCode: row.room_code || undefined,
        status: row.status,
        createdAt: row.created_at,
        finishedAt: row.finished_at || undefined,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  getMatchById(id: number): TeamMatch | null {
    const stmt = db.prepare('SELECT * FROM team_matches WHERE id = ?');
    const row = stmt.get(id) as TeamMatchRow | undefined;
    if (!row) {
      return null;
    }

    const team1 = getTeamById(row.team1_id)!;
    const team2 = getTeamById(row.team2_id)!;
    const team1MemberCount = getMemberCount(row.team1_id);
    const team2MemberCount = getMemberCount(row.team2_id);

    return {
      id: row.id,
      team1: mapToTeam(team1, team1MemberCount),
      team2: mapToTeam(team2, team2MemberCount),
      team1Score: row.team1_score,
      team2Score: row.team2_score,
      winnerId: row.winner_id || undefined,
      roomCode: row.room_code || undefined,
      status: row.status,
      createdAt: row.created_at,
      finishedAt: row.finished_at || undefined,
    };
  },

  startMatch(matchId: number, operatorId: string): { match: TeamMatch; team1Players: string[]; team2Players: string[] } {
    const matchStmt = db.prepare('SELECT * FROM team_matches WHERE id = ?');
    const match = matchStmt.get(matchId) as TeamMatchRow | undefined;
    if (!match) {
      throw new Error('比赛不存在');
    }
    if (match.status !== 'pending') {
      throw new Error('比赛状态不正确');
    }

    const operatorMembership = getPlayerTeam(operatorId);
    if (!operatorMembership || (operatorMembership.team_id !== match.team1_id && operatorMembership.team_id !== match.team2_id)) {
      throw new Error('您没有权限开始此比赛');
    }

    const team1PlayersStmt = db.prepare(`
      SELECT tm.player_id
      FROM team_members tm
      INNER JOIN user_stats us ON tm.player_id = us.player_id
      WHERE tm.team_id = ?
      ORDER BY us.total_score DESC
      LIMIT ?
    `);
    const team1Players = team1PlayersStmt.all(match.team1_id, TEAM_MATCH_PLAYERS) as Array<{ player_id: string }>;

    const team2PlayersStmt = db.prepare(`
      SELECT tm.player_id
      FROM team_members tm
      INNER JOIN user_stats us ON tm.player_id = us.player_id
      WHERE tm.team_id = ?
      ORDER BY us.total_score DESC
      LIMIT ?
    `);
    const team2Players = team2PlayersStmt.all(match.team2_id, TEAM_MATCH_PLAYERS) as Array<{ player_id: string }>;

    if (team1Players.length < TEAM_MATCH_PLAYERS || team2Players.length < TEAM_MATCH_PLAYERS) {
      throw new Error('参赛战队人数不足，至少需要3名成员');
    }

    const updateStmt = db.prepare(`
      UPDATE team_matches SET status = 'playing' WHERE id = ?
    `);
    updateStmt.run(matchId);

    const insertPlayerStmt = db.prepare(`
      INSERT INTO team_match_players (match_id, team_id, player_id)
      VALUES (?, ?, ?)
    `);

    for (const player of team1Players) {
      insertPlayerStmt.run(matchId, match.team1_id, player.player_id);
    }
    for (const player of team2Players) {
      insertPlayerStmt.run(matchId, match.team2_id, player.player_id);
    }

    const updatedMatch = TeamService.getMatchById(matchId)!;

    return {
      match: updatedMatch,
      team1Players: team1Players.map(p => p.player_id),
      team2Players: team2Players.map(p => p.player_id),
    };
  },

  getPlayerTeam(playerId: string): Team | null {
    const membership = getPlayerTeam(playerId);
    if (!membership) {
      return null;
    }
    return TeamService.getTeamById(membership.team_id);
  },

  updateMatchScore(matchId: number, team1Score: number, team2Score: number, winnerId: number): void {
    const updateStmt = db.prepare(`
      UPDATE team_matches
      SET team1_score = ?, team2_score = ?, winner_id = ?, status = 'finished', finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(team1Score, team2Score, winnerId, matchId);

    const matchStmt = db.prepare('SELECT * FROM team_matches WHERE id = ?');
    const match = matchStmt.get(matchId) as TeamMatchRow;

    const winnerTeamId = winnerId === 1 ? match.team1_id : match.team2_id;
    const loserTeamId = winnerId === 1 ? match.team2_id : match.team1_id;
    const winnerScore = winnerId === 1 ? team1Score : team2Score;
    const loserScore = winnerId === 1 ? team2Score : team1Score;

    const updateWinnerStmt = db.prepare(`
      UPDATE teams
      SET total_wins = total_wins + 1, total_score = total_score + ?
      WHERE id = ?
    `);
    updateWinnerStmt.run(winnerScore, winnerTeamId);

    const updateLoserStmt = db.prepare(`
      UPDATE teams
      SET total_losses = total_losses + 1, total_score = total_score + ?
      WHERE id = ?
    `);
    updateLoserStmt.run(loserScore, loserTeamId);
  },

  updatePlayerMatchStats(matchId: number, playerId: string, score: number, correctCount: number): void {
    const updateStmt = db.prepare(`
      UPDATE team_match_players
      SET score = score + ?, correct_count = correct_count + ?
      WHERE match_id = ? AND player_id = ?
    `);
    updateStmt.run(score, correctCount, matchId, playerId);
  },
};

export default TeamService;
