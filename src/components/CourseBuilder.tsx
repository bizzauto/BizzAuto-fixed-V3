import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, BookOpen, Users, Clock, BarChart3, Loader2, Search, Edit2, Trash2, Copy, Eye } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  price: number;
  currency: string;
  accessType: string;
  isPublished: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: { modules: number; enrollments: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CourseBuilder() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterPublished, setFilterPublished] = useState<string>('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '', description: '', thumbnail: '', price: 0, currency: 'INR',
    accessType: 'free', dripContent: false, dripInterval: 1, isActive: true, isPublished: false
  });
  const [creating, setCreating] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [updating, setUpdating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (filterPublished) params.set('isPublished', filterPublished);

      const res = await fetch(`/api/courses?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCourses(data.data.courses);
        setPagination(data.data.pagination);
      } else {
        setError(data.error || 'Failed to load courses');
      }
    } catch {
      setError('Network error loading courses');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterPublished]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleCreateCourse = async () => {
    if (!newCourse.name.trim()) { setError('Course name is required'); return; }
    try {
      setCreating(true);
      const res = await fetch('/api/courses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(newCourse),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setNewCourse({ name: '', description: '', thumbnail: '', price: 0, currency: 'INR', accessType: 'free', dripContent: false, dripInterval: 1, isActive: true, isPublished: false });
        fetchCourses();
      } else {
        setError(data.error || 'Failed to create course');
      }
    } catch { setError('Network error creating course'); }
    finally { setCreating(false); }
  };

  const handleUpdateCourse = async () => {
    if (!editCourse) return;
    try {
      setUpdating(true);
      const res = await fetch(`/api/courses/${editCourse.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          name: editCourse.name, description: editCourse.description, thumbnail: editCourse.thumbnail,
          price: editCourse.price, currency: editCourse.currency, accessType: editCourse.accessType,
          isActive: editCourse.isActive, isPublished: editCourse.isPublished,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditOpen(false); setEditCourse(null); fetchCourses();
      } else { setError(data.error || 'Failed to update course'); }
    } catch { setError('Network error updating course'); }
    finally { setUpdating(false); }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { fetchCourses(); } else { setError(data.error || 'Failed to delete course'); }
    } catch { setError('Network error deleting course'); }
    finally { setDeletingId(null); }
  };

  const handleDuplicateCourse = async (course: Course) => {
    try {
      setDuplicatingId(course.id);
      const res = await fetch('/api/courses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ name: `${course.name} (Copy)`, description: course.description, accessType: course.accessType, isPublished: false }),
      });
      const data = await res.json();
      if (data.success) { fetchCourses(); } else { setError(data.error || 'Failed to duplicate course'); }
    } catch { setError('Network error duplicating course'); }
    finally { setDuplicatingId(null); }
  };

  const handleTogglePublish = async (course: Course) => {
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ isPublished: !course.isPublished }),
      });
      const data = await res.json();
      if (data.success) { fetchCourses(); } else { setError(data.error || 'Failed to update publish status'); }
    } catch { setError('Network error updating publish status'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
          </div>
          <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all">
            <Plus size={18} />
            New Course
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search courses..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <select value={filterPublished} onChange={(e) => { setFilterPublished(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="">All Courses</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-center justify-between">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:underline text-sm">Dismiss</button>
          </div>
        )}

        {loading && courses.length === 0 && (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No courses yet</h3>
            <p className="text-gray-500 mb-4">Create your first course to get started</p>
            <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium">
              <Plus size={18} /> Create Course
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen size={22} className="text-white" />
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${course.isPublished ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {course.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{course.name}</h3>
              {course.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{course.description}</p>}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                <span className="flex items-center gap-1"><BookOpen size={14} /> {course._count?.modules || 0} modules</span>
                <span className="flex items-center gap-1"><Users size={14} /> {course._count?.enrollments || 0} students</span>
              </div>
              {course.price > 0 && <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">{course.currency} {course.price}</p>}
              <div className="flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => navigate(`/courses/${course.id}`)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="View"><Eye size={16} className="text-gray-500" /></button>
                <button onClick={() => { setEditCourse(course); setIsEditOpen(true); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Edit"><Edit2 size={16} className="text-gray-500" /></button>
                <button onClick={() => handleDuplicateCourse(course)} disabled={duplicatingId === course.id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50" title="Duplicate"><Copy size={16} className="text-gray-500" /></button>
                <button onClick={() => handleTogglePublish(course)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title={course.isPublished ? 'Unpublish' : 'Publish'}>
                  {course.isPublished ? <span className="text-xs text-blue-600">Unpublish</span> : <span className="text-xs text-green-600">Publish</span>}
                </button>
                <button onClick={() => handleDeleteCourse(course.id)} disabled={deletingId === course.id} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 ml-auto" title="Delete"><Trash2 size={16} className="text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {pagination.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[200] p-0 sm:p-4" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Course</h3></div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Name *</label>
                <input type="text" value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} placeholder="Introduction to Marketing"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} rows={3} placeholder="What will students learn?"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price</label>
                  <input type="number" value={newCourse.price} onChange={(e) => setNewCourse({ ...newCourse, price: Number(e.target.value) })} min="0" step="0.01"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Type</label>
                  <select value={newCourse.accessType} onChange={(e) => setNewCourse({ ...newCourse, accessType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Publish immediately</label>
                <button onClick={() => setNewCourse({ ...newCourse, isPublished: !newCourse.isPublished })}
                  className={`w-12 h-6 rounded-full transition-colors ${newCourse.isPublished ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${newCourse.isPublished ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={handleCreateCourse} disabled={creating}
                className="px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {creating ? <Loader2 className="animate-spin" size={16} /> : null} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[200] p-0 sm:p-4" onClick={() => { setIsEditOpen(false); setEditCourse(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Course</h3></div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Course Name *</label>
                <input type="text" value={editCourse.name} onChange={(e) => setEditCourse({ ...editCourse, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={editCourse.description || ''} onChange={(e) => setEditCourse({ ...editCourse, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price</label>
                  <input type="number" value={editCourse.price} onChange={(e) => setEditCourse({ ...editCourse, price: Number(e.target.value) })} min="0" step="0.01"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Type</label>
                  <select value={editCourse.accessType} onChange={(e) => setEditCourse({ ...editCourse, accessType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Published</label>
                <button onClick={() => setEditCourse({ ...editCourse, isPublished: !editCourse.isPublished })}
                  className={`w-12 h-6 rounded-full transition-colors ${editCourse.isPublished ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${editCourse.isPublished ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button onClick={() => { setIsEditOpen(false); setEditCourse(null); }} className="px-4 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={handleUpdateCourse} disabled={updating}
                className="px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {updating ? <Loader2 className="animate-spin" size={16} /> : null} Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}