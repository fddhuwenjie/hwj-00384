import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Swords,
  Users,
  Search,
  Plus,
  ArrowLeft,
  Crown,
  Shield,
  User,
  LogOut,
  UserX,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Play,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { teamApi } from '@/api';
import { useUserStore } from '@/stores/useUserStore';
import { cn } from '@/lib/utils';
import type { Team, TeamMember, TeamMatch, TeamRankingItem } from '@/types';

type TabType = 'list' | 'my';

const TEAM_AVATARS = ['⚔️', '🛡️', '🏰', '🐉', '🦅', '🐺', '🦁', '🐯', '🦊', '🐼', '👑', '⭐', '🔥', '💎', '🎯', '🏆'];

const ROLE_LABELS: Record<TeamMember['role'], string> = {
  owner: '队长',
  admin: '副队长',
  member: '成员',
};

const ROLE_COLORS: Record<TeamMember['role'], string> = {
  owner: 'text-yellow-400',
  admin: 'text-purple-400',
  member: 'text-slate-300',
};

export default function Teams() {
  const navigate = useNavigate();
  const { playerId } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [rankings, setRankings] = useState<TeamRankingItem[]>([]);
  const [myTeam, setMyTeam] = useState<{ team: Team; role: string } | null>(null);
  const [myTeamMembers, setMyTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<TeamMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', avatar: TEAM_AVATARS[0], description: '' });
  const [kickConfirmOpen, setKickConfirmOpen] = useState<{ playerId: string; nickname: string } | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const params = searchQuery ? { search: searchQuery, pageSize: 50 } : { pageSize: 50 };
      const response = await teamApi.getList(params);
      setTeams(response.items);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const loadRankings = useCallback(async () => {
    try {
      const response = await teamApi.getRankings({ pageSize: 10 });
      setRankings(response.items);
    } catch (error) {
      console.error('Failed to load team rankings:', error);
    }
  }, []);

  const loadMyTeam = useCallback(async () => {
    if (!playerId) return;
    try {
      const response = await teamApi.getPlayerTeam(playerId);
      if (response.data) {
        setMyTeam(response.data);
        const membersResponse = await teamApi.getMembers(response.data.team.id);
        setMyTeamMembers(membersResponse.items);
      } else {
        setMyTeam(null);
        setMyTeamMembers([]);
      }
    } catch (error) {
      console.error('Failed to load my team:', error);
    }
  }, [playerId]);

  const loadUpcomingMatches = useCallback(async () => {
    try {
      const response = await teamApi.getMatches({ status: 'pending', pageSize: 10 });
      setUpcomingMatches(response.items);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  }, []);

  const loadTeamDetail = useCallback(async (teamId: number) => {
    try {
      const [teamResponse, membersResponse] = await Promise.all([
        teamApi.getById(teamId),
        teamApi.getMembers(teamId),
      ]);
      if (teamResponse.data) {
        setSelectedTeam(teamResponse.data);
        setSelectedTeamMembers(membersResponse.items);
      }
    } catch (error) {
      console.error('Failed to load team detail:', error);
    }
  }, []);

  useEffect(() => {
    loadTeams();
    loadRankings();
    loadMyTeam();
    loadUpcomingMatches();
  }, [loadTeams, loadRankings, loadMyTeam, loadUpcomingMatches]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTeams();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadTeams]);

  const handleCreateTeam = async () => {
    if (!playerId || !createForm.name.trim()) return;
    try {
      const response = await teamApi.create({
        playerId,
        name: createForm.name.trim(),
        avatar: createForm.avatar,
        description: createForm.description.trim(),
      });
      if (response.data) {
        setCreateModalOpen(false);
        setCreateForm({ name: '', avatar: TEAM_AVATARS[0], description: '' });
        loadMyTeam();
        setActiveTab('my');
      }
    } catch (error) {
      console.error('Failed to create team:', error);
    }
  };

  const handleJoinTeam = async (teamId: number) => {
    if (!playerId) return;
    try {
      await teamApi.join(teamId, playerId);
      loadMyTeam();
      setSelectedTeam(null);
      setActiveTab('my');
    } catch (error) {
      console.error('Failed to join team:', error);
    }
  };

  const handleLeaveTeam = async () => {
    if (!playerId || !myTeam) return;
    try {
      await teamApi.leave(myTeam.team.id, playerId);
      setLeaveConfirmOpen(false);
      setMyTeam(null);
      setMyTeamMembers([]);
      loadTeams();
    } catch (error) {
      console.error('Failed to leave team:', error);
    }
  };

  const handleKickMember = async (targetPlayerId: string) => {
    if (!playerId || !myTeam) return;
    try {
      await teamApi.kick(myTeam.team.id, targetPlayerId, playerId);
      setKickConfirmOpen(null);
      const membersResponse = await teamApi.getMembers(myTeam.team.id);
      setMyTeamMembers(membersResponse.items);
      loadTeams();
    } catch (error) {
      console.error('Failed to kick member:', error);
    }
  };

  const getTeamRanking = (teamId: number) => {
    return rankings.find((r) => r.teamId === teamId);
  };

  const getRoleIcon = (role: TeamMember['role']) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  if (selectedTeam) {
    const ranking = getTeamRanking(selectedTeam.id);
    const isOwner = myTeam?.team.id === selectedTeam.id && myTeam.role === 'owner';
    const isAdmin = myTeam?.team.id === selectedTeam.id && myTeam.role === 'admin';
    const canKick = isOwner || isAdmin;
    const isMember = myTeam?.team.id === selectedTeam.id;

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" className="mb-6" onClick={() => setSelectedTeam(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>

          <Card className="mb-6 overflow-hidden">
            <div className="relative h-32 bg-gradient-to-r from-violet-600/30 to-indigo-600/30" />
            <CardContent className="-mt-16 relative">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                <div className="text-7xl bg-glass rounded-2xl p-4 border-2 border-white/20">
                  {selectedTeam.avatar || '⚔️'}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold font-display text-white mb-2">
                    {selectedTeam.name}
                  </h1>
                  <p className="text-slate-400 mb-4">{selectedTeam.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Users className="h-4 w-4" />
                      {selectedTeam.memberCount} 成员
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Target className="h-4 w-4" />
                      {selectedTeam.totalWins} 胜 / {selectedTeam.totalLosses} 负
                    </span>
                    {ranking && (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Trophy className="h-4 w-4" />
                        排名 #{ranking.rank}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isMember && myTeam === null && (
                    <Button onClick={() => handleJoinTeam(selectedTeam.id)}>
                      <Plus className="h-4 w-4 mr-2" />
                      加入战队
                    </Button>
                  )}
                  {isMember && myTeam?.role !== 'owner' && (
                    <Button variant="danger" onClick={() => setLeaveConfirmOpen(true)}>
                      <LogOut className="h-4 w-4 mr-2" />
                      离开战队
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  战绩统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">总场次</span>
                    <span className="text-xl font-bold text-white">
                      {selectedTeam.totalWins + selectedTeam.totalLosses}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">胜场</span>
                    <span className="text-xl font-bold text-emerald-400">{selectedTeam.totalWins}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">败场</span>
                    <span className="text-xl font-bold text-red-400">{selectedTeam.totalLosses}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">胜率</span>
                    <span className="text-xl font-bold text-violet-400">
                      {selectedTeam.totalWins + selectedTeam.totalLosses > 0
                        ? ((selectedTeam.totalWins / (selectedTeam.totalWins + selectedTeam.totalLosses)) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">总积分</span>
                    <span className="text-xl font-bold text-yellow-400">
                      {selectedTeam.totalScore.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-violet-400" />
                  战队排名
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankings.length > 0 ? (
                  <div className="space-y-2">
                    {rankings.slice(0, 5).map((item) => (
                      <div
                        key={item.teamId}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl',
                          item.teamId === selectedTeam.id
                            ? 'bg-violet-500/20 border border-violet-500/30'
                            : 'bg-white/5'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center font-bold',
                            item.rank === 1
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : item.rank === 2
                              ? 'bg-slate-400/20 text-slate-300'
                              : item.rank === 3
                              ? 'bg-amber-600/20 text-amber-500'
                              : 'bg-white/10 text-slate-400'
                          )}
                        >
                          {item.rank}
                        </div>
                        <span className="text-2xl">{item.teamAvatar || '⚔️'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{item.teamName}</div>
                          <div className="text-xs text-slate-500">
                            {item.wins}胜 {item.losses}负 · {(item.winRate * 100).toFixed(0)}%胜率
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">{item.totalScore.toLocaleString()}</div>
                          <div className="text-xs text-slate-500">积分</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    暂无排名数据
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-400" />
                成员列表 ({selectedTeamMembers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedTeamMembers.map((member) => (
                  <div
                    key={member.playerId}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-3xl">{member.avatar || '👤'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">{member.nickname}</span>
                        <Badge
                          variant="info"
                          className={cn('flex items-center gap-1', ROLE_COLORS[member.role])}
                        >
                          {getRoleIcon(member.role)}
                          {ROLE_LABELS[member.role]}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500">
                        加入于 {new Date(member.joinedAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                    {canKick && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setKickConfirmOpen({ playerId: member.playerId, nickname: member.nickname })}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        移除
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Modal
          isOpen={kickConfirmOpen !== null}
          onClose={() => setKickConfirmOpen(null)}
          title="确认移除"
        >
          <p className="text-slate-300 mb-6">
            确定要将 <span className="text-white font-medium">{kickConfirmOpen?.nickname}</span> 移出战队吗？
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setKickConfirmOpen(null)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => kickConfirmOpen && handleKickMember(kickConfirmOpen.playerId)}
            >
              确认移除
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={leaveConfirmOpen}
          onClose={() => setLeaveConfirmOpen(false)}
          title="确认离开"
        >
          <p className="text-slate-300 mb-6">确定要离开战队吗？</p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setLeaveConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleLeaveTeam}>
              确认离开
            </Button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold font-display text-white mb-2 flex items-center justify-center gap-3">
            <Swords className="h-10 w-10 text-violet-400" />
            战队中心
          </h1>
          <p className="text-slate-400">组建你的最强战队，征战知识赛场</p>
        </div>

        {upcomingMatches.length > 0 && (
          <Card className="mb-6 border-violet-500/30 bg-violet-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-400" />
                即将开始的战队赛
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => match.roomCode && navigate(`/room/${match.roomCode}`)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-3xl">{match.team1.avatar || '⚔️'}</span>
                      <div className="text-center">
                        <div className="font-bold text-white">{match.team1.name}</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <Badge variant="warning" className="mb-1">
                        <Play className="h-3 w-3 mr-1" />
                        待开始
                      </Badge>
                      <div className="text-2xl font-bold text-slate-500">VS</div>
                    </div>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <div className="text-center">
                        <div className="font-bold text-white">{match.team2.name}</div>
                      </div>
                      <span className="text-3xl">{match.team2.avatar || '⚔️'}</span>
                    </div>
                    {match.roomCode && (
                      <Button size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        进入
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={activeTab === 'list' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('list')}
                >
                  <Swords className="h-4 w-4 mr-2" />
                  战队列表
                </Button>
                <Button
                  variant={activeTab === 'my' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('my')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  我的战队
                </Button>
              </div>

              {activeTab === 'list' && (
                <div className="flex gap-3">
                  <div className="w-64 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="搜索战队..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {myTeam === null && (
                    <Button onClick={() => setCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      创建战队
                    </Button>
                  )}
                </div>
              )}

              {activeTab === 'my' && myTeam === null && (
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建战队
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">加载中...</p>
          </div>
        ) : activeTab === 'list' ? (
          teams.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚔️</div>
              <p className="text-slate-400">暂无战队数据</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => {
                const ranking = getTeamRanking(team.id);
                return (
                  <Card
                    key={team.id}
                    hover
                    className="cursor-pointer"
                    onClick={() => loadTeamDetail(team.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-5xl bg-white/5 rounded-xl p-3">
                        {team.avatar || '⚔️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white mb-1 truncate">
                          {team.name}
                        </h3>
                        <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                          {team.description || '暂无简介'}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {team.memberCount}人
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {team.totalWins}胜{team.totalLosses}负
                          </span>
                          {ranking && (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <Trophy className="h-3 w-3" />
                              #{ranking.rank}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )
        ) : myTeam ? (
          <div className="space-y-6">
            <Card onClick={() => loadTeamDetail(myTeam.team.id)} className="cursor-pointer hover:bg-white/10 transition-colors">
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="text-6xl bg-white/5 rounded-2xl p-4">
                    {myTeam.team.avatar || '⚔️'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold font-display text-white">
                        {myTeam.team.name}
                      </h2>
                      <Badge
                        variant="info"
                        className={cn(
                          'flex items-center gap-1',
                          ROLE_COLORS[myTeam.role as TeamMember['role']]
                        )}
                      >
                        {getRoleIcon(myTeam.role as TeamMember['role'])}
                        {ROLE_LABELS[myTeam.role as TeamMember['role']]}
                      </Badge>
                    </div>
                    <p className="text-slate-400 mb-3">{myTeam.team.description}</p>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-slate-500">成员：</span>
                        <span className="text-white font-medium">{myTeam.team.memberCount}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">战绩：</span>
                        <span className="text-emerald-400 font-medium">{myTeam.team.totalWins}胜</span>
                        <span className="text-slate-500"> / </span>
                        <span className="text-red-400 font-medium">{myTeam.team.totalLosses}负</span>
                      </div>
                      <div>
                        <span className="text-slate-500">积分：</span>
                        <span className="text-yellow-400 font-medium">
                          {myTeam.team.totalScore.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="info" className="mb-2">点击查看详情</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-400" />
                  成员列表
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {myTeamMembers.map((member) => (
                    <div
                      key={member.playerId}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                    >
                      <span className="text-3xl">{member.avatar || '👤'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">{member.nickname}</span>
                          <Badge
                            variant="info"
                            className={cn(
                              'flex items-center gap-1 text-xs',
                              ROLE_COLORS[member.role]
                            )}
                          >
                            {getRoleIcon(member.role)}
                            {ROLE_LABELS[member.role]}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500">
                          加入于 {new Date(member.joinedAt).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">⚔️</div>
            <h2 className="text-2xl font-bold text-white mb-2">你还没有加入战队</h2>
            <p className="text-slate-400 mb-6">创建属于你的战队，或加入其他战队一起征战</p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-5 w-5 mr-2" />
                创建战队
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setActiveTab('list')}>
                <Search className="h-5 w-5 mr-2" />
                浏览战队
              </Button>
            </div>
          </div>
        )}

        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="创建战队"
        >
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="text-6xl mb-2">{createForm.avatar}</div>
              <p className="text-sm text-slate-400">选择战队头像</p>
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                {TEAM_AVATARS.map((avatar) => (
                  <button
                    key={avatar}
                    onClick={() => setCreateForm({ ...createForm, avatar })}
                    className={cn(
                      'w-10 h-10 rounded-lg text-xl transition-all',
                      createForm.avatar === avatar
                        ? 'bg-violet-500/30 border-2 border-violet-500 scale-110'
                        : 'bg-white/5 hover:bg-white/10'
                    )}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="战队名称"
              placeholder="请输入战队名称"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              maxLength={20}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                战队简介
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="介绍一下你的战队吧..."
                maxLength={100}
                rows={3}
                className="w-full px-4 py-2.5 text-white placeholder-slate-500 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200 resize-none"
              />
              <p className="mt-1 text-xs text-slate-500 text-right">
                {createForm.description.length}/100
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTeam} disabled={!createForm.name.trim()}>
              创建
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
