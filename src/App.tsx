import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AchievementUnlockModal } from '@/components/AchievementUnlockModal';
import { useUserStore } from '@/stores/useUserStore';
import { connectSocket } from '@/socket';
import { useSocketEvents } from '@/hooks/useSocketEvents';
import Home from '@/pages/Home';
import Lobby from '@/pages/Lobby';
import RoomWait from '@/pages/RoomWait';
import GamePlay from '@/pages/GamePlay';
import GameResult from '@/pages/GameResult';
import WatchGame from '@/pages/WatchGame';
import QuestionManage from '@/pages/QuestionManage';
import Profile from '@/pages/Profile';
import Rankings from '@/pages/Rankings';
import Replay from '@/pages/Replay';
import Teams from '@/pages/Teams';
import Seasons from '@/pages/Seasons';
import Friends from '@/pages/Friends';
import Achievements from '@/pages/Achievements';
import Contributions from '@/pages/Contributions';

export default function App() {
  const { nickname, playerId } = useUserStore();

  useEffect(() => {
    if (nickname && nickname.trim().length > 0 && playerId) {
      connectSocket(playerId);
    }
  }, [nickname, playerId]);

  useSocketEvents();

  return (
    <Router>
      <AchievementUnlockModal />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/questions" element={<QuestionManage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/seasons" element={<Seasons />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/teams" element={<Teams />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/room/:code" element={<RoomWait />} />
          <Route path="/game/:code" element={<GamePlay />} />
          <Route path="/result/:code" element={<GameResult />} />
          <Route path="/watch/:code" element={<WatchGame />} />
          <Route path="/replay/:recordId" element={<Replay />} />
        </Route>
      </Routes>
    </Router>
  );
}
