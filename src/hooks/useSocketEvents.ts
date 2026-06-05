import { useEffect } from 'react';
import { useSocket } from '@/socket/useSocket';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type { FriendRequest, FriendInviteData, Achievement } from '@/types';

export function useSocketEvents() {
  const { bindEvents, isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected) return;

    const cleanup = bindEvents({
      'achievement:unlocked': (data: { achievement: Achievement; unlockedAt: string }) => {
        useNotificationStore.getState().setCurrentAchievement(data);
      },

      'friend:online': (data: { playerId: string }) => {
        console.log('Friend online:', data.playerId);
      },

      'friend:offline': (data: { playerId: string }) => {
        console.log('Friend offline:', data.playerId);
      },

      'friend:invite:received': (data: FriendInviteData) => {
        useNotificationStore.getState().addFriendInvite(data);
      },

      'friend:request:received': (data: FriendRequest) => {
        const state = useNotificationStore.getState();
        state.addFriendRequest(data);
        state.addNotification({
          id: `request-${data.id}`,
          type: 'info',
          title: '新的好友请求',
          message: `${data.senderNickname} 向你发送了好友请求`,
          createdAt: Date.now(),
        });
      },

      'notification': (data: {
        id: string;
        type: 'info' | 'success' | 'warning' | 'error';
        title: string;
        message: string;
        createdAt: number;
      }) => {
        useNotificationStore.getState().addNotification(data);
      },
    });

    return cleanup;
  }, [isConnected, bindEvents]);
}
