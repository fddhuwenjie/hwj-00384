import { create } from 'zustand';
import type { FriendRequest, FriendInviteData, Achievement } from '@/types';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  createdAt: number;
}

interface NotificationState {
  friendInvites: FriendInviteData[];
  friendRequests: FriendRequest[];
  notifications: Notification[];
  currentAchievement: { achievement: Achievement; unlockedAt: string } | null;
  addFriendInvite: (invite: FriendInviteData) => void;
  removeFriendInvite: (inviteId: string) => void;
  addFriendRequest: (request: FriendRequest) => void;
  removeFriendRequest: (id: number) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  setCurrentAchievement: (data: { achievement: Achievement; unlockedAt: string } | null) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  friendInvites: [],
  friendRequests: [],
  notifications: [],
  currentAchievement: null,

  addFriendInvite: (invite) =>
    set((state) => ({
      friendInvites: [...state.friendInvites, invite],
    })),

  removeFriendInvite: (inviteId) =>
    set((state) => ({
      friendInvites: state.friendInvites.filter((i) => i.id !== inviteId),
    })),

  addFriendRequest: (request) =>
    set((state) => ({
      friendRequests: [...state.friendRequests, request],
    })),

  removeFriendRequest: (id) =>
    set((state) => ({
      friendRequests: state.friendRequests.filter((r) => r.id !== id),
    })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  setCurrentAchievement: (data) =>
    set({ currentAchievement: data }),

  clearAll: () =>
    set({
      friendInvites: [],
      friendRequests: [],
      notifications: [],
      currentAchievement: null,
    }),
}));
