import { Router, type Request, type Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import TeamService from '../services/TeamService.js';
import type { Team, TeamMember, TeamMatch, TeamRankingItem } from '../../../shared/types.js';

const router = Router();

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { playerId, name, avatar, description } = req.body;

  if (!playerId || !name) {
    throw createError('缺少必要参数: playerId 和 name', 400);
  }

  if (name.length < 2 || name.length > 20) {
    throw createError('战队名称长度必须在2-20个字符之间', 400);
  }

  let team: Team;
  try {
    team = TeamService.createTeam(playerId, name, avatar, description);
  } catch (error) {
    if (error instanceof Error) {
      throw createError(error.message, 400);
    }
    throw error;
  }

  res.status(201).json(team);
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20, search } = req.query;

  const pageNum = Number(page);
  const size = Number(pageSize);

  if (pageNum < 1 || size < 1) {
    throw createError('分页参数无效', 400);
  }

  const result = TeamService.getTeams(
    { page: pageNum, pageSize: size },
    search as string | undefined
  );

  res.json(result);
}));

router.get('/rankings', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20 } = req.query;

  const pageNum = Number(page);
  const size = Number(pageSize);

  if (pageNum < 1 || size < 1) {
    throw createError('分页参数无效', 400);
  }

  const result = TeamService.getRankings({ page: pageNum, pageSize: size });

  res.json(result);
}));

router.get('/player/:playerId', asyncHandler(async (req: Request, res: Response) => {
  const { playerId } = req.params;

  const team = TeamService.getPlayerTeam(playerId);

  res.json({ team });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const teamId = Number(id);

  if (isNaN(teamId)) {
    throw createError('无效的战队ID', 400);
  }

  const team = TeamService.getTeamById(teamId);
  if (!team) {
    throw createError('战队不存在', 404);
  }

  res.json(team);
}));

router.get('/:id/members', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const teamId = Number(id);

  if (isNaN(teamId)) {
    throw createError('无效的战队ID', 400);
  }

  const members = TeamService.getTeamMembers(teamId);

  res.json({ members });
}));

router.post('/:id/join', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { playerId } = req.body;
  const teamId = Number(id);

  if (isNaN(teamId)) {
    throw createError('无效的战队ID', 400);
  }

  if (!playerId) {
    throw createError('缺少必要参数: playerId', 400);
  }

  let member: TeamMember;
  try {
    member = TeamService.joinTeam(teamId, playerId);
  } catch (error) {
    if (error instanceof Error) {
      throw createError(error.message, 400);
    }
    throw error;
  }

  res.status(201).json(member);
}));

router.post('/:id/leave', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { playerId } = req.body;
  const teamId = Number(id);

  if (isNaN(teamId)) {
    throw createError('无效的战队ID', 400);
  }

  if (!playerId) {
    throw createError('缺少必要参数: playerId', 400);
  }

  try {
    TeamService.leaveTeam(teamId, playerId);
  } catch (error) {
    if (error instanceof Error) {
      throw createError(error.message, 400);
    }
    throw error;
  }

  res.json({ message: '已离开战队' });
}));

router.post('/:id/kick/:playerId', asyncHandler(async (req: Request, res: Response) => {
  const { id, playerId } = req.params;
  const { operatorId } = req.body;
  const teamId = Number(id);

  if (isNaN(teamId)) {
    throw createError('无效的战队ID', 400);
  }

  if (!operatorId) {
    throw createError('缺少必要参数: operatorId', 400);
  }

  try {
    TeamService.kickMember(teamId, playerId, operatorId);
  } catch (error) {
    if (error instanceof Error) {
      throw createError(error.message, 403);
    }
    throw error;
  }

  res.json({ message: '已踢出成员' });
}));

router.post('/matches', asyncHandler(async (req: Request, res: Response) => {
  const { team1Id, team2Id } = req.body;

  if (!team1Id || !team2Id) {
    throw createError('缺少必要参数: team1Id 和 team2Id', 400);
  }

  if (team1Id === team2Id) {
    throw createError('不能和自己战队比赛', 400);
  }

  let match: TeamMatch;
  try {
    match = TeamService.createMatch(Number(team1Id), Number(team2Id));
  } catch (error) {
    if (error instanceof Error) {
      throw createError(error.message, 400);
    }
    throw error;
  }

  res.status(201).json(match);
}));

router.get('/matches', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 20, status } = req.query;

  const pageNum = Number(page);
  const size = Number(pageSize);

  if (pageNum < 1 || size < 1) {
    throw createError('分页参数无效', 400);
  }

  const result = TeamService.getMatches(
    { page: pageNum, pageSize: size },
    status as string | undefined
  );

  res.json(result);
}));

router.post('/matches/:id/start', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { operatorId } = req.body;
  const matchId = Number(id);

  if (isNaN(matchId)) {
    throw createError('无效的比赛ID', 400);
  }

  if (!operatorId) {
    throw createError('缺少必要参数: operatorId', 400);
  }

  let result: { match: TeamMatch; team1Players: string[]; team2Players: string[] };
  try {
    result = TeamService.startMatch(matchId, operatorId);
  } catch (error) {
    if (error instanceof Error) {
      throw createError(error.message, 400);
    }
    throw error;
  }

  res.json(result);
}));

export default router;
