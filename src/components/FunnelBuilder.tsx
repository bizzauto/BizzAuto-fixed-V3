import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Eye, Trash2, Copy, Layout, Loader2, Edit2, Search, Sparkles } from 'lucide-react';
import FunnelTemplatePicker from './FunnelTemplatePicker';
import { funnelAPI } from '../lib/api';

interface Funnel {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { pages: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function FunnelBuilder() {
  const navigate = useNavigate();

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFunnel, setNewFunnel] = useState({ name: '', description: '', domain: '', isActive: true });
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFunnel, setEditFunnel] = useState<Funnel | null>(null);
  const [updating, setUpdating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  const fetchFunnels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await funnelAPI.list({
        page: String(page),
        limit: '20',
        ...(search ? { search } : {}),
      });
      const data = res.data;
      if (data.success) {
        setFunnels(data.data.funnels);
        setPagination(data.data.pagination);
      } else {
        setError(data.error || 'Failed to load funnels');
      }
    } catch {
      setError('Network error loading funnels');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  const handleCreateFunnel = async () => {
    if (!newFunnel.name.trim()) {
      setError('Funnel name is required');
      return;
    }
    try {
      setCreating(true);
      const res = await funnelAPI.create(newFunnel);
      const data = res.data;
      if (data.success) {
        setIsCreateOpen(false);
        setNewFunnel({ name: '', description: '', domain: '', isActive: true });
        fetchFunnels();
      } else {
        setError(data.error || 'Failed to create funnel');
      }
    } catch {
      setError('Network error creating funnel');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateFunnel = async () => {
    if (!editFunnel) return;
    try {
      setUpdating(true);
      const res = await funnelAPI.update(editFunnel.id, {
        name: editFunnel.name,
        description: editFunnel.description,
        domain: editFunnel.domain,
        isActive: editFunnel.isActive,
      });
      const data = res.data;
      if (data.success) {
        setIsEditOpen(false);
        setEditFunnel(null);
        fetchFunnels();
      } else {
        setError(data.error || 'Failed to update funnel');
      }
    } catch {
      setError('Network error updating funnel');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteFunnel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this funnel? This action cannot be undone.')) return;
    try {
      setDeletingId(id);
      const res = await funnelAPI.delete(id);
      const data = res.data;
      if (data.success) {
        fetchFunnels();
      } else {
        setError(data.error || 'Failed to delete funnel');
      }
    } catch {
      setError('Network error deleting funnel');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicateFunnel = async (funnel: Funnel) => {
    try {
      setDuplicatingId(funnel.id);
      const res = await funnelAPI.create({
        name: `${funnel.name} (Copy)`,
        description: funnel.description,
        domain: funnel.domain,
        isActive: false,
      });
      const data = res.data;
      if (data.success) {
        fetchFunnels();
      } else {
        setError(data.error || 'Failed to duplicate funnel');
      }
    } catch {
      setError('Network error duplicating funnel');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleToggleStatus = async (funnel: Funnel) => {
    try {
      const res = await funnelAPI.update(funnel.id, { isActive: !funnel.isActive });
      const data = res.data;
      if (data.success) {
        fetchFunnels();
      } else {
        setError(data.error || 'Failed to update status');
      }
    } catch {
      setError('Network error updating status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Funnels</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTemplatePickerOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all"
            >
              <Sparkles size={18} />
              Templates
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all"
            >
              <Plus size={18} />
              New Funnel
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 md:p-6">
        <div className="mb-4 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search funnels..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full max-w-md pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 flex items-center justify-between">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:underline text-sm">Dismiss</button>
          </div>
        )}

        {loading && funnels.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        )}

        {!loading && !error && funnels.length === 0 && (
          <div className="text-center py-12">
            <Layout size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No funnels yet</h3>
            <p className="text-gray-500 mb-4">Create your first funnel to get started</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsTemplatePickerOpen(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all"
              >
                <Sparkles size={18} />
                From Template
              </button>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all"
              >
                <Plus size={18} />
                Start Blank
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {funnels.map((funnel) => (
            <div key={funnel.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Layout size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{funnel.name}</h3>
                <p className="text-sm text-gray-500">
                  {funnel._count?.pages || 0} pages • {new Date(funnel.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleToggleStatus(funnel)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${funnel.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
              >
                {funnel.isActive ? 'Active' : 'Inactive'}
              </button>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => navigate(`/funnels/${funnel.id}`)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="View"
                >
                  <Eye size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={() => { setEditFunnel(funnel); setIsEditOpen(true); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title="Edit"
                >
                  <Edit2 size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={() => handleDuplicateFunnel(funnel)}
                  disabled={duplicatingId === funnel.id}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                  title="Duplicate"
                >
                  <Copy size={16} className="text-gray-500" />
                </button>
                <button
                  onClick={() => handleDeleteFunnel(funnel.id)}
                  disabled={deletingId === funnel.id}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create Modal Overlay */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[200] p-0 sm:p-4" onClick={() => setIsCreateOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Funnel</h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newFunnel.name}
                  onChange={(e) => setNewFunnel({ ...newFunnel, name: e.target.value })}
                  placeholder="My Awesome Funnel"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={newFunnel.description}
                  onChange={(e) => setNewFunnel({ ...newFunnel, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domain</label>
                <input
                  type="text"
                  value={newFunnel.domain}
                  onChange={(e) => setNewFunnel({ ...newFunnel, domain: e.target.value })}
                  placeholder="example.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
                <button
                  onClick={() => setNewFunnel({ ...newFunnel, isActive: !newFunnel.isActive })}
                  className={`w-12 h-6 rounded-full transition-colors ${newFunnel.isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} relative`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${newFunnel.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={handleCreateFunnel} disabled={creating} className="px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {creating ? <Loader2 className="animate-spin" size={16} /> : null}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      <FunnelTemplatePicker
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
      />

      {/* Edit Modal Overlay */}
      {isEditOpen && editFunnel && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[200] p-0 sm:p-4" onClick={() => { setIsEditOpen(false); setEditFunnel(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Funnel</h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editFunnel.name}
                  onChange={(e) => setEditFunnel({ ...editFunnel, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={editFunnel.description || ''}
                  onChange={(e) => setEditFunnel({ ...editFunnel, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domain</label>
                <input
                  type="text"
                  value={editFunnel.domain || ''}
                  onChange={(e) => setEditFunnel({ ...editFunnel, domain: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
                <button
                  onClick={() => setEditFunnel({ ...editFunnel, isActive: !editFunnel.isActive })}
                  className={`w-12 h-6 rounded-full transition-colors ${editFunnel.isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} relative`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${editFunnel.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-900 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button onClick={() => { setIsEditOpen(false); setEditFunnel(null); }} className="px-4 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={handleUpdateFunnel} disabled={updating} className="px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {updating ? <Loader2 className="animate-spin" size={16} /> : null}
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
