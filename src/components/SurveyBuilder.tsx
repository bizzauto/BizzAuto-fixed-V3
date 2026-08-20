import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, MoreVertical, Trash2, Edit3, Eye, Copy, BarChart3,
  Settings, ChevronDown, ChevronRight, GripVertical, X, Check,
  FileText, Mail, Phone, Hash, AlignLeft, List, CheckSquare, Star,
  Sliders, Calendar, Upload, Type, Minus, MessageSquare, ToggleLeft,
  Download, ArrowLeft, Save, ChevronUp, AlertCircle, ToggleRight
} from 'lucide-react';

type QuestionType = 'text' | 'email' | 'phone' | 'number' | 'textarea'
  | 'select' | 'multi-select' | 'radio' | 'checkbox'
  | 'rating' | 'nps' | 'date' | 'file'
  | 'heading' | 'paragraph' | 'divider';

type SurveyType = 'form' | 'survey' | 'nps' | 'poll' | 'quiz';

interface ConditionalLogic {
  enabled: boolean;
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: string;
}

interface Question {
  id: string;
  type: QuestionType;
  label: string;
  placeholder: string;
  required: boolean;
  options: string[];
  validation: {
    minLength: number;
    maxLength: number;
    pattern: string;
    customMessage: string;
  };
  conditionalLogic: ConditionalLogic;
}

interface Survey {
  id: string;
  name: string;
  type: SurveyType;
  status: 'draft' | 'published' | 'closed';
  submissionCount: number;
  completionRate: number;
  questions: Question[];
  settings: {
    thankYouMessage: string;
    redirectUrl: string;
    notificationEmail: string;
    allowMultipleSubmissions: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface Response {
  id: string;
  submittedAt: string;
  answers: Record<string, string>;
  status: 'complete' | 'partial';
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: typeof FileText }[] = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'textarea', label: 'Text Area', icon: AlignLeft },
  { type: 'select', label: 'Dropdown', icon: ChevronDown },
  { type: 'multi-select', label: 'Multi Select', icon: List },
  { type: 'radio', label: 'Radio Group', icon: CheckSquare },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'rating', label: 'Star Rating', icon: Star },
  { type: 'nps', label: 'NPS (0-10)', icon: Sliders },
  { type: 'date', label: 'Date Picker', icon: Calendar },
  { type: 'file', label: 'File Upload', icon: Upload },
  { type: 'heading', label: 'Heading', icon: Type },
  { type: 'paragraph', label: 'Paragraph', icon: FileText },
  { type: 'divider', label: 'Divider', icon: Minus },
];

const SURVEY_TYPES = ['form', 'survey', 'nps', 'poll', 'quiz'] as const;

const createDefaultQuestion = (type: QuestionType): Question => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  type,
  label: QUESTION_TYPES.find(t => t.type === type)?.label || type,
  placeholder: '',
  required: false,
  options: type === 'select' || type === 'multi-select' || type === 'radio' || type === 'checkbox'
    ? ['Option 1', 'Option 2', 'Option 3'] : [],
  validation: { minLength: 0, maxLength: 0, pattern: '', customMessage: '' },
  conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' },
});

const createDefaultSurvey = (): Survey => ({
  id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  name: 'Untitled Survey',
  type: 'form',
  status: 'draft',
  submissionCount: 0,
  completionRate: 0,
  questions: [],
  settings: {
    thankYouMessage: 'Thank you for your submission!',
    redirectUrl: '',
    notificationEmail: '',
    allowMultipleSubmissions: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const generateMockData = (): Survey[] => [
  {
    id: 's_1', name: 'Contact Us Form', type: 'form', status: 'published',
    submissionCount: 234, completionRate: 87, questions: [
      { id: 'q_1', type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true, options: [], validation: { minLength: 2, maxLength: 100, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
      { id: 'q_2', type: 'email', label: 'Email Address', placeholder: 'you@example.com', required: true, options: [], validation: { minLength: 0, maxLength: 0, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
      { id: 'q_3', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false, options: [], validation: { minLength: 0, maxLength: 0, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
      { id: 'q_4', type: 'textarea', label: 'Message', placeholder: 'How can we help you?', required: true, options: [], validation: { minLength: 10, maxLength: 1000, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
    ],
    settings: { thankYouMessage: 'Thanks! We will get back to you soon.', redirectUrl: '', notificationEmail: 'team@example.com', allowMultipleSubmissions: true },
    createdAt: '2026-04-10T08:00:00Z', updatedAt: '2026-05-20T14:30:00Z',
  },
  {
    id: 's_2', name: 'Customer Satisfaction Survey', type: 'survey', status: 'published',
    submissionCount: 156, completionRate: 72, questions: [
      { id: 'q_5', type: 'rating', label: 'Overall Satisfaction', placeholder: '', required: true, options: [], validation: { minLength: 0, maxLength: 0, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
      { id: 'q_6', type: 'nps', label: 'How likely are you to recommend us?', placeholder: '', required: true, options: [], validation: { minLength: 0, maxLength: 0, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
      { id: 'q_7', type: 'radio', label: 'What did you like most?', placeholder: '', required: false, options: ['Product Quality', 'Customer Service', 'Price', 'Delivery Speed'], validation: { minLength: 0, maxLength: 0, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
      { id: 'q_8', type: 'textarea', label: 'Additional Comments', placeholder: 'Share your thoughts...', required: false, options: [], validation: { minLength: 0, maxLength: 500, pattern: '', customMessage: '' }, conditionalLogic: { enabled: true, questionId: 'q_7', operator: 'equals', value: 'Customer Service' } },
    ],
    settings: { thankYouMessage: 'Thank you for your feedback!', redirectUrl: '', notificationEmail: 'feedback@example.com', allowMultipleSubmissions: false },
    createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-05-22T09:15:00Z',
  },
  {
    id: 's_3', name: 'NPS Score Survey', type: 'nps', status: 'published',
    submissionCount: 89, completionRate: 95, questions: [
      { id: 'q_9', type: 'nps', label: 'How likely are you to recommend us?', placeholder: '', required: true, options: [], validation: { minLength: 0, maxLength: 0, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
      { id: 'q_10', type: 'textarea', label: 'Why did you give that score?', placeholder: 'Tell us more...', required: false, options: [], validation: { minLength: 0, maxLength: 0, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
    ],
    settings: { thankYouMessage: 'Thanks for your score!', redirectUrl: '', notificationEmail: '', allowMultipleSubmissions: true },
    createdAt: '2026-05-01T12:00:00Z', updatedAt: '2026-05-28T11:00:00Z',
  },
  {
    id: 's_4', name: 'Team Poll', type: 'poll', status: 'draft',
    submissionCount: 0, completionRate: 0, questions: [
      { id: 'q_11', type: 'radio', label: 'Preferred meeting day?', placeholder: '', required: true, options: ['Monday', 'Wednesday', 'Friday'], validation: { minLength: 0, maxLength: 0, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
    ],
    settings: { thankYouMessage: 'Vote recorded!', redirectUrl: '', notificationEmail: '', allowMultipleSubmissions: false },
    createdAt: '2026-05-25T09:00:00Z', updatedAt: '2026-05-25T09:00:00Z',
  },
  {
    id: 's_5', name: 'Product Knowledge Quiz', type: 'quiz', status: 'closed',
    submissionCount: 67, completionRate: 60, questions: [
      { id: 'q_12', type: 'radio', label: 'What year was Company X founded?', placeholder: '', required: true, options: ['2010', '2015', '2018', '2020'], validation: { minLength: 0, maxLength: 0, pattern: '', customMessage: '' }, conditionalLogic: { enabled: false, questionId: '', operator: 'equals', value: '' } },
    ],
    settings: { thankYouMessage: 'Quiz complete!', redirectUrl: '/results', notificationEmail: '', allowMultipleSubmissions: true },
    createdAt: '2026-02-01T08:00:00Z', updatedAt: '2026-04-30T18:00:00Z',
  },
];

const generateMockResponses = (surveyId: string): Response[] => {
  if (surveyId !== 's_1' && surveyId !== 's_2') return [];
  return Array.from({ length: surveyId === 's_1' ? 5 : 3 }, (_, i): Response => ({
    id: `r_${i + 1}`,
    submittedAt: new Date(Date.now() - i * 86400000).toISOString(),
    status: i < 1 ? 'partial' : 'complete',
    answers: (surveyId === 's_1'
      ? { q_1: ['Alice Smith', 'Bob Jones', 'Carol White', 'Dave Brown', 'Eve Black'][i], q_2: `user${i + 1}@email.com`, q_4: 'Sample message content' }
      : { q_5: `${4 + (i % 2)}`, q_6: `${7 + i}`, q_7: 'Product Quality' }) as Record<string, string>,
  }));
};

export default function SurveyBuilder() {
  const [view, setView] = useState<'list' | 'editor' | 'responses'>('list');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<SurveyType | ''>('');
  const [loading, setLoading] = useState(true);
  const [dragType, setDragType] = useState<QuestionType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/surveys');
      const data = await res.json();
      if (data.success) {
        setSurveys(data.data.surveys.map((s: any) => ({
          ...s,
          type: (s.questions?.[0]?.type ? 'form' : 'survey') as SurveyType,
          questions: (s.questions || []).map((q: any) => ({
            ...q,
            validation: q.validation || { minLength: 0, maxLength: 0, pattern: '', customMessage: '' },
            conditionalLogic: q.conditionalLogic || { enabled: false, questionId: '', operator: 'equals', value: '' },
          })),
        })));
      }
    } catch {
    if (surveys.length === 0) {
      const mockData = generateMockData();
      setSurveys(mockData.map(s => ({
        ...s,
        questions: s.questions.map(q => ({
          ...q,
          validation: q.validation || { minLength: 0, maxLength: 0, pattern: '', customMessage: '' },
          conditionalLogic: q.conditionalLogic || { enabled: false, questionId: '', operator: 'equals', value: '' },
        })),
      })));
    }
    }
    finally { setLoading(false); }
  };

  const loadResponses = async (surveyId: string) => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}/results`);
      const data = await res.json();
      if (data.success) {
        setResponses((data.data.submissions || []).map((s: any) => ({
          id: s.id,
          submittedAt: s.createdAt,
          status: s.completed ? 'complete' : 'partial',
          answers: s.answers || {},
        })));
      }
    } catch { /* ignore */ }
    // Fallback: use generateMockResponses when API is unavailable
    if (responses.length === 0 && surveyId) {
      setResponses(generateMockResponses(surveyId));
    }
  };

  const filtered = surveys.filter(s => {
    if (typeFilter && s.type !== typeFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedQuestion = activeSurvey?.questions.find(q => q.id === selectedQuestionId) || null;

  const openEditor = (survey: Survey) => {
    setActiveSurvey(JSON.parse(JSON.stringify(survey)));
    setSelectedQuestionId(null);
    setView('editor');
  };

  const openResponses = (survey: Survey) => {
    setActiveSurvey(survey);
    loadResponses(survey.id);
    setView('responses');
  };

  const updateSurvey = (updater: (s: Survey) => void) => {
    if (!activeSurvey) return;
    const copy = JSON.parse(JSON.stringify(activeSurvey)) as Survey;
    updater(copy);
    copy.updatedAt = new Date().toISOString();
    setActiveSurvey(copy);
    setSurveys(prev => prev.map(s => s.id === copy.id ? copy : s));
  };

  const addQuestion = (type: QuestionType) => {
    updateSurvey(s => { s.questions.push(createDefaultQuestion(type)); });
    if (activeSurvey) {
      setSelectedQuestionId(activeSurvey.questions[activeSurvey.questions.length].id);
    }
  };

  const updateQuestion = (questionId: string, updater: (q: Question) => void) => {
    updateSurvey(s => {
      const q = s.questions.find(q => q.id === questionId);
      if (q) updater(q);
    });
  };

  const deleteQuestion = (questionId: string) => {
    updateSurvey(s => { s.questions = s.questions.filter(q => q.id !== questionId); });
    if (selectedQuestionId === questionId) setSelectedQuestionId(null);
  };

  const moveQuestion = (index: number, dir: -1 | 1) => {
    updateSurvey(s => {
      const newIdx = index + dir;
      if (newIdx < 0 || newIdx >= s.questions.length) return;
      [s.questions[index], s.questions[newIdx]] = [s.questions[newIdx], s.questions[index]];
    });
  };

  const handleDragStart = (type: QuestionType) => setDragType(type);
  const handleDrop = () => { if (dragType) { addQuestion(dragType); setDragType(null); } };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleExportCSV = () => {
    if (!activeSurvey || responses.length === 0) return;
    const headers = activeSurvey.questions.map(q => q.label);
    const rows = responses.map(r => activeSurvey.questions.map(q => r.answers[q.id] || ''));
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeSurvey.name}_responses.csv`;
    a.click();
  };

  const handleSave = async () => {
    if (!activeSurvey) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/surveys/${activeSurvey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: activeSurvey.name,
          description: activeSurvey.settings?.thankYouMessage || '',
          questions: activeSurvey.questions.map(q => ({ id: q.id, type: q.type, label: q.label, placeholder: q.placeholder, required: q.required, options: q.options })),
          status: activeSurvey.status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSurveys(prev => prev.map(s => s.id === activeSurvey.id ? activeSurvey : s));
        alert('Survey saved successfully!');
      } else { alert(data.error || 'Failed to save'); }
    } catch { alert('Failed to save survey'); }
    finally { setSaving(false); }
  };

  const handleCreateSurvey = async (name: string, type: SurveyType) => {
    try {
      setSaving(true);
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, questions: [createDefaultQuestion('text')], description: '' }),
      });
      const data = await res.json();
      if (data.success) {
        const newSurvey: Survey = { ...data.data.survey, type, questions: (data.data.survey.questions || []).map((q: any) => ({ ...q, validation: q.validation || { minLength: 0, maxLength: 0, pattern: '', customMessage: '' }, conditionalLogic: q.conditionalLogic || { enabled: false, questionId: '', operator: 'equals', value: '' } })), settings: { thankYouMessage: 'Thank you!', redirectUrl: '', notificationEmail: '', allowMultipleSubmissions: true } };
        setSurveys(prev => [newSurvey, ...prev]);
        setActiveSurvey(newSurvey);
        setView('editor');
      } else { alert(data.error || 'Failed to create'); }
    } catch { alert('Failed to create survey'); }
    finally { setSaving(false); }
  };

  const handleDeleteSurvey = async (id: string) => {
    if (!confirm('Delete this survey?')) return;
    try {
      const res = await fetch(`/api/surveys/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSurveys(prev => prev.filter(s => s.id !== id));
      } else { alert(data.error); }
    } catch { alert('Failed to delete'); }
  };

  const statusColor = (s: string) => {
    if (s === 'published') return 'bg-emerald-100 text-emerald-700';
    if (s === 'closed') return 'bg-slate-100 text-slate-500';
    return 'bg-amber-100 text-amber-700';
  };

  const typeColor = (t: string) => {
    const m: Record<string, string> = { form: 'bg-blue-100 text-blue-700', survey: 'bg-purple-100 text-purple-700', nps: 'bg-orange-100 text-orange-700', poll: 'bg-teal-100 text-teal-700', quiz: 'bg-rose-100 text-rose-700' };
    return m[t] || 'bg-slate-100 text-slate-600';
  };

  const renderQuestionPreview = (q: Question, idx: number) => {
    const isSelected = selectedQuestionId === q.id;
    const conditionalBadge = q.conditionalLogic.enabled && (
      <span className="ml-2 text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-200">Conditional</span>
    );
    const requiredBadge = q.required && (
      <span className="ml-1 text-red-500">*</span>
    );

    return (
      <div
        key={q.id}
        className={`group relative border rounded-lg p-4 mb-3 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}
        onClick={() => setSelectedQuestionId(q.id)}
      >
        <div className="absolute -left-9 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex flex-col gap-0.5 transition-opacity">
          <button className="p-0.5 text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); moveQuestion(idx, -1); }}><ChevronUp size={14} /></button>
          <button className="p-0.5 text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); moveQuestion(idx, 1); }}><ChevronDown size={14} /></button>
        </div>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center">
            <GripVertical size={14} className="text-slate-300 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="font-medium text-slate-800 text-sm">{q.label}{requiredBadge}{conditionalBadge}</span>
          </div>
          <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all" onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}>
            <Trash2 size={14} />
          </button>
        </div>
        <div className="ml-6">
          {q.type === 'text' && <input disabled placeholder={q.placeholder || 'Text input'} className="w-full border border-slate-200 rounded px-3 py-2 text-sm text-slate-400 bg-slate-50" />}
          {q.type === 'email' && <input disabled placeholder={q.placeholder || 'email@example.com'} className="w-full border border-slate-200 rounded px-3 py-2 text-sm text-slate-400 bg-slate-50" />}
          {q.type === 'phone' && <input disabled placeholder={q.placeholder || '+1 (555) 000-0000'} className="w-full border border-slate-200 rounded px-3 py-2 text-sm text-slate-400 bg-slate-50" />}
          {q.type === 'number' && <input disabled type="number" placeholder={q.placeholder || '0'} className="w-full border border-slate-200 rounded px-3 py-2 text-sm text-slate-400 bg-slate-50" />}
          {q.type === 'textarea' && <textarea disabled placeholder={q.placeholder || 'Type your answer...'} className="w-full border border-slate-200 rounded px-3 py-2 text-sm text-slate-400 bg-slate-50 h-20 resize-none" />}
          {q.type === 'select' && (
            <select disabled className="w-full border border-slate-200 rounded px-3 py-2 text-sm text-slate-400 bg-slate-50">
              <option>{q.options[0] || 'Select...'}</option>
            </select>
          )}
          {q.type === 'multi-select' && (
            <div className="flex flex-wrap gap-2">{q.options.map((o, i) => (
              <label key={i} className="flex items-center gap-1.5 text-sm text-slate-500">
                <input type="checkbox" disabled className="rounded border-slate-300" />{o}
              </label>
            ))}</div>
          )}
          {(q.type === 'radio' || q.type === 'checkbox') && (
            <div className="flex flex-wrap gap-3">{q.options.map((o, i) => (
              <label key={i} className="flex items-center gap-1.5 text-sm text-slate-500">
                <input type={q.type === 'radio' ? 'radio' : 'checkbox'} disabled name={q.id} className="border-slate-300" />{o}
              </label>
            ))}</div>
          )}
          {q.type === 'rating' && (
            <div className="flex gap-1">{[1, 2, 3, 4, 5].map(n => (
              <Star key={n} size={20} className="text-slate-200" />
            ))}</div>
          )}
          {q.type === 'nps' && (
            <div className="flex gap-1">{Array.from({ length: 11 }, (_, i) => (
              <button key={i} className="w-8 h-8 rounded border border-slate-200 text-xs text-slate-400 bg-white hover:bg-slate-50">{i}</button>
            ))}</div>
          )}
          {q.type === 'date' && <input disabled type="date" className="w-full border border-slate-200 rounded px-3 py-2 text-sm text-slate-400 bg-slate-50" />}
          {q.type === 'file' && (
            <div className="border-2 border-dashed border-slate-200 rounded p-4 text-center text-sm text-slate-400">
              <Upload size={16} className="mx-auto mb-1" />Click or drag to upload
            </div>
          )}
          {q.type === 'heading' && <h3 className="text-lg font-semibold text-slate-800">{q.label}</h3>}
          {q.type === 'paragraph' && <p className="text-sm text-slate-600">{q.placeholder || 'Paragraph text goes here...'}</p>}
          {q.type === 'divider' && <hr className="border-slate-200" />}
        </div>
      </div>
    );
  };

  const renderProperties = () => {
    if (!selectedQuestion) return (
      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
        <div className="text-center">
          <FileText size={32} className="mx-auto mb-2 text-slate-300" />
          <p>Select a question to edit its properties</p>
        </div>
      </div>
    );

    const q = selectedQuestion;
    const isOptionType = ['select', 'multi-select', 'radio', 'checkbox'].includes(q.type);

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Question Type</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded border border-slate-200">
            {QUESTION_TYPES.find(t => t.type === q.type)?.icon && (() => {
              const Icon = QUESTION_TYPES.find(t => t.type === q.type)!.icon;
              return <Icon size={14} className="text-slate-500" />;
            })()}
            <span className="text-sm text-slate-700">{QUESTION_TYPES.find(t => t.type === q.type)?.label}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Label</label>
          <input
            value={q.label}
            onChange={e => updateQuestion(q.id, q => { q.label = e.target.value; })}
            className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
        </div>

        {!['heading', 'paragraph', 'divider'].includes(q.type) && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Placeholder</label>
            <input
              value={q.placeholder}
              onChange={e => updateQuestion(q.id, q => { q.placeholder = e.target.value; })}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>
        )}

        {!['heading', 'paragraph', 'divider'].includes(q.type) && (
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-medium text-slate-500">Required</label>
            <button onClick={() => updateQuestion(q.id, q => { q.required = !q.required; })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${q.required ? 'bg-blue-500' : 'bg-slate-300'}`}>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${q.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        )}

        {isOptionType && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Options</label>
            <div className="space-y-1.5">
              {q.options.map((opt, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    value={opt}
                    onChange={e => updateQuestion(q.id, q => { q.options[i] = e.target.value; })}
                    className="flex-1 border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => updateQuestion(q.id, q => { q.options.splice(i, 1); })}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  ><X size={14} /></button>
                </div>
              ))}
              <button
                onClick={() => updateQuestion(q.id, q => { q.options.push(`Option ${q.options.length + 1}`); })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              ><Plus size={12} /> Add option</button>
            </div>
          </div>
        )}

        {['text', 'textarea', 'email', 'phone', 'number'].includes(q.type) && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-500">Validation</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Min Length</label>
                <input type="number" min={0} value={q.validation.minLength}
                  onChange={e => updateQuestion(q.id, q => { q.validation.minLength = Number(e.target.value); })}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Max Length</label>
                <input type="number" min={0} value={q.validation.maxLength}
                  onChange={e => updateQuestion(q.id, q => { q.validation.maxLength = Number(e.target.value); })}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Pattern (Regex)</label>
              <input value={q.validation.pattern}
                onChange={e => updateQuestion(q.id, q => { q.validation.pattern = e.target.value; })}
                placeholder="e.g. ^[a-zA-Z]+$"
                className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Custom Error Message</label>
              <input value={q.validation.customMessage}
                onChange={e => updateQuestion(q.id, q => { q.validation.customMessage = e.target.value; })}
                placeholder="This field is invalid"
                className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
        )}

        {!['heading', 'paragraph', 'divider'].includes(q.type) && (
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500">Conditional Logic</label>
              <button onClick={() => updateQuestion(q.id, q => { q.conditionalLogic.enabled = !q.conditionalLogic.enabled; })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${q.conditionalLogic.enabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${q.conditionalLogic.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {q.conditionalLogic.enabled && (
              <div className="space-y-2 bg-slate-50 rounded p-3 border border-slate-200">
                <p className="text-[10px] text-slate-500">Show this question if:</p>
                <select
                  value={q.conditionalLogic.questionId}
                  onChange={e => updateQuestion(q.id, q => { q.conditionalLogic.questionId = e.target.value; })}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
                >
                  <option value="">Select a question...</option>
                  {activeSurvey?.questions.filter(oq => oq.id !== q.id).map(oq => (
                    <option key={oq.id} value={oq.id}>{oq.label}</option>
                  ))}
                </select>
                <select
                  value={q.conditionalLogic.operator}
                  onChange={e => updateQuestion(q.id, q => { q.conditionalLogic.operator = e.target.value as ConditionalLogic['operator']; })}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="contains">Contains</option>
                  <option value="not_contains">Not Contains</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                </select>
                <input
                  value={q.conditionalLogic.value}
                  onChange={e => updateQuestion(q.id, q => { q.conditionalLogic.value = e.target.value; })}
                  placeholder="Value..."
                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Surveys & Forms</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage your surveys, forms, and polls</p>
        </div>
        <button
          onClick={() => { const name = prompt('Survey name:'); if (name) handleCreateSurvey(name, 'form'); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Create Survey
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search surveys..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <div className="flex gap-1.5">
            {SURVEY_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${typeFilter === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading surveys...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No surveys found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Submissions</th>
                  <th className="px-4 py-3">Completion</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(survey => (
                  <tr key={survey.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-slate-800">{survey.name}</div>
                      <div className="text-xs text-slate-400">{survey.questions.length} questions</div>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColor(survey.type)}`}>{survey.type}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600">{survey.questions.length}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{survey.submissionCount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${survey.completionRate}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{survey.completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(survey.status)}`}>{survey.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditor(survey)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => openResponses(survey)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Responses">
                          <BarChart3 size={15} />
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`https://forms.example.com/${survey.id}`); }} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors" title="Copy Link">
                          <Copy size={15} />
                        </button>
                        <button onClick={() => handleDeleteSurvey(survey.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderEditor = () => {
    if (!activeSurvey) return null;
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
              <ArrowLeft size={18} />
            </button>
            <input
              value={activeSurvey.name}
              onChange={e => updateSurvey(s => { s.name = e.target.value; })}
              className="text-lg font-semibold text-slate-800 border-none focus:outline-none focus:ring-0 bg-transparent"
            />
            <select
              value={activeSurvey.type}
              onChange={e => updateSurvey(s => { s.type = e.target.value as SurveyType; })}
              className="text-xs font-medium px-2 py-1 rounded border border-slate-200 text-slate-600 bg-white focus:outline-none"
            >
              {SURVEY_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
            <select
              value={activeSurvey.status}
              onChange={e => updateSurvey(s => { s.status = e.target.value as Survey['status']; })}
              className={`text-xs font-medium px-2 py-1 rounded border border-slate-200 bg-white focus:outline-none ${statusColor(activeSurvey.status)}`}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('editor')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Eye size={14} /> Preview
            </button>
            <button onClick={() => setView('responses')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <BarChart3 size={14} /> Responses
            </button>
            <button onClick={() => setView('editor')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Settings size={14} /> Settings
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
              <Save size={14} /> Save
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 bg-slate-50 border-r border-slate-200 p-3 overflow-y-auto">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2 px-1">Question Types</p>
            <div className="space-y-1">
              {QUESTION_TYPES.map(({ type, label, icon: Icon }) => (
                <div
                  key={type}
                  draggable
                  onDragStart={() => handleDragStart(type)}
                  onDragEnd={() => setDragType(null)}
                  onClick={() => addQuestion(type)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-600 hover:bg-white hover:text-slate-800 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all border border-transparent hover:border-slate-200"
                >
                  <Icon size={15} className="text-slate-400" />
                  {label}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-3 px-1">Drag or click to add</p>
          </div>

          <div
            className="flex-1 overflow-y-auto bg-slate-100/50 p-4 sm:p-5 md:p-6"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="max-w-xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 md:p-6 min-h-[400px]">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">{activeSurvey.name}</h2>
                <p className="text-sm text-slate-400 mt-1">{activeSurvey.questions.length} questions</p>
              </div>
              {activeSurvey.questions.length === 0 ? (
                <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                  <FileText size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">Click or drag questions here to start building</p>
                </div>
              ) : (
                activeSurvey.questions.map((q, idx) => renderQuestionPreview(q, idx))
              )}
            </div>
          </div>

          <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto">
            <div className="p-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Properties</h3>
            </div>
            <div className="p-4">
              {renderProperties()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResponses = () => {
    if (!activeSurvey) return null;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Responses</h1>
              <p className="text-sm text-slate-500 mt-0.5">{activeSurvey.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Download size={15} /> Export CSV
            </button>
            <button onClick={() => setView('editor')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Edit3 size={15} /> Edit Survey
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-2xl sm:text-3xl font-bold text-slate-800">{activeSurvey.submissionCount.toLocaleString()}</div>
            <div className="text-sm text-slate-500 mt-1">Total Submissions</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-2xl sm:text-3xl font-bold text-slate-800">{activeSurvey.completionRate}%</div>
            <div className="text-sm text-slate-500 mt-1">Completion Rate</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-2xl sm:text-3xl font-bold text-slate-800">{responses.length}</div>
            <div className="text-sm text-slate-500 mt-1">Recent Responses</div>
          </div>
        </div>

        {activeSurvey.settings.notificationEmail && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-blue-700">
            <Mail size={15} />
            Notifications sent to: <strong>{activeSurvey.settings.notificationEmail}</strong>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {responses.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <BarChart3 size={32} className="mx-auto mb-3 text-slate-300" />
              <p>No responses yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Status</th>
                    {activeSurvey.questions.filter(q => !['heading', 'paragraph', 'divider'].includes(q.type)).map(q => (
                      <th key={q.id} className="px-4 py-3">{q.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map(r => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{r.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{new Date(r.submittedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'complete' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                      </td>
                      {activeSurvey.questions.filter(q => !['heading', 'paragraph', 'divider'].includes(q.type)).map(q => (
                        <td key={q.id} className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">{r.answers[q.id] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="flex-1 overflow-hidden p-4 sm:p-5 md:p-6">
        {view === 'list' && renderListView()}
        {view === 'editor' && renderEditor()}
        {view === 'responses' && renderResponses()}
      </div>
    </div>
  );
}
