import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, Trophy, BookOpen, User, LogOut, Gamepad2, Award, FileText, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const navItems = [
  { to: '/', icon: Home, label: '首页' },
  { to: '/lobby', icon: Users, label: '大厅' },
  { to: '/questions', icon: BookOpen, label: '题库' },
  { to: '/rankings', icon: Trophy, label: '排行' },
  { to: '/seasons', icon: Trophy, label: '赛季' },
  { to: '/friends', icon: Users, label: '好友' },
  { to: '/achievements', icon: Award, label: '成就' },
  { to: '/contributions', icon: FileText, label: '贡献' },
  { to: '/teams', icon: Swords, label: '战队' },
  { to: '/profile', icon: User, label: '我的' },
];

export function Navbar() {
  const navigate = useNavigate();
  const { nickname, avatar, resetUser } = useUserStore();

  const handleLogout = () => {
    resetUser();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-40 w-full glass border-b border-white/10">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 glow">
            <Gamepad2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold gradient-text">
            QuizBattle
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {nickname ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5">
                <span className="text-xl">{avatar}</span>
                <span className="text-sm font-medium text-white">{nickname}</span>
              </div>
              <Badge variant="success" className="hidden sm:inline-flex">
                在线
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="hidden sm:inline-flex"
              >
                <LogOut className="h-4 w-4 mr-1" />
                退出
              </Button>
            </div>
          ) : (
            <Badge variant="warning">未登录</Badge>
          )}
        </div>
      </div>

      <div className="md:hidden flex items-center justify-around border-t border-white/5 py-2 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? 'text-violet-400'
                  : 'text-slate-500 hover:text-slate-300'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
