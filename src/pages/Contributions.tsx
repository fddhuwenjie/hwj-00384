import { useState, useEffect } from 'react';
import {
  Plus,
  FileText,
  Trophy,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  User,
  BarChart3,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { contributionApi } from '@/api';
import { useUserStore } from '@/stores/useUserStore';
import { CATEGORIES, CATEGORY_LABELS, DIFFICULTY_LABELS } from '../../shared/types';
import type { ContributedQuestion, ContributorRankingItem } from '@/types';

type TabType = 'submit' | 'my-questions' | 'ranking';

const statusConfig = {
  pending: { label: '审核中', variant: 'warning' as const, icon: Clock },
  approved: { label: '已通过', variant: 'success' as const, icon: CheckCircle2 },
  rejected: { label: '已拒绝', variant: 'danger' as const, icon: XCircle },
};

export default function Contributions() {
  const { playerId, nickname } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabType>('submit');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [stats, setStats] = useState<{
    submitted: number;
    approved: number;
    pending: number;
    rejected: number;
    usedCount: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    difficulty: 3,
    category: 'technology',
    analysis: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [myQuestions, setMyQuestions] = useState<ContributedQuestion[]>([]);
  const [questionFilter, setQuestionFilter] = useState<string>('');

  const [rankings, setRankings] = useState<ContributorRankingItem[]>([]);

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    loadStats();
  }, [playerId]);

  useEffect(() => {
    if (activeTab === 'my-questions' && playerId) {
      loadMyQuestions();
    } else if (activeTab === 'ranking') {
      loadRankings();
    }
  }, [activeTab, playerId, questionFilter]);

  const loadStats = async () => {
    if (!playerId) return;
    try {
      const res = await contributionApi.getPlayerStats(playerId);
      if (res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadMyQuestions = async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const params: { pageSize: number; status?: 'pending' | 'approved' | 'rejected' } = { pageSize: 100 };
      if (questionFilter && questionFilter !== 'all') {
        params.status = questionFilter as 'pending' | 'approved' | 'rejected';
      }
      const res = await contributionApi.getMyQuestions(params);
      setMyQuestions(res.items);
    } catch (error) {
      console.error('Failed to load my questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRankings = async () => {
    setLoading(true);
    try {
      const res = await contributionApi.getRankings({ pageSize: 50 });
      setRankings(res.items);
    } catch (error) {
      console.error('Failed to load rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.text.trim()) errors.text = '请输入题目内容';
    formData.options.forEach((opt, i) => {
      if (!opt.trim()) errors[`option_${i}`] = `请输入选项 ${String.fromCharCode(65 + i)}`;
    });
    if (formData.correctAnswer < 0 || formData.correctAnswer >= 4) {
      errors.correctAnswer = '请选择正确答案';
    }
    if (!formData.analysis.trim()) errors.analysis = '请输入解析';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !playerId) return;

    setSubmitting(true);
    try {
      await contributionApi.submitQuestion({
        ...formData,
        contributorId: playerId,
      });
      setIsSuccessModalOpen(true);
      resetForm();
      loadStats();
    } catch (error) {
      console.error('Failed to submit question:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      difficulty: 3,
      category: 'technology',
      analysis: '',
    });
    setFormErrors({});
  };

  const tabs: { id: TabType; label: string; icon: typeof Plus }[] = [
    { id: 'submit', label: '提交题目', icon: Plus },
    { id: 'my-questions', label: '我的题目', icon: FileText },
    { id: 'ranking', label: '贡献排行', icon: Trophy },
  ];

  const renderSubmitTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-violet-400" />
          贡献新题目
        </CardTitle>
        <CardDescription>你的题目将经过审核后加入题库</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Input
              label="题目内容"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              error={formErrors.text}
              placeholder="请输入题目内容"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.options.map((option, index) => (
              <div key={index} className="relative">
                <Input
                  label={`选项 ${String.fromCharCode(65 + index)}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...formData.options];
                    newOptions[index] = e.target.value;
                    setFormData({ ...formData, options: newOptions });
                  }}
                  error={formErrors[`option_${index}`]}
                  placeholder={`请输入选项 ${String.fromCharCode(65 + index)}`}
                />
                <div className="absolute top-8 right-2">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={formData.correctAnswer === index}
                    onChange={() => setFormData({ ...formData, correctAnswer: index })}
                    className="w-4 h-4 accent-violet-500"
                  />
                </div>
              </div>
            ))}
          </div>
          {formErrors.correctAnswer && (
            <p className="text-sm text-red-400">{formErrors.correctAnswer}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="分类"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              options={CATEGORIES.map((c) => ({
                value: c,
                label: CATEGORY_LABELS[c],
              }))}
            />
            <Select
              label="难度"
              value={String(formData.difficulty)}
              onChange={(e) => setFormData({ ...formData, difficulty: Number(e.target.value) })}
              options={[1, 2, 3, 4, 5].map((d) => ({
                value: String(d),
                label: DIFFICULTY_LABELS[d],
              }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              解析
            </label>
            <textarea
              value={formData.analysis}
              onChange={(e) => setFormData({ ...formData, analysis: e.target.value })}
              placeholder="请输入题目解析，帮助其他玩家理解正确答案"
              rows={3}
              className={`w-full px-4 py-2.5 text-white placeholder-slate-500 bg-white/5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all duration-200 ${
                formErrors.analysis ? 'border-red-500/50' : 'border-white/10'
              }`}
            />
            {formErrors.analysis && (
              <p className="mt-1 text-sm text-red-400">{formErrors.analysis}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={resetForm}>
              重置
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              <Send className="h-4 w-4 mr-2" />
              提交审核
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderMyQuestionsTab = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-400 mr-2">筛选状态：</span>
            <Button
              variant={questionFilter === '' || questionFilter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setQuestionFilter('all')}
            >
              全部
            </Button>
            {Object.entries(statusConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={key}
                  variant={questionFilter === key ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setQuestionFilter(key)}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">加载中...</p>
        </div>
      ) : myQuestions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-white mb-2">暂无提交记录</h3>
          <p className="text-slate-400 mb-4">去提交你的第一道题目吧！</p>
          <Button onClick={() => setActiveTab('submit')}>
            <Plus className="h-4 w-4 mr-2" />
            提交题目
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {myQuestions.map((q) => {
            const status = statusConfig[q.status];
            const StatusIcon = status.icon;
            return (
              <Card key={q.id} className="glass-hover cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={status.variant}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        <Badge variant="info">
                          {CATEGORY_LABELS[q.category]}
                        </Badge>
                        <span className="text-yellow-400 text-sm">
                          {'★'.repeat(q.difficulty)}
                          {'☆'.repeat(5 - q.difficulty)}
                        </span>
                      </div>
                      <div className="text-white font-medium mb-1">{q.text}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        正确答案: {String.fromCharCode(65 + q.correctAnswer)}. {q.options[q.correctAnswer]}
                      </div>
                      {q.reviewNote && q.status === 'rejected' && (
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-sm text-red-400">
                            <XCircle className="h-4 w-4 inline mr-1" />
                            审核意见：{q.reviewNote}
                          </p>
                        </div>
                      )}
                      <div className="text-xs text-slate-600 mt-2">
                        提交于 {new Date(q.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500 flex-shrink-0 mt-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderRankingTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          贡献排行榜
        </CardTitle>
        <CardDescription>按通过题目数量排名</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">加载中...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-white mb-2">暂无排行数据</h3>
            <p className="text-slate-400">成为第一个贡献者吧！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rankings.map((item, index) => {
              const isCurrentUser = item.nickname === nickname;
              return (
                <div
                  key={item.playerId}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                    isCurrentUser
                      ? 'bg-violet-500/20 border border-violet-500/30'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      index === 0
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : index === 1
                        ? 'bg-slate-400/20 text-slate-300'
                        : index === 2
                        ? 'bg-amber-600/20 text-amber-500'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {index < 3 ? (
                      <Trophy className="h-5 w-5" />
                    ) : (
                      <span>#{index + 1}</span>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl">
                    {item.avatar || item.nickname[0] || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isCurrentUser ? 'text-violet-300' : 'text-white'}`}>
                        {item.nickname}
                        {isCurrentUser && (
                          <Badge variant="info" className="ml-2">我</Badge>
                        )}
                      </span>
                    </div>
                    <div className="text-sm text-slate-400">
                      贡献 {item.contributedCount} 题 · 被使用 {item.usedCount} 次
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-display text-violet-400">
                      {item.contributedCount}
                    </div>
                    <div className="text-xs text-slate-500">通过题数</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-white mb-2">题目贡献</h1>
          <p className="text-slate-400">贡献你的知识，帮助更多玩家成长</p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">提交总数</p>
                    <p className="text-2xl font-bold font-display text-white">{stats.submitted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">已通过</p>
                    <p className="text-2xl font-bold font-display text-emerald-400">{stats.approved}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">审核中</p>
                    <p className="text-2xl font-bold font-display text-amber-400">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">被使用</p>
                    <p className="text-2xl font-bold font-display text-cyan-400">{stats.usedCount}次</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 min-w-[100px]"
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {activeTab === 'submit' && renderSubmitTab()}
        {activeTab === 'my-questions' && renderMyQuestionsTab()}
        {activeTab === 'ranking' && renderRankingTab()}
      </div>

      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="提交成功"
        className="max-w-md"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">题目提交成功！</h3>
          <p className="text-slate-400 mb-4">
            你的题目已进入审核队列，我们会尽快处理。审核通过后将自动加入题库。
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setIsSuccessModalOpen(false)}>
              继续提交
            </Button>
            <Button onClick={() => {
              setIsSuccessModalOpen(false);
              setActiveTab('my-questions');
            }}>
              查看我的题目
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
