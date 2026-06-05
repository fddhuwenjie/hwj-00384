import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Lock, Users, Clock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CreateRoomModal } from '@/components/CreateRoomModal';
import { JoinRoomModal } from '@/components/JoinRoomModal';
import { roomApi } from '@/api';
import { useUserStore } from '@/stores/useUserStore';
import { useRoomStore } from '@/stores/useRoomStore';
import type { Room } from '@/types';

export default function Lobby() {
  const navigate = useNavigate();
  const { nickname } = useUserStore();
  const setRoom = useRoomStore((s) => s.setRoom);
  const setPlayers = useRoomStore((s) => s.setPlayers);
  const setSettings = useRoomStore((s) => s.setSettings);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLoadingCode, setJoinLoadingCode] = useState<string | null>(null);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const response = await roomApi.getList({ pageSize: 20 });
      setRooms(response.items || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const filteredRooms = rooms.filter(
    (room) =>
      room.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.players.some((p) =>
        p.nickname.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleRoomClick = async (room: Room) => {
    if (joinLoadingCode) return;

    if (room.hasPassword) {
      setShowJoinModal(true);
      return;
    }

    setJoinLoadingCode(room.code);
    try {
      const response = await roomApi.join(room.code, {
        nickname: nickname || '玩家',
      });

      if (response.data) {
        setRoom(response.data);
        setPlayers(response.data.players);
        setSettings(response.data.settings);
        navigate(`/room/${response.data.code}`);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      if (error instanceof Error && error.message.includes('密码')) {
        setShowJoinModal(true);
      }
    } finally {
      setJoinLoadingCode(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-white">房间大厅</h1>
          <p className="text-slate-400 mt-1">选择一个房间加入，或创建新房间</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={loadRooms} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button variant="secondary" onClick={() => setShowJoinModal(true)}>
            <LogIn className="h-4 w-4 mr-2" />
            加入房间
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建房间
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="搜索房间号或玩家昵称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="text-xl font-semibold text-white mb-2">暂无房间</h3>
          <p className="text-slate-400 mb-6">还没有房间，创建第一个房间开始游戏吧！</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建房间
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <Card
              key={room.code}
              hover
              className={`cursor-pointer transition-all ${
                joinLoadingCode === room.code ? 'opacity-60' : ''
              }`}
              onClick={() => handleRoomClick(room)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">
                    房间 {room.code}
                    {joinLoadingCode === room.code && (
                      <RefreshCw className="h-4 w-4 inline ml-2 animate-spin text-violet-400" />
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={room.status === 'waiting' ? 'success' : 'warning'}>
                      {room.status === 'waiting' ? '等待中' : '游戏中'}
                    </Badge>
                    {room.hasPassword && (
                      <Badge variant="default">
                        <Lock className="h-3 w-3 mr-1" />
                        密码
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{room.players.length}/{room.settings.maxPlayers}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-400">
                    {room.settings.questionCount}题 · {room.settings.timeLimit}秒/题
                  </span>
                </div>
                <div className="flex -space-x-2">
                  {room.players.slice(0, 4).map((player) => (
                    <div
                      key={player.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 border-2 border-slate-900 text-sm"
                      title={player.nickname}
                    >
                      {player.avatar}
                    </div>
                  ))}
                  {room.players.length > 4 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 border-2 border-slate-900 text-xs text-slate-300">
                      +{room.players.length - 4}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
      />
    </div>
  );
}
