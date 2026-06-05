import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, ArrowRight, Sparkles, Trophy, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useUserStore } from '@/stores/useUserStore';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const navigate = useNavigate();
  const { nickname, setNickname, setPlayerId, avatar, setAvatar } = useUserStore();
  const [inputNickname, setInputNickname] = useState(nickname || '');

  const AVATARS = ['👤', '🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯', '🐸', '🦄', '🐙'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputNickname.trim()) {
      setNickname(inputNickname.trim());
      if (!useUserStore.getState().playerId) {
        setPlayerId(uuidv4());
      }
      navigate('/lobby');
    }
  };

  const handleRandomAvatar = () => {
    const newAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    setAvatar(newAvatar);
  };

  const features = [
    { icon: Zap, title: '实时对战', desc: '多人实时抢答，刺激对决' },
    { icon: Trophy, title: '积分排行', desc: '全国玩家排名，争夺第一' },
    { icon: Users, title: '好友约战', desc: '创建房间，邀请好友PK' },
    { icon: Sparkles, title: '丰富题库', desc: '海量题目，多种分类' },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 glow">
              <Gamepad2 className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold font-display gradient-text">
              QuizBattle
            </h1>
          </div>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            知识对战，一触即发！与全国玩家一起进行刺激的知识问答对决
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <Card className="p-8">
            <h2 className="text-2xl font-bold font-display text-white mb-6">
              开始游戏
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  选择头像
                </label>
                <button
                  type="button"
                  onClick={handleRandomAvatar}
                  className="text-6xl mb-4 hover:scale-110 transition-transform cursor-pointer"
                >
                  {avatar}
                </button>
                <p className="text-xs text-slate-500">点击头像随机更换</p>
              </div>

              <Input
                label="输入昵称"
                placeholder="请输入你的昵称"
                value={inputNickname}
                onChange={(e) => setInputNickname(e.target.value)}
                maxLength={12}
                autoFocus
              />

              <Button type="submit" size="lg" className="w-full" disabled={!inputNickname.trim()}>
                进入大厅
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <Card key={index} hover className="p-5 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 mb-3">
                  <feature.icon className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
