import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  Gamepad2,
  Send,
  Check,
  X,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { friendApi } from '@/api';
import { useSocket } from '@/socket/useSocket';
import { useUserStore } from '@/stores/useUserStore';
import type { Friend, FriendRequest } from '@/types';

type FriendTab = 'list' | 'add' | 'requests';

const AVATARS = ['🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯', '🐸', '🦄', '👾', '🤖'];

function getAvatar(playerId: string) {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

interface SearchResult {
  playerId: string;
  nickname: string;
  avatar?: string;
  isOnline: boolean;
  isFriend: boolean;
  hasPendingRequest: boolean;
}

export default function Friends() {
  const navigate = useNavigate();
  const { playerId } = useUserStore();
  const { isConnected, emit, useEvents } = useSocket();
  const [activeTab, setActiveTab] = useState<FriendTab>('list');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const TABS: { value: FriendTab; label: string; icon: typeof Users }[] = [
    { value: 'list', label: '好友列表', icon: Users },
    { value: 'add', label: '添加好友', icon: UserPlus },
    { value: 'requests', label: '好友请求', icon: UserCheck },
  ];

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const response = await friendApi.getFriends();
      setFriends(response.items);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const response = await friendApi.getRequests();
      setRequests(response.items.filter((r) => r.status === 'pending'));
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  }, []);

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, [loadFriends, loadRequests]);

  useEvents({
    'friend:online': (data: { playerId: string }) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.playerId === data.playerId ? { ...f, isOnline: true } : f
        )
      );
    },
    'friend:offline': (data: { playerId: string }) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.playerId === data.playerId ? { ...f, isOnline: false, isInGame: false } : f
        )
      );
    },
    'friend:game:start': (data: { playerId: string; roomCode: string }) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.playerId === data.playerId
            ? { ...f, isInGame: true, roomCode: data.roomCode }
            : f
        )
      );
    },
    'friend:game:end': (data: { playerId: string }) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.playerId === data.playerId ? { ...f, isInGame: false, roomCode: undefined } : f
        )
      );
    },
    'friend:request:received': (data: FriendRequest) => {
      setRequests((prev) => [data, ...prev]);
    },
    'friend:request:accepted': (data: Friend) => {
      setFriends((prev) => [data, ...prev]);
      setRequests((prev) =>
        prev.filter((r) => r.senderId !== data.playerId && r.receiverId !== data.playerId)
      );
    },
  });

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const response = await friendApi.search(searchQuery.trim());
      setSearchResults(response.items);
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleSendRequest = async (receiverId: string) => {
    setActionLoading((prev) => ({ ...prev, [`send-${receiverId}`]: true }));
    try {
      await friendApi.sendRequest(receiverId);
      setSearchResults((prev) =>
        prev.map((r) =>
          r.playerId === receiverId ? { ...r, hasPendingRequest: true } : r
        )
      );
    } catch (error) {
      console.error('Failed to send request:', error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`send-${receiverId}`]: false }));
    }
  };

  const handleAcceptRequest = async (id: number) => {
    setActionLoading((prev) => ({ ...prev, [`accept-${id}`]: true }));
    try {
      const response = await friendApi.acceptRequest(id);
      if (response.data) {
        setFriends((prev) => [response.data!, ...prev]);
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`accept-${id}`]: false }));
    }
  };

  const handleRejectRequest = async (id: number) => {
    setActionLoading((prev) => ({ ...prev, [`reject-${id}`]: true }));
    try {
      await friendApi.rejectRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to reject request:', error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`reject-${id}`]: false }));
    }
  };

  const handleInviteFriend = (friend: Friend) => {
    if (playerId && friend.roomCode) {
      emit('friend:invite', { friendId: friend.playerId, roomCode: friend.roomCode });
    }
  };

  const onlineFriends = friends.filter((f) => f.isOnline);
  const offlineFriends = friends.filter((f) => !f.isOnline);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold font-display text-white mb-2 flex items-center justify-center gap-3">
            <Users className="h-10 w-10 text-violet-400" />
            好友
          </h1>
          <p className="text-slate-400">管理你的好友和好友请求</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-2 flex-wrap">
              {TABS.map((tab) => (
                <Button
                  key={tab.value}
                  variant={activeTab === tab.value ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab(tab.value)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.value === 'requests' && requests.length > 0 && (
                    <Badge variant="danger" className="ml-1">
                      {requests.length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {activeTab === 'list' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-400" />
                好友列表
                <span className="text-sm font-normal text-slate-400">
                  ({onlineFriends.length} 在线 / {friends.length} 总数)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-slate-400">加载中...</p>
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-slate-400 mb-4">还没有好友</p>
                  <Button onClick={() => setActiveTab('add')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    添加好友
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {onlineFriends.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-400 mb-2 px-2">
                        在线 ({onlineFriends.length})
                      </h3>
                      <div className="space-y-2">
                        {onlineFriends.map((friend) => (
                          <div
                            key={friend.playerId}
                            className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
                          >
                            <div className="relative">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl">
                                {getAvatar(friend.playerId)}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white truncate">
                                  {friend.nickname}
                                </span>
                                {friend.isInGame && (
                                  <Badge variant="info" className="flex items-center gap-1">
                                    <Gamepad2 className="h-3 w-3" />
                                    游戏中
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">
                                {friend.isInGame && friend.roomCode
                                  ? `房间: ${friend.roomCode}`
                                  : '在线'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {friend.isInGame && friend.roomCode && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleInviteFriend(friend)}
                                >
                                  邀请加入
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/profile/${friend.playerId}`)}
                              >
                                查看
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {offlineFriends.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 mb-2 px-2">
                        离线 ({offlineFriends.length})
                      </h3>
                      <div className="space-y-2">
                        {offlineFriends.map((friend) => (
                          <div
                            key={friend.playerId}
                            className="flex items-center gap-4 p-4 rounded-xl opacity-60"
                          >
                            <div className="relative">
                              <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-2xl">
                                {getAvatar(friend.playerId)}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-500 rounded-full border-2 border-slate-900" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-300 truncate">
                                {friend.nickname}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                离线
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/profile/${friend.playerId}`)}
                            >
                              查看
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'add' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-violet-400" />
                添加好友
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="输入昵称搜索玩家..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {searchLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-slate-400">搜索中...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-slate-400">
                    {searchQuery ? '未找到匹配的玩家' : '输入昵称搜索玩家'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.playerId}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl">
                          {getAvatar(result.playerId)}
                        </div>
                        {result.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">
                            {result.nickname}
                          </span>
                          {result.isOnline ? (
                            <Badge variant="success">在线</Badge>
                          ) : (
                            <Badge variant="default">离线</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.isFriend ? (
                          <Badge variant="success" className="flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            已添加
                          </Badge>
                        ) : result.hasPendingRequest ? (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            已发送请求
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSendRequest(result.playerId)}
                            loading={actionLoading[`send-${result.playerId}`]}
                            disabled={!isConnected}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            发送请求
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'requests' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-violet-400" />
                好友请求
                {requests.length > 0 && (
                  <Badge variant="danger">{requests.length} 条新请求</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📬</div>
                  <p className="text-slate-400">暂无好友请求</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl">
                          {getAvatar(request.senderId)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {request.senderNickname}
                        </div>
                        <div className="text-xs text-slate-400">
                          请求加你为好友
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleAcceptRequest(request.id)}
                          loading={actionLoading[`accept-${request.id}`]}
                          className="flex items-center gap-1"
                        >
                          <Check className="h-4 w-4" />
                          接受
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRejectRequest(request.id)}
                          loading={actionLoading[`reject-${request.id}`]}
                          className="flex items-center gap-1"
                        >
                          <X className="h-4 w-4" />
                          拒绝
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
