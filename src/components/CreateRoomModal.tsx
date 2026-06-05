import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Users, BookOpen, Star } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { roomApi } from '@/api';
import { useUserStore } from '@/stores/useUserStore';
import { useRoomStore } from '@/stores/useRoomStore';
import { CATEGORIES, CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/types';
import type { Category, RoomSettings } from '@/types';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormErrors {
  questionCount?: string;
  timeLimit?: string;
  maxPlayers?: string;
  password?: string;
  categories?: string;
  difficulty?: string;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const navigate = useNavigate();
  const { nickname } = useUserStore();
  const setRoom = useRoomStore((s) => s.setRoom);
  const setPlayers = useRoomStore((s) => s.setPlayers);
  const setSettings = useRoomStore((s) => s.setSettings);

  const [questionCount, setQuestionCount] = useState<5 | 10 | 20>(10);
  const [timeLimit, setTimeLimit] = useState<5 | 10 | 15>(10);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [password, setPassword] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [minDifficulty, setMinDifficulty] = useState(1);
  const [maxDifficulty, setMaxDifficulty] = useState(5);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (![5, 10, 20].includes(questionCount)) {
      newErrors.questionCount = '请选择有效的题目数量';
    }
    if (![5, 10, 15].includes(timeLimit)) {
      newErrors.timeLimit = '请选择有效的答题时间';
    }
    if (maxPlayers < 2 || maxPlayers > 8) {
      newErrors.maxPlayers = '最大人数必须在2-8之间';
    }
    if (password && password.length < 4) {
      newErrors.password = '密码至少4个字符';
    }
    if (minDifficulty > maxDifficulty) {
      newErrors.difficulty = '最小难度不能大于最大难度';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleCategory = (category: Category) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const settings: Partial<RoomSettings> = {
        questionCount,
        timeLimit,
        maxPlayers,
        categories: categories.length > 0 ? categories : CATEGORIES,
        minDifficulty,
        maxDifficulty,
        ...(password && { password }),
      };

      const response = await roomApi.create({
        nickname: nickname || '玩家',
        settings,
      });

      if (response.data) {
        setRoom(response.data);
        setPlayers(response.data.players);
        setSettings(response.data.settings);
        onClose();
        navigate(`/room/${response.data.code}`);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      setErrors({
        ...errors,
        password: error instanceof Error ? error.message : '创建房间失败',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="创建房间"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="题目数量"
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value) as 5 | 10 | 20)}
            error={errors.questionCount}
            options={[
              { value: 5, label: '5 题' },
              { value: 10, label: '10 题' },
              { value: 20, label: '20 题' },
            ]}
          />
          <Select
            label="答题时间"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value) as 5 | 10 | 15)}
            error={errors.timeLimit}
            options={[
              { value: 5, label: '5 秒' },
              { value: 10, label: '10 秒' },
              { value: 15, label: '15 秒' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              <Users className="h-4 w-4 inline mr-1" />
              最大人数
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxPlayers(num)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    maxPlayers === num
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            {errors.maxPlayers && (
              <p className="mt-1 text-sm text-red-400">{errors.maxPlayers}</p>
            )}
          </div>
          <Input
            label="房间密码（可选）"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="不设置则为公开房间"
            error={errors.password}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            <BookOpen className="h-4 w-4 inline mr-1" />
            题目分类（不选则为全部）
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  categories.includes(cat)
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          {errors.categories && (
            <p className="mt-1 text-sm text-red-400">{errors.categories}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            <Star className="h-4 w-4 inline mr-1" />
            难度范围：{DIFFICULTY_LABELS[minDifficulty]} - {DIFFICULTY_LABELS[maxDifficulty]}
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 w-16">最小</span>
              <input
                type="range"
                min={1}
                max={5}
                value={minDifficulty}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMinDifficulty(val);
                  if (val > maxDifficulty) setMaxDifficulty(val);
                }}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <Badge variant="info" className="w-16 justify-center">
                {DIFFICULTY_LABELS[minDifficulty]}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400 w-16">最大</span>
              <input
                type="range"
                min={1}
                max={5}
                value={maxDifficulty}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaxDifficulty(val);
                  if (val < minDifficulty) setMinDifficulty(val);
                }}
                className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <Badge variant="info" className="w-16 justify-center">
                {DIFFICULTY_LABELS[maxDifficulty]}
              </Badge>
            </div>
          </div>
          {errors.difficulty && (
            <p className="mt-1 text-sm text-red-400">{errors.difficulty}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button className="flex-1" onClick={handleSubmit} loading={loading}>
            <Hash className="h-4 w-4 mr-2" />
            创建房间
          </Button>
        </div>
      </div>
    </Modal>
  );
}
