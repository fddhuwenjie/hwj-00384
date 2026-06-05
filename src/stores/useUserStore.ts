import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  playerId: string | null;
  nickname: string;
  avatar: string;
  setPlayerId: (playerId: string) => void;
  setNickname: (nickname: string) => void;
  setAvatar: (avatar: string) => void;
  resetUser: () => void;
}

const AVATARS = ['👤', '🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎪', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯', '🐸', '🦄'];

const getRandomAvatar = () => AVATARS[Math.floor(Math.random() * AVATARS.length)];

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      playerId: null,
      nickname: '',
      avatar: getRandomAvatar(),
      setPlayerId: (playerId) => set({ playerId }),
      setNickname: (nickname) => set({ nickname }),
      setAvatar: (avatar) => set({ avatar }),
      resetUser: () => set({ playerId: null, nickname: '', avatar: getRandomAvatar() }),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        playerId: state.playerId,
        nickname: state.nickname,
        avatar: state.avatar,
      }),
    }
  )
);
