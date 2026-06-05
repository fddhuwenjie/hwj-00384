import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Share2, Copy, Settings, Play, UserPlus, LogOut, Crown, RefreshCw, XCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RoomSettingsModal } from '@/components/RoomSettingsModal';
import { useRoomStore } from '@/stores/useRoomStore';
import { useUserStore } from '@/stores/useUserStore';
import { useSocket } from '@/socket/useSocket';
import { roomApi } from '@/api';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/types';

export default function RoomWait() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { players, room, settings, setRoom, setPlayers, setSettings, updatePlayer, resetRoom } = useRoomStore();
  const { playerId, nickname } = useUserStore();
  const { connect, emit, useEvents, isConnected } = useSocket();

  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [kickLoadingId, setKickLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const roomLoadedRef = useRef(false);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    const loadRoom = async () => {
      if (!code || !nickname || roomLoadedRef.current) return;

      setLoading(true);
      setError(null);
      try {
        if (room && room.code === code && players.length > 0) {
          roomLoadedRef.current = true;
          setLoading(false);
          return;
        }

        const response = await roomApi.get(code);
        if (response.data) {
          setRoom(response.data);
          setPlayers(response.data.players);
          setSettings(response.data.settings);

          const playerExists = response.data.players.some(p => p.nickname === nickname);
          if (!playerExists) {
            const joinResponse = await roomApi.join(code, { nickname });
            if (joinResponse.data) {
              setRoom(joinResponse.data);
              setPlayers(joinResponse.data.players);
              setSettings(joinResponse.data.settings);
            }
          }
        }
        roomLoadedRef.current = true;
      } catch (err) {
        console.error('Failed to load room:', err);
        setError(err instanceof Error ? err.message : '加载房间失败');
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [code, nickname, room, players, setRoom, setPlayers, setSettings]);

  useEvents({
    'room:playerJoined': (data) => {
      useRoomStore.getState().addPlayer(data.player);
    },
    'room:playerLeft': (data) => {
      useRoomStore.getState().removePlayer(data.playerId);
    },
    'room:playerKicked': (data) => {
      if (data.playerId === playerId) {
        navigate('/lobby');
      } else {
        useRoomStore.getState().removePlayer(data.playerId);
      }
    },
    'room:settingsUpdated': (data) => {
      useRoomStore.getState().setSettings(data.settings);
    },
    'room:gameStarting': () => {
      navigate(`/game/${code}`);
    },
  });

  useEffect(() => {
    if (isConnected && playerId && code) {
      emit('room:join', { roomCode: code, playerId });
    }
  }, [isConnected, playerId, code, emit]);

  const isOwner = room?.ownerId === playerId;
  const currentPlayer = players.find((p) => p.id === playerId);
  const isReady = currentPlayer?.isReady || false;
  const readyCount = players.filter((p) => p.isReady).length;

  const copyRoomCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
    }
  };

  const shareRoom = () => {
    if (navigator.share) {
      navigator.share({
        title: 'QuizBattle 房间邀请',
        text: `快来加入我的 QuizBattle 房间！房间号：${code}`,
        url: window.location.href,
      });
    }
  };

  const handleToggleReady = async () => {
    if (!code || !playerId || readyLoading) return;

    setReadyLoading(true);
    try {
      const newIsReady = !isReady;
      emit('room:playerUpdate', {
        roomCode: code,
        player: { id: playerId, isReady: newIsReady },
      });
      updatePlayer(playerId, { isReady: newIsReady });
    } catch (err) {
      console.error('Failed to toggle ready:', err);
    } finally {
      setReadyLoading(false);
    }
  };

  const handleKickPlayer = async (targetPlayerId: string, targetNickname: string) => {
    if (!code || !isOwner || kickLoadingId) return;

    if (!confirm(`确定要踢出玩家 ${targetNickname} 吗？`)) return;

    setKickLoadingId(targetPlayerId);
    try {
      await roomApi.kick(code, { playerId: targetPlayerId, reason: '房主踢出' });
      emit('room:leave', { roomCode: code, playerId: targetPlayerId });
    } catch (err) {
      console.error('Failed to kick player:', err);
    } finally {
      setKickLoadingId(null);
    }
  };

  const handleStartGame = async () => {
    if (!code || !isOwner || startLoading) return;

    if (players.length < 2) {
      setError('至少需要2名玩家才能开始游戏');
      return;
    }

    setStartLoading(true);
    setError(null);
    try {
      await roomApi.start(code);
      navigate(`/game/${code}`);
    } catch (err) {
      console.error('Failed to start game:', err);
      setError(err instanceof Error ? err.message : '开始游戏失败');
    } finally {
      setStartLoading(false);
    }
  };

  const leaveRoom = () => {
    if (code && playerId) {
      emit('room:leave', { roomCode: code, playerId });
    }
    resetRoom();
    navigate('/lobby');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-violet-400 mx-auto mb-4" />
          <p className="text-slate-400">加载房间信息...</p>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">加载失败</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/lobby')}>
            返回大厅
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="glass border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold font-display text-white">房间 {code}</h1>
            <Badge variant="success">等待中</Badge>
            <Badge variant="info">
              <CheckCircle className="h-3 w-3 mr-1" />
              已准备 {readyCount}/{players.length}
            </Badge>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={copyRoomCode}>
                <Copy className="h-4 w-4 mr-1" />
                复制房间号
              </Button>
              <Button variant="ghost" size="sm" onClick={shareRoom}>
                <Share2 className="h-4 w-4 mr-1" />
                分享
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOwner && (
              <Button variant="secondary" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                房间设置
              </Button>
            )}
            <Button variant="ghost" onClick={leaveRoom}>
              <LogOut className="h-4 w-4 mr-2" />
              离开
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-3">
          <p className="text-red-400 text-center max-w-6xl mx-auto">{error}</p>
        </div>
      )}

      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-bold font-display text-white mb-4">
                玩家列表 ({players.length}/{room?.settings.maxPlayers || 4})
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                      player.id === playerId
                        ? 'bg-violet-500/20 border border-violet-500/30'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="relative">
                      <div className="text-4xl">{player.avatar}</div>
                      {player.id === room?.ownerId && (
                        <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {player.nickname}
                        {player.id === playerId && (
                          <Badge variant="info" className="ml-2">你</Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">
                        {player.isOnline ? '在线' : '离线'}
                      </div>
                    </div>
                    <Badge variant={player.isReady ? 'success' : 'default'}>
                      {player.isReady ? '已准备' : '未准备'}
                    </Badge>
                    {isOwner && player.id !== playerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleKickPlayer(player.id, player.nickname)}
                        disabled={kickLoadingId === player.id}
                      >
                        {kickLoadingId === player.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          '踢出'
                        )}
                      </Button>
                    )}
                  </div>
                ))}
                {players.length < (room?.settings.maxPlayers || 4) && (
                  <div className="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed border-white/10 text-slate-500">
                    <UserPlus className="h-6 w-6" />
                    <span>等待玩家加入...</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold font-display text-white mb-4">房间设置</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">题目数量</span>
                  <span className="text-white font-medium">{settings?.questionCount || 10} 题</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">答题时间</span>
                  <span className="text-white font-medium">{settings?.timeLimit || 10} 秒</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">题目分类</span>
                  <span className="text-white font-medium">
                    {settings?.categories?.length
                      ? settings.categories.map((c) => CATEGORY_LABELS[c]).join('、')
                      : '全部'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">难度范围</span>
                  <span className="text-white font-medium">
                    {DIFFICULTY_LABELS[settings?.minDifficulty || 1]} - {DIFFICULTY_LABELS[settings?.maxDifficulty || 5]}
                  </span>
                </div>
              </div>
            </Card>

            {isOwner ? (
              <Button
                size="lg"
                className="w-full"
                onClick={handleStartGame}
                disabled={players.length < 2 || startLoading}
                loading={startLoading}
              >
                <Play className="h-5 w-5 mr-2" />
                {players.length < 2 ? '需要至少2人' : '开始游戏'}
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full"
                variant={isReady ? 'secondary' : 'primary'}
                onClick={handleToggleReady}
                disabled={readyLoading}
                loading={readyLoading}
              >
                {isReady ? (
                  <>
                    <XCircle className="h-5 w-5 mr-2" />
                    取消准备
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    准备就绪
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <RoomSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        canEdit={isOwner}
        roomCode={code}
      />
    </div>
  );
}
