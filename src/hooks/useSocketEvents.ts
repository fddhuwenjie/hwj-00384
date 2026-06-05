import { useEffect } from 'react';
import { useSocket } from '@/socket/useSocket';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type { FriendRequest, FriendInviteData, Achievement } from '@/types';

export function useSocketEvents() {
  const { useEvents, isConnected } = useSocket();
  const {
    addFriendInvite,
    addFriendRequest,
    addNotification,
    setCurrentAchievement,
  } = useNotificationStore();

  useEffect(() => {
    if (!isConnected) return;

    const cleanup = useEvents({
      'achievement:unlocked': (data: { achievement: Achievement; unlockedAt: string }) => {
        setCurrentAchievement(data);
      },

      'friend:online': (data: { playerId: string }) => {
        console.log('Friend online:', data.playerId);
      },

      'friend:offline': (data: { playerId: string }) => {
        console.log('Friend offline:', data.playerId);
      },

      'friend:invite:received': (data: FriendInviteData) => {
        addFriendInvite(data);
      },

      'friend:request:received': (data: FriendRequest) => {
        addFriendRequest(data);
        addNotification({
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
        addNotification(data);
      },
    });

    return cleanup;
  }, [isConnected, useEvents, addFriendInvite, addFriendRequest, addNotification, setCurrentAchievement]);
}
