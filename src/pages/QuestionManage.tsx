import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Upload,
  FileJson,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { questionApi } from '@/api';
import { CATEGORIES, CATEGORY_LABELS, DIFFICULTY_LABELS } from '../../shared/types';
import type { Question, CreateQuestionRequest, QuestionStats } from '@/types';

export default function QuestionManage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState<CreateQuestionRequest>({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    difficulty: 3,
    category: 'technology',
    analysis: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<CreateQuestionRequest[]>([]);
  const [importError, setImportError] = useState('');

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        category?: string;
        difficulty?: number;
        search?: string;
      } = { page, pageSize };
      if (category) params.category = category;
      if (difficulty) params.difficulty = Number(difficulty);
      if (search) params.search = search;

      const response = await questionApi.getList(params);
      setQuestions(response.items);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, category, difficulty, search]);

  const loadStats = useCallback(async () => {
    try {
      const response = await questionApi.getStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
    loadStats();
  }, [loadQuestions, loadStats]);

  const handleSearch = () => {
    setPage(1);
    loadQuestions();
  };

  const handleFilterChange = () => {
    setPage(1);
    setTimeout(loadQuestions, 0);
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
    if (!validateForm()) return;

    try {
      if (editingQuestion) {
        await questionApi.update(editingQuestion.id, formData);
      } else {
        await questionApi.create(formData);
      }
      setIsModalOpen(false);
      resetForm();
      loadQuestions();
      loadStats();
    } catch (error) {
      console.error('Failed to save question:', error);
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      text: question.text,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      difficulty: question.difficulty,
      category: question.category,
      analysis: question.analysis,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingQuestion(null);
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

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId === null) return;
    try {
      await questionApi.remove(deletingId);
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      loadQuestions();
      loadStats();
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!Array.isArray(data)) {
          throw new Error('JSON 文件必须是数组格式');
        }

        const validData: CreateQuestionRequest[] = [];
        data.forEach((item: any, index: number) => {
          if (
            typeof item.text !== 'string' ||
            !Array.isArray(item.options) ||
            item.options.length !== 4 ||
            typeof item.correctAnswer !== 'number' ||
            typeof item.difficulty !== 'number' ||
            typeof item.category !== 'string' ||
            typeof item.analysis !== 'string'
          ) {
            throw new Error(`第 ${index + 1} 条数据格式不正确`);
          }
          validData.push({
            text: item.text,
            options: item.options,
            correctAnswer: item.correctAnswer,
            difficulty: item.difficulty,
            category: item.category,
            analysis: item.analysis,
          });
        });

        setImportPreview(validData);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'JSON 解析失败');
        setImportPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    try {
      await questionApi.batchImport(importPreview);
      setIsImportModalOpen(false);
      setImportPreview([]);
      loadQuestions();
      loadStats();
    } catch (error) {
      console.error('Failed to import questions:', error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-white mb-2">题库管理</h1>
          <p className="text-slate-400">管理和维护游戏题目</p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>总题目数</CardDescription>
                <CardTitle className="text-3xl font-bold gradient-text">
                  {stats.total}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <BarChart3 className="h-4 w-4" />
                  <span>题库总量</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>平均正确率</CardDescription>
                <CardTitle className="text-3xl font-bold text-emerald-400">
                  {(stats.avgCorrectRate * 100).toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${stats.avgCorrectRate * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>按分类统计</CardDescription>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byCategory).map(([cat, count]) => (
                    <Badge key={cat} variant="info">
                      {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}: {count}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>按难度统计</CardDescription>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byDifficulty).map(([diff, count]) => (
                    <Badge key={diff} variant="default">
                      {DIFFICULTY_LABELS[Number(diff)]}: {count}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Input
                    label="搜索题目"
                    placeholder="输入关键词搜索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 bottom-3 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="w-40">
                <Select
                  label="分类"
                  value={category}
                  onChange={handleFilterChange}
                  options={[
                    { value: '', label: '全部分类' },
                    ...CATEGORIES.map((c) => ({
                      value: c,
                      label: CATEGORY_LABELS[c],
                    })),
                  ]}
                />
              </div>
              <div className="w-40">
                <Select
                  label="难度"
                  value={difficulty}
                  onChange={handleFilterChange}
                  options={[
                    { value: '', label: '全部难度' },
                    ...[1, 2, 3, 4, 5].map((d) => ({
                      value: String(d),
                      label: DIFFICULTY_LABELS[d],
                    })),
                  ]}
                />
              </div>
              <Button onClick={handleSearch} variant="secondary">
                <Search className="h-4 w-4 mr-2" />
                搜索
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                新增题目
              </Button>
              <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">
                <Upload className="h-4 w-4 mr-2" />
                批量导入
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-slate-400">加载中...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-slate-400">暂无题目</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">ID</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">题目</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">分类</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">难度</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">正确率</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">使用次数</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map((q) => {
                        const correctRate = q.usageCount > 0 ? q.correctCount / q.usageCount : 0;
                        return (
                          <tr key={q.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4 text-sm text-slate-400 font-mono">#{q.id}</td>
                            <td className="py-4 px-4">
                              <div className="text-white font-medium max-w-md truncate">{q.text}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                正确答案: {String.fromCharCode(65 + q.correctAnswer)}. {q.options[q.correctAnswer]}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge variant="info">
                                {CATEGORY_LABELS[q.category]}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-yellow-400">
                                {'★'.repeat(q.difficulty)}
                                {'☆'.repeat(5 - q.difficulty)}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-white/10 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      correctRate >= 0.7
                                        ? 'bg-emerald-500'
                                        : correctRate >= 0.4
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${correctRate * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm text-slate-300">
                                  {(correctRate * 100).toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-slate-300">{q.usageCount}</td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(q)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(q.id)}
                                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                  <p className="text-sm text-slate-400">
                    共 {total} 条，第 {page}/{totalPages || 1} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-10 h-10 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || totalPages === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQuestion ? '编辑题目' : '新增题目'}
        className="max-w-2xl"
      >
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
              placeholder="请输入题目解析"
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
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingQuestion ? '保存修改' : '创建题目'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="确认删除"
        className="max-w-md"
      >
        <div className="text-center py-4">
          <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">确定要删除这道题目吗？</h3>
          <p className="text-slate-400">此操作不可撤销</p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
            取消
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            删除
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportPreview([]);
          setImportError('');
        }}
        title="批量导入题目"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h4 className="font-medium text-white mb-2 flex items-center gap-2">
              <FileJson className="h-4 w-4 text-violet-400" />
              JSON 格式说明
            </h4>
            <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded-lg overflow-x-auto">
{`[{
  "text": "题目内容",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "correctAnswer": 0,
  "difficulty": 3,
  "category": "technology",
  "analysis": "题目解析"
}]`}
            </pre>
          </div>

          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all">
              <Upload className="h-8 w-8 text-slate-400 mb-2" />
              <span className="text-sm text-slate-300">点击或拖拽上传 JSON 文件</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {importError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-sm text-red-400">{importError}</p>
            </div>
          )}

          {importPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">预览 {importPreview.length} 道题目</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {importPreview.slice(0, 5).map((q, i) => (
                  <div key={i} className="glass rounded-lg p-3">
                    <div className="text-sm text-white">{q.text}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {CATEGORY_LABELS[q.category]} · {DIFFICULTY_LABELS[q.difficulty]}
                    </div>
                  </div>
                ))}
                {importPreview.length > 5 && (
                  <p className="text-sm text-slate-400 text-center">
                    还有 {importPreview.length - 5} 道题目...
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportPreview([]);
                setImportError('');
              }}
            >
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button
              onClick={handleImportConfirm}
              disabled={importPreview.length === 0}
            >
              <FileJson className="h-4 w-4 mr-2" />
              导入 {importPreview.length} 道
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
