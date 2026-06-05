import { create } from 'zustand';
import type { Room, Player, RoomSettings, GamePhase, Question } from '@/types';

interface PlayerAnswer {
  playerId: string;
  answer: number;
  responseTime: number;
  timestamp: number;
}

interface RoomState {
  room: Room | null;
  players: Player[];
  settings: RoomSettings | null;
  gamePhase: GamePhase;
  currentQuestionIndex: number;
  currentQuestion: Question | null;
  playerAnswers: PlayerAnswer[];
  answeredPlayers: string[];
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  setSettings: (settings: RoomSettings) => void;
  setGamePhase: (phase: GamePhase) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setCurrentQuestion: (question: Question | null) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  addAnsweredPlayer: (playerId: string, answer: number, responseTime: number) => void;
  clearAnsweredPlayers: () => void;
  resetRoom: () => void;
}

const defaultSettings: RoomSettings = {
  maxPlayers: 4,
  questionCount: 10,
  timeLimit: 10,
  categories: [],
  minDifficulty: 1,
  maxDifficulty: 5,
};

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  players: [],
  settings: defaultSettings,
  gamePhase: 'waiting',
  currentQuestionIndex: 0,
  currentQuestion: null,
  playerAnswers: [],
  answeredPlayers: [],
  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  setSettings: (settings) => set({ settings }),
  setGamePhase: (gamePhase) => set({ gamePhase }),
  setCurrentQuestionIndex: (currentQuestionIndex) => set({ currentQuestionIndex }),
  setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),
  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),
  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),
  updatePlayer: (playerId, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      ),
    })),
  addAnsweredPlayer: (playerId, answer, responseTime) =>
    set((state) => ({
      answeredPlayers: [...state.answeredPlayers, playerId],
      playerAnswers: [...state.playerAnswers, { playerId, answer, responseTime, timestamp: Date.now() }],
    })),
  clearAnsweredPlayers: () =>
    set({
      answeredPlayers: [],
      playerAnswers: [],
    }),
  resetRoom: () =>
    set({
      room: null,
      players: [],
      settings: defaultSettings,
      gamePhase: 'waiting',
      currentQuestionIndex: 0,
      currentQuestion: null,
      playerAnswers: [],
      answeredPlayers: [],
    }),
}));
