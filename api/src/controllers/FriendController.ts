import { Router, type Request, type Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { FriendService } from '../services/FriendService.js';
import { rooms } from './RoomController.js';
import type { FriendRequest } from '../../../shared/types.js';

const router = Router();

router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { nickname } = req.query;
  const { playerId } = req.headers;

  if (!playerId || typeof playerId !== 'string') {
    throw createError('Player ID is required', 401);
  }

  if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
    throw createError('Nickname search parameter is required', 400);
  }

  const results = FriendService.searchPlayers(playerId, nickname.trim());
  res.json(results);
}));

router.post('/requests', asyncHandler(async (req: Request, res: Response) => {
  const { receiverId } = req.body;
  const { playerId } = req.headers;

  if (!playerId || typeof playerId !== 'string') {
    throw createError('Player ID is required', 401);
  }

  if (!receiverId || typeof receiverId !== 'string') {
    throw createError('Receiver ID is required', 400);
  }

  try {
    const friendRequest = FriendService.sendFriendRequest(playerId, receiverId);
    res.status(201).json(friendRequest);
  } catch (error) {
    if (error instanceof Error) {
      throw createError(error.message, 400);
    }
    throw error;
  }
}));

router.get('/requests', asyncHandler(async (req: Request, res: Response) => {
  const { playerId } = req.headers;

  if (!playerId || typeof playerId !== 'string') {
    throw createError('Player ID is required', 401);
  }

  const requests = FriendService.getReceivedRequests(playerId);
  res.json(requests);
}));

router.post('/requests/:id/accept', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { playerId } = req.headers;

  if (!playerId || typeof playerId !== 'string') {
    throw createError('Player ID is required', 401);
  }

  const requestId = Number(id);
  if (isNaN(requestId)) {
    throw createError('Invalid request ID', 400);
  }

  try {
    const friend = FriendService.acceptFriendRequest(requestId, playerId);
    res.json(friend);
  } catch (error) {
    if (error instanceof Error) {
      throw createError(error.message, 400);
    }
    throw error;
  }
}));

router.post('/requests/:id/reject', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { playerId } = req.headers;

  if (!playerId || typeof playerId !== 'string') {
    throw createError('Player ID is required', 401);
  }

  const requestId = Number(id);
  if (isNaN(requestId)) {
    throw createError('Invalid request ID', 400);
  }

  try {
    FriendService.rejectFriendRequest(requestId, playerId);
    res.json({ success: true, message: 'Friend request rejected' });
  } catch (error) {
    if (error instanceof Error) {
      throw createError(error.message, 400);
    }
    throw error;
  }
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { playerId } = req.headers;

  if (!playerId || typeof playerId !== 'string') {
    throw createError('Player ID is required', 401);
  }

  const friends = FriendService.getFriends(playerId, rooms);
  res.json(friends);
}));

router.delete('/:playerId', asyncHandler(async (req: Request, res: Response) => {
  const { playerId: friendId } = req.params;
  const { playerId } = req.headers;

  if (!playerId || typeof playerId !== 'string') {
    throw createError('Player ID is required', 401);
  }

  try {
    FriendService.removeFriend(playerId, friendId);
    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    if (error instanceof Error) {
      throw createError(error.message, 400);
    }
    throw error;
  }
}));

export default router;
