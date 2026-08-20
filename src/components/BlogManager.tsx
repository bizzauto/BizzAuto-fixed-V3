import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, FileText, Edit3, Trash2, Eye, EyeOff, Tag, Clock,
  MessageSquare, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2,
  ChevronDown, ChevronRight, Image, Globe, BarChart3, Calendar,
  Settings, Filter, ArrowLeft, Save, Send, X, Bold, Italic, List,
  ListOrdered, Link2, Quote, Code, AlignLeft, AlignCenter, AlignRight,
  Hash, Tag as TagIcon, Upload, Star, Archive
} from 'lucide-react';
import { useAuthStore } from '../lib/authStore';

const blogAPI = {
  list: (params?: any) => fetch(`/api/blog/posts?${new URLSearchParams(params || {})}`).then(r => r.json()),
  get: (id: string) => fetch(`/api/blog/posts/${id}`).then(r => r.json()),
  create: (data: any) => fetch('/api/blog/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  update: (id: string, data: any) => fetch(`/api/blog/posts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  delete: (id: string) => fetch(`/api/blog/posts/${id}`, { method: 'DELETE' }).then(r => r.json()),
  publish: (id: string) => fetch(`/api/blog/posts/${id}/publish`, { method: 'POST' }).then(r => r.json()),
  unpublish: (id: string) => fetch(`/api/blog/posts/${id}/unpublish`, { method: 'POST' }).then(r => r.json()),
  categories: () => fetch('/api/blog/categories').then(r => r.json()),
  createCategory: (data: any) => fetch('/api/blog/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateCategory: (id: string, data: any) => fetch(`/api/blog/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteCategory: (id: string) => fetch(`/api/blog/categories/${id}`, { method: 'DELETE' }).then(r => r.json()),
  comments: (postId: string) => fetch(`/api/blog/posts/${postId}/comments`).then(r => r.json()),
  approveComment: (postId: string, commentId: string) => fetch(`/api/blog/posts/${postId}/comments/${commentId}/approve`, { method: 'POST' }).then(r => r.json()),
  rejectComment: (postId: string, commentId: string) => fetch(`/api/blog/posts/${postId}/comments/${commentId}/reject`, { method: 'POST' }).then(r => r.json()),
  deleteComment: (postId: string, commentId: string) => fetch(`/api/blog/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }).then(r => r.json()),
  stats: () => fetch('/api/blog/stats').then(r => r.json()),
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published';
  categoryId: string;
  categoryName?: string;
  tags: string[];
  featuredImage: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  viewCount: number;
  readingTime: number;
  author: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  comments?: BlogComment[];
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
  color: string;
}

interface BlogComment {
  id: string;
  postId: string;
  author: string;
  email: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalComments: number;
  pendingComments: number;
}

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

function calcReadingTime(text: string): number {
  const words = text.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function BlogManager() {
  const { user } = useAuthStore();
  const [view, setView] = useState<'posts' | 'editor' | 'categories' | 'comments'>('posts');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' } | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const [editorForm, setEditorForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    categoryId: '',
    tags: [] as string[],
    tagInput: '',
    featuredImage: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: [] as string[],
    keywordInput: '',
    status: 'draft' as 'draft' | 'published',
  });

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: CATEGORY_COLORS[0] });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (m: string, t: 'success' | 'error' = 'success') => {
    setToast({ m, t });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.categoryId = categoryFilter;
      if (searchQuery) params.search = searchQuery;
      const res = await blogAPI.list(params);
      if (res.success) {
        setPosts(res.data?.posts || res.data || []);
      } else {
        setPosts([]);
      }
    } catch {
      showToast('Failed to load posts', 'error');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await blogAPI.categories();
      if (res.success) {
        setCategories(res.data?.categories || res.data || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await blogAPI.stats();
      if (res.success) setStats(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const resetEditor = () => {
    setEditorForm({
      title: '', content: '', excerpt: '', categoryId: '', tags: [], tagInput: '',
      featuredImage: '', seoTitle: '', seoDescription: '', seoKeywords: [], keywordInput: '', status: 'draft'
    });
    setSelectedPost(null);
  };

  const openEditor = (post?: BlogPost) => {
    if (post) {
      setSelectedPost(post);
      setEditorForm({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        categoryId: post.categoryId,
        tags: post.tags || [],
        tagInput: '',
        featuredImage: post.featuredImage,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        seoKeywords: post.seoKeywords || [],
        keywordInput: '',
        status: post.status,
      });
    } else {
      resetEditor();
    }
    setView('editor');
  };

  const handleSave = async (publish?: boolean) => {
    if (!editorForm.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: editorForm.title,
        slug: slugify(editorForm.title),
        content: editorForm.content,
        excerpt: editorForm.excerpt || editorForm.content.replace(/<[^>]*>/g, '').slice(0, 160),
        categoryId: editorForm.categoryId || undefined,
        tags: editorForm.tags,
        featuredImage: editorForm.featuredImage,
        seoTitle: editorForm.seoTitle || editorForm.title,
        seoDescription: editorForm.seoDescription || editorForm.excerpt,
        seoKeywords: editorForm.seoKeywords,
        status: publish ? 'published' : editorForm.status,
        readingTime: calcReadingTime(editorForm.content),
      };

      if (selectedPost) {
        const res = await blogAPI.update(selectedPost.id, payload);
        if (res.success) {
          showToast('Post updated successfully');
        } else {
          showToast(res.message || 'Failed to update post', 'error');
        }
      } else {
        const res = await blogAPI.create(payload);
        if (res.success) {
          setSelectedPost(res.data);
          showToast('Post created successfully');
        } else {
          showToast(res.message || 'Failed to create post', 'error');
        }
      }
      fetchPosts();
      fetchStats();
    } catch {
      showToast('Failed to save post', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async (post: BlogPost) => {
    try {
      if (post.status === 'published') {
        await blogAPI.unpublish(post.id);
        showToast('Post unpublished');
      } else {
        await blogAPI.publish(post.id);
        showToast('Post published');
      }
      fetchPosts();
      fetchStats();
    } catch {
      showToast('Failed to toggle publish status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await blogAPI.delete(id);
      if (res.success) {
        showToast('Post deleted');
        fetchPosts();
        fetchStats();
        if (view === 'editor' && selectedPost?.id === id) {
          setView('posts');
          resetEditor();
        }
      }
    } catch {
      showToast('Failed to delete post', 'error');
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) return;
    try {
      if (editingCategory) {
        await blogAPI.updateCategory(editingCategory, categoryForm);
        showToast('Category updated');
      } else {
        await blogAPI.createCategory(categoryForm);
        showToast('Category created');
      }
      setCategoryForm({ name: '', description: '', color: CATEGORY_COLORS[0] });
      setEditingCategory(null);
      fetchCategories();
    } catch {
      showToast('Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await blogAPI.deleteCategory(id);
      showToast('Category deleted');
      fetchCategories();
    } catch {
      showToast('Failed to delete category', 'error');
    }
  };

  const openComments = async (postId: string) => {
    setCommentsPostId(postId);
    setView('comments');
    setLoadingComments(true);
    try {
      const res = await blogAPI.comments(postId);
      if (res.success) {
        setComments(res.data?.comments || res.data || []);
      }
    } catch {
      showToast('Failed to load comments', 'error');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentAction = async (commentId: string, action: 'approve' | 'reject' | 'delete') => {
    if (!commentsPostId) return;
    try {
      if (action === 'approve') await blogAPI.approveComment(commentsPostId, commentId);
      else if (action === 'reject') await blogAPI.rejectComment(commentsPostId, commentId);
      else await blogAPI.deleteComment(commentsPostId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      showToast(`Comment ${action === 'delete' ? 'deleted' : action + 'd'}`);
      fetchStats();
    } catch {
      showToast('Failed to update comment', 'error');
    }
  };

  const addTag = (type: 'tags' | 'seoKeywords') => {
    const input = type === 'tags' ? editorForm.tagInput : editorForm.keywordInput;
    const value = input.trim();
    if (!value) return;
    const list = type === 'tags' ? editorForm.tags : editorForm.seoKeywords;
    if (list.includes(value)) return;
    if (type === 'tags') {
      setEditorForm(prev => ({ ...prev, tags: [...prev.tags, value], tagInput: '' }));
    } else {
      setEditorForm(prev => ({ ...prev, seoKeywords: [...prev.seoKeywords, value], keywordInput: '' }));
    }
  };

  const removeTag = (type: 'tags' | 'seoKeywords', value: string) => {
    if (type === 'tags') {
      setEditorForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== value) }));
    } else {
      setEditorForm(prev => ({ ...prev, seoKeywords: prev.seoKeywords.filter(k => k !== value) }));
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = editorForm.content.substring(start, end);
    const before = editorForm.content.substring(0, start);
    const after = editorForm.content.substring(end);
    setEditorForm(prev => ({
      ...prev,
      content: before + prefix + selected + suffix + after
    }));
  };

  const filteredPosts = posts.filter(p => {
    const matchSearch = !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSearch;
  });

  const pendingComments = comments.filter(c => c.status === 'pending');
  const approvedComments = comments.filter(c => c.status === 'approved');
  const rejectedComments = comments.filter(c => c.status === 'rejected');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium transition-all ${
          toast.t === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.t === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.m}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'posts' && (
              <button onClick={() => { setView('posts'); resetEditor(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {view === 'posts' && 'Blog Manager'}
                {view === 'editor' && (selectedPost ? 'Edit Post' : 'New Post')}
                {view === 'categories' && 'Categories'}
                {view === 'comments' && 'Comments'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {view === 'posts' && 'Create and manage your blog content'}
                {view === 'editor' && 'Write and configure your post'}
                {view === 'categories' && 'Organize your posts by category'}
                {view === 'comments' && 'Moderate reader comments'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === 'posts' && (
              <>
                <button onClick={() => { fetchPosts(); fetchCategories(); fetchStats(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh">
                  <RefreshCw size={18} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button onClick={() => openEditor()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  <Plus size={16} /> New Post
                </button>
              </>
            )}
            {view === 'editor' && (
              <>
                <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Draft
                </button>
                <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Publish
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {view === 'posts' && (
        <div className="p-4 sm:p-5 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Posts</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats?.totalPosts ?? posts.length}</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><FileText size={20} className="text-blue-600 dark:text-blue-400" /></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats?.publishedPosts ?? posts.filter(p => p.status === 'published').length}</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"><Globe size={20} className="text-green-600 dark:text-green-400" /></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Views</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{(stats?.totalViews ?? 0).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><Eye size={20} className="text-purple-600 dark:text-purple-400" /></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending Comments</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats?.pendingComments ?? 0}</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"><MessageSquare size={20} className="text-orange-600 dark:text-orange-400" /></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts by title or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => setView('categories')} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Settings size={16} /> Categories
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No posts found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Create your first blog post to get started</p>
              <button onClick={() => openEditor()} className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium mx-auto">
                <Plus size={16} /> New Post
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                      <th className="text-left px-4 sm:px-5 md:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Post</th>
                      <th className="text-left px-4 sm:px-5 md:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 sm:px-5 md:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                      <th className="text-left px-4 sm:px-5 md:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Views</th>
                      <th className="text-left px-4 sm:px-5 md:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reading</th>
                      <th className="text-left px-4 sm:px-5 md:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="text-right px-4 sm:px-5 md:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredPosts.map(post => (
                      <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="px-4 sm:px-5 md:px-6 py-4">
                          <div className="flex items-start gap-3">
                            {post.featuredImage ? (
                              <img src={post.featuredImage} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <FileText size={20} className="text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-xs">{post.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs mt-0.5">{post.excerpt || 'No excerpt'}</p>
                              {(post.tags || []).length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {post.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{tag}</span>
                                  ))}
                                  {post.tags.length > 3 && <span className="text-[10px] text-gray-400">+{post.tags.length - 3}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-5 md:px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            post.status === 'published'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {post.status === 'published' ? <Globe size={12} /> : <Edit3 size={12} />}
                            {post.status === 'published' ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 md:px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {categories.find(c => c.id === post.categoryId)?.name || '—'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 md:px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{(post.viewCount || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 sm:px-5 md:px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Clock size={14} /> {post.readingTime || calcReadingTime(post.content)} min
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 md:px-6 py-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">{formatTimeAgo(post.createdAt)}</span>
                        </td>
                        <td className="px-4 sm:px-5 md:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditor(post)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Edit">
                              <Edit3 size={15} className="text-gray-500 dark:text-gray-400" />
                            </button>
                            <button onClick={() => handlePublishToggle(post)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title={post.status === 'published' ? 'Unpublish' : 'Publish'}>
                              {post.status === 'published' ? <EyeOff size={15} className="text-orange-500" /> : <Eye size={15} className="text-green-500" />}
                            </button>
                            <button onClick={() => openComments(post.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Comments">
                              <MessageSquare size={15} className="text-gray-500 dark:text-gray-400" />
                            </button>
                            <button onClick={() => handleDelete(post.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                              <Trash2 size={15} className="text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'editor' && (
        <div className="p-4 sm:p-5 md:p-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={editorForm.title}
                  onChange={(e) => setEditorForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter post title..."
                  className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <button onClick={() => insertMarkdown('**', '**')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Bold"><Bold size={16} /></button>
                  <button onClick={() => insertMarkdown('*', '*')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Italic"><Italic size={16} /></button>
                  <button onClick={() => insertMarkdown('# ')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Heading"><Hash size={16} /></button>
                  <button onClick={() => insertMarkdown('\n> ')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Quote"><Quote size={16} /></button>
                  <button onClick={() => insertMarkdown('`', '`')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Code"><Code size={16} /></button>
                  <button onClick={() => insertMarkdown('\n- ')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="List"><List size={16} /></button>
                  <button onClick={() => insertMarkdown('\n1. ')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Ordered List"><ListOrdered size={16} /></button>
                  <button onClick={() => insertMarkdown('[', '](url)')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Link"><Link2 size={16} /></button>
                  <button onClick={() => insertMarkdown('\n![alt](', ')')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Image"><Image size={16} /></button>
                  <div className="flex-1" />
                  <span className="text-xs text-gray-400">{calcReadingTime(editorForm.content)} min read</span>
                </div>
                <textarea
                  ref={contentRef}
                  value={editorForm.content}
                  onChange={(e) => setEditorForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your blog post content here... Markdown supported."
                  rows={20}
                  className="w-full px-4 py-3 font-mono text-sm border-0 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none resize-y min-h-[400px]"
                />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Excerpt</label>
                <textarea
                  value={editorForm.excerpt}
                  onChange={(e) => setEditorForm(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief summary of the post (auto-generated if empty)..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Publishing</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                    <select
                      value={editorForm.status}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Category</label>
                    <select
                      value={editorForm.categoryId}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">No category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Featured Image URL</label>
                    <input
                      type="url"
                      value={editorForm.featuredImage}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, featuredImage: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  {editorForm.featuredImage && (
                    <img src={editorForm.featuredImage} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                  )}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock size={14} />
                      <span>{calcReadingTime(editorForm.content)} min read</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tags</h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={editorForm.tagInput}
                    onChange={(e) => setEditorForm(prev => ({ ...prev, tagInput: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('tags'); } }}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                  />
                  <button onClick={() => addTag('tags')} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {editorForm.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                      {tag}
                      <button onClick={() => removeTag('tags', tag)} className="hover:text-blue-900 dark:hover:text-blue-100"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Globe size={16} /> SEO Settings
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">SEO Title</label>
                    <input
                      type="text"
                      value={editorForm.seoTitle}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, seoTitle: e.target.value }))}
                      placeholder={editorForm.title || 'SEO title...'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{(editorForm.seoTitle || editorForm.title || '').length}/60 characters</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Meta Description</label>
                    <textarea
                      value={editorForm.seoDescription}
                      onChange={(e) => setEditorForm(prev => ({ ...prev, seoDescription: e.target.value }))}
                      placeholder="SEO meta description..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm resize-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{(editorForm.seoDescription || '').length}/160 characters</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Keywords</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={editorForm.keywordInput}
                        onChange={(e) => setEditorForm(prev => ({ ...prev, keywordInput: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag('seoKeywords'); } }}
                        placeholder="Add keyword..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                      />
                      <button onClick={() => addTag('seoKeywords')} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {editorForm.seoKeywords.map(kw => (
                        <span key={kw} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                          {kw}
                          <button onClick={() => removeTag('seoKeywords', kw)} className="hover:text-purple-900 dark:hover:text-purple-100"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'categories' && (
        <div className="p-4 sm:p-5 md:p-6 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 md:p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Category name..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                <div className="flex gap-2">
                  {CATEGORY_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${categoryForm.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveCategory} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
                  {editingCategory ? <Save size={16} /> : <Plus size={16} />}
                  {editingCategory ? 'Update' : 'Create'} Category
                </button>
                {editingCategory && (
                  <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', color: CATEGORY_COLORS[0] }); }} className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 sm:px-5 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Categories</h3>
            </div>
            {categories.length === 0 ? (
              <div className="p-4 sm:p-6 md:p-8 text-center text-gray-500 dark:text-gray-400">
                <Tag size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>No categories yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between px-4 sm:px-5 md:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color || '#3B82F6' }} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</p>
                        {cat.description && <p className="text-xs text-gray-500 dark:text-gray-400">{cat.description}</p>}
                      </div>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">{cat.postCount || 0} posts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingCategory(cat.id); setCategoryForm({ name: cat.name, description: cat.description, color: cat.color || CATEGORY_COLORS[0] }); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><Edit3 size={15} className="text-gray-500" /></button>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={15} className="text-red-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'comments' && (
        <div className="p-4 sm:p-5 md:p-6 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 sm:px-5 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Comments</h3>
                <div className="flex gap-3 text-sm">
                  <span className="text-orange-600 dark:text-orange-400">{pendingComments.length} pending</span>
                  <span className="text-green-600 dark:text-green-400">{approvedComments.length} approved</span>
                  <span className="text-red-600 dark:text-red-400">{rejectedComments.length} rejected</span>
                </div>
              </div>
            </div>
            {loadingComments ? (
              <div className="p-12 flex justify-center"><Loader2 size={28} className="animate-spin text-blue-500" /></div>
            ) : comments.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <MessageSquare size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>No comments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {comments.map(comment => (
                  <div key={comment.id} className={`px-4 sm:px-5 md:px-6 py-4 ${comment.status === 'rejected' ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.author}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{comment.email}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            comment.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            comment.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {comment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{comment.content}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{formatTimeAgo(comment.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {comment.status !== 'approved' && (
                          <button onClick={() => handleCommentAction(comment.id, 'approve')} className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Approve">
                            <CheckCircle size={15} className="text-green-500" />
                          </button>
                        )}
                        {comment.status !== 'rejected' && (
                          <button onClick={() => handleCommentAction(comment.id, 'reject')} className="p-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg" title="Reject">
                            <XCircle size={15} className="text-orange-500" />
                          </button>
                        )}
                        <button onClick={() => handleCommentAction(comment.id, 'delete')} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                          <Trash2 size={15} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
