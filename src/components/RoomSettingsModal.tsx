import { useState, useEffect } from 'react';
import { Users, BookOpen, Star, Save, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { roomApi } from '@/api';
import { useRoomStore } from '@/stores/useRoomStore';
import { CATEGORIES, CATEGORY_LABELS, DIFFICULTY_LABELS } from '@/types';
import type { Category, RoomSettings } from '@/types';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
  roomCode?: string;
}

interface FormErrors {
  questionCount?: string;
  timeLimit?: string;
  maxPlayers?: string;
  password?: string;
  difficulty?: string;
}

export function RoomSettingsModal({
  isOpen,
  onClose,
  canEdit = false,
  roomCode,
}: RoomSettingsModalProps) {
  const { settings, setSettings } = useRoomStore();

  const [questionCount, setQuestionCount] = useState<5 | 10 | 20>(10);
  const [timeLimit, setTimeLimit] = useState<5 | 10 | 15>(10);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [password, setPassword] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [minDifficulty, setMinDifficulty] = useState(1);
  const [maxDifficulty, setMaxDifficulty] = useState(5);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (settings && isOpen) {
      setQuestionCount(settings.questionCount);
      setTimeLimit(settings.timeLimit);
      setMaxPlayers(settings.maxPlayers);
      setPassword('');
      setCategories(settings.categories || []);
      setMinDifficulty(settings.minDifficulty);
      setMaxDifficulty(settings.maxDifficulty);
      setErrors({});
    }
  }, [settings, isOpen]);

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
    if (!canEdit) return;
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (!canEdit || !roomCode) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      const newSettings: Partial<RoomSettings> = {
        questionCount,
        timeLimit,
        maxPlayers,
        categories: categories.length > 0 ? categories : CATEGORIES,
        minDifficulty,
        maxDifficulty,
        ...(password && { password }),
      };

      const response = await roomApi.updateSettings(roomCode, newSettings);

      if (response.data) {
        setSettings(response.data.settings);
        onClose();
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      setErrors({
        ...errors,
        password: error instanceof Error ? error.message : '更新设置失败',
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
      title={canEdit ? '编辑房间设置' : '房间设置'}
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="题目数量"
            value={questionCount}
            onChange={(e) => canEdit && setQuestionCount(Number(e.target.value) as 5 | 10 | 20)}
            error={errors.questionCount}
            disabled={!canEdit}
            options={[
              { value: 5, label: '5 题' },
              { value: 10, label: '10 题' },
              { value: 20, label: '20 题' },
            ]}
          />
          <Select
            label="答题时间"
            value={timeLimit}
            onChange={(e) => canEdit && setTimeLimit(Number(e.target.value) as 5 | 10 | 15)}
            error={errors.timeLimit}
            disabled={!canEdit}
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
                  disabled={!canEdit}
                  onClick={() => setMaxPlayers(num)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    maxPlayers === num
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {num}
                </button>
              ))}
            </div>
            {errors.maxPlayers && (
              <p className="mt-1 text-sm text-red-400">{errors.maxPlayers}</p>
            )}
          </div>
          {canEdit && (
            <Input
              label="房间密码（不修改留空）"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="留空则不修改密码"
              error={errors.password}
            />
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            <BookOpen className="h-4 w-4 inline mr-1" />
            题目分类
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                disabled={!canEdit}
                onClick={() => toggleCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  categories.includes(cat) || categories.length === 0
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
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
                  if (!canEdit) return;
                  const val = Number(e.target.value);
                  setMinDifficulty(val);
                  if (val > maxDifficulty) setMaxDifficulty(val);
                }}
                disabled={!canEdit}
                className={`flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500 ${
                  !canEdit ? 'opacity-60 cursor-not-allowed' : ''
                }`}
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
                  if (!canEdit) return;
                  const val = Number(e.target.value);
                  setMaxDifficulty(val);
                  if (val < minDifficulty) setMinDifficulty(val);
                }}
                disabled={!canEdit}
                className={`flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500 ${
                  !canEdit ? 'opacity-60 cursor-not-allowed' : ''
                }`}
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
            <X className="h-4 w-4 mr-2" />
            取消
          </Button>
          {canEdit && (
            <Button className="flex-1" onClick={handleSubmit} loading={loading}>
              <Save className="h-4 w-4 mr-2" />
              保存设置
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
