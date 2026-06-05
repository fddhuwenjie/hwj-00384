import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { DanmuMessage } from '@/types';

interface DanmuTrack {
  id: number;
  endTime: number;
}

interface DanmuLayerProps {
  messages: DanmuMessage[];
  onSend?: (content: string, color: string) => void;
  showInput?: boolean;
  className?: string;
}

const DANMU_COLORS = [
  '#FFFFFF',
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#95E1D3',
  '#F38181',
  '#AA96DA',
  '#FCBAD3',
];

const TRACK_COUNT = 8;
const DANMU_SPEED = 8;
const DANMU_GAP = 50;

export function DanmuLayer({ messages, onSend, showInput = true, className }: DanmuLayerProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedColor, setSelectedColor] = useState(DANMU_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<DanmuTrack[]>(Array.from({ length: TRACK_COUNT }, (_, i) => ({ id: i, endTime: 0 })));
  const displayedMessagesRef = useRef<Set<string>>(new Set());
  const [activeDanmus, setActiveDanmus] = useState<(DanmuMessage & { track: number; left: number })[]>([]);

  const getAvailableTrack = useCallback(() => {
    const now = Date.now();
    const availableTracks = tracksRef.current.filter(track => track.endTime <= now);
    if (availableTracks.length === 0) {
      const earliestTrack = tracksRef.current.reduce((earliest, track) => 
        track.endTime < earliest.endTime ? track : earliest
      );
      return earliestTrack.id;
    }
    return availableTracks[Math.floor(Math.random() * availableTracks.length)].id;
  }, []);

  useEffect(() => {
    const newMessages = messages.filter(msg => !displayedMessagesRef.current.has(msg.id));
    
    newMessages.forEach(msg => {
      displayedMessagesRef.current.add(msg.id);
      const track = getAvailableTrack();
      const containerWidth = containerRef.current?.offsetWidth || 800;
      const msgWidth = msg.content.length * 16 + 80;
      const duration = (containerWidth + msgWidth) / DANMU_SPEED * 1000;
      
      tracksRef.current[track].endTime = Date.now() + duration + DANMU_GAP;
      
      setActiveDanmus(prev => [...prev, { ...msg, track, left: containerWidth }]);
      
      setTimeout(() => {
        setActiveDanmus(prev => prev.filter(d => d.id !== msg.id));
      }, duration);
    });
  }, [messages, getAvailableTrack]);

  const handleSend = () => {
    if (!inputValue.trim() || !onSend) return;
    onSend(inputValue.trim(), selectedColor);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className={cn('relative flex flex-col h-full', className)}>
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden pointer-events-none"
      >
        {activeDanmus.map((danmu) => (
          <div
            key={danmu.id}
            className="absolute whitespace-nowrap text-lg font-medium px-3 py-1 rounded-lg"
            style={{
              top: `${danmu.track * (100 / TRACK_COUNT)}%`,
              color: danmu.color,
              textShadow: '0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)',
              animation: `danmu-scroll ${(containerRef.current?.offsetWidth || 800) / DANMU_SPEED * 1000}ms linear forwards`,
              willChange: 'transform',
            }}
          >
            <span className="text-violet-300 mr-2">{danmu.nickname}:</span>
            {danmu.content}
          </div>
        ))}
      </div>

      {showInput && (
        <div className="glass border-t border-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-10 h-10 rounded-xl border-2 border-white/20 hover:border-violet-500/50 transition-all flex items-center justify-center"
                style={{ backgroundColor: selectedColor }}
                title="选择弹幕颜色"
              />
              {showColorPicker && (
                <div className="absolute bottom-full mb-2 left-0 glass rounded-xl p-3 flex flex-wrap gap-2 w-48 z-10">
                  {DANMU_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        setShowColorPicker(false);
                      }}
                      className={cn(
                        'w-8 h-8 rounded-lg border-2 transition-all hover:scale-110',
                        selectedColor === color ? 'border-violet-400 scale-110' : 'border-white/20'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="发送弹幕..."
                className="bg-white/5 border-white/10"
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4 mr-2" />
              发送
            </Button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes danmu-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-100% - 100vw));
          }
        }
      `}</style>
    </div>
  );
}
