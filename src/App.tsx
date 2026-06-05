import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useUserStore } from '@/stores/useUserStore';
import { connectSocket } from '@/socket';
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

export default function App() {
  const { nickname } = useUserStore();

  useEffect(() => {
    if (nickname && nickname.trim().length > 0) {
      connectSocket();
    }
  }, [nickname]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/questions" element={<QuestionManage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/rankings" element={<Rankings />} />
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
