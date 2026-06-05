import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, LogIn } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { roomApi } from '@/api';
import { useUserStore } from '@/stores/useUserStore';
import { useRoomStore } from '@/stores/useRoomStore';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

interface FormErrors {
  code?: string;
  password?: string;
}

const CONFUSING_CHARS = /[0O1I2Z]/g;

export function JoinRoomModal({ isOpen, onClose, initialCode = '' }: JoinRoomModalProps) {
  const navigate = useNavigate();
  const { nickname } = useUserStore();
  const setRoom = useRoomStore((s) => s.setRoom);
  const setPlayers = useRoomStore((s) => s.setPlayers);
  const setSettings = useRoomStore((s) => s.setSettings);

  const [code, setCode] = useState(initialCode);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const normalizeCode = (value: string): string => {
    return value
      .toUpperCase()
      .replace(CONFUSING_CHARS, '')
      .replace(/[^A-Z3-9]/g, '')
      .slice(0, 6);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeCode(e.target.value);
    setCode(normalized);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!code || code.length < 4) {
      newErrors.code = '请输入有效的房间码';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await roomApi.join(code, {
        nickname: nickname || '玩家',
        ...(password && { password }),
      });

      if (response.data) {
        setRoom(response.data);
        setPlayers(response.data.players);
        setSettings(response.data.settings);
        onClose();
        navigate(`/room/${response.data.code}`);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      setErrors({
        ...errors,
        password: error instanceof Error ? error.message : '加入房间失败',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCode('');
      setPassword('');
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="加入房间"
      className="max-w-md"
    >
      <div className="space-y-6">
        <div>
          <Input
            label="房间码"
            value={code}
            onChange={handleCodeChange}
            placeholder="输入4-6位房间码"
            error={errors.code}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="mt-2 text-xs text-slate-500">
            <Hash className="h-3 w-3 inline mr-1" />
            自动转换为大写，已过滤易混淆字符 0/O/1/I/2/Z
          </p>
        </div>

        <Input
          label="房间密码（可选）"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="公开房间无需密码"
          error={errors.password}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button className="flex-1" onClick={handleSubmit} loading={loading}>
            <LogIn className="h-4 w-4 mr-2" />
            加入房间
          </Button>
        </div>
      </div>
    </Modal>
  );
}
