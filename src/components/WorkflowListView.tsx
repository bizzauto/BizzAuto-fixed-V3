import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Loader2, Power, PowerOff, Trash2, Clock,
  Workflow, Zap, MessageSquare, UserPlus, Calendar, ShoppingCart,
  Sparkles, AlertCircle, ChevronRight, Eye, Filter, X,
  type LucideIcon,
} from 'lucide-react';
import { workflowsAPI } from '../lib/api';
import { useToast } from './Toast';
import AIGenerationModal from './AIGenerationModal';

// ============================================================
// TYPES
// ============================================================

interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { executions: number };
}

interface DeployableTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
}

const TRIGGER_ICONS: Record<string, LucideIcon> = {
  message_received: MessageSquare,
  lead_created: UserPlus,
  form_submitted: Sparkles,
  tag_added: Zap,
  deal_stage_changed: ChevronRight,
  appointment_booked: Calendar,
  order_placed: ShoppingCart,
  payment_received: Clock,
};

const TRIGGER_COLORS: Record<string, string> = {
  message_received: 'text-blue-400 bg-blue-500/10',
  lead_created: 'text-emerald-400 bg-emerald-500/10',
  form_submitted: 'text-purple-400 bg-purple-500/10',
  tag_added: 'text-amber-400 bg-amber-500/10',
  deal_stage_changed: 'text-rose-400 bg-rose-500/10',
  appointment_booked: 'text-cyan-400 bg-cyan-500/10',
  order_placed: 'text-orange-400 bg-orange-500/10',
  payment_received: 'text-green-400 bg-green-500/10',
};

// ============================================================
// WORKFLOW LIST VIEW
// ============================================================

export default function WorkflowListView() {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<DeployableTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active' ? 'true' : 'false';
      const res = await workflowsAPI.list(params);
      setWorkflows(res.data?.data?.workflows || []);
    } catch {
      toastError('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, toastError]);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await workflowsAPI.getDeployTemplates();
      setTemplates(res.data?.data || []);
    } catch {
      // Silently fail - templates are optional
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);
  useEffect(() => { if (showTemplates && templates.length === 0) loadTemplates(); }, [showTemplates, templates.length, loadTemplates]);

  const handleToggle = useCallback(async (id: string, currentActive: boolean) => {
    try {
      await workflowsAPI.toggle(id);
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, isActive: !currentActive } : w));
      toastSuccess(`Workflow ${currentActive ? 'deactivated' : 'activated'}`);
    } catch {
      toastError('Failed to toggle workflow');
    }
  }, [toastSuccess, toastError]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) return;
    try {
      await workflowsAPI.delete(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      toastSuccess('Workflow deleted');
    } catch {
      toastError('Failed to delete workflow');
    }
  }, [toastSuccess, toastError]);

  const handleDeployTemplate = useCallback(async (templateId: string) => {
    setDeploying(templateId);
    try {
      const res = await workflowsAPI.deployTemplate({ templateId });
      toastSuccess('Template deployed! Opening workflow...');
      const newId = res.data?.data?.id;
      if (newId) navigate(`/automation/workflow/${newId}`);
    } catch {
      toastError('Failed to deploy template');
    } finally {
      setDeploying(null);
    }
  }, [navigate, toastSuccess, toastError]);

  const filteredWorkflows = workflows.filter(w =>
    !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryTemplates = useMemo(() => {
    const groups: Record<string, DeployableTemplate[]> = {};
    templates.forEach(t => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [templates]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Workflow size={24} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Workflows</h1>
                <p className="text-sm text-gray-400">Automate your business processes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAIModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/10"
              >
                <Sparkles size={16} />
                <span>AI Generate</span>
              </button>
              <button
                onClick={() => navigate('/automation/workflow/new')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/20"
              >
                <Plus size={16} />
                <span>New Workflow</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workflows..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-1 bg-gray-700/50 rounded-lg p-1">
              {(['all', 'active', 'inactive'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setShowTemplates(!showTemplates); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                showTemplates
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-gray-400 bg-gray-700/50 border-gray-600 hover:text-white'
              }`}
            >
              <Plus size={14} />
              <span>Quick Start</span>
            </button>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white"
              >
                <X size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Template Gallery */}
        {showTemplates && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                  <Plus size={16} className="text-emerald-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Quick-Start Templates</h2>
              </div>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-blue-500 animate-spin" />
              </div>
            ) : Object.entries(categoryTemplates).length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                <Plus size={32} className="mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-500">No templates available</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(categoryTemplates).map(([category, categoryTmpls]) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 capitalize">
                      {category.replace('_', ' ')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryTmpls.map((template) => (
                        <div
                          key={template.id}
                          className="group relative bg-gray-800/50 border border-gray-700 hover:border-emerald-500/40 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-emerald-500/5"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                {template.name}
                              </h4>
                              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                {template.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Zap size={12} />
                              {template.triggerType.replace(/_/g, ' ')}
                            </span>
                            <button
                              onClick={() => handleDeployTemplate(template.id)}
                              disabled={deploying === template.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {deploying === template.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Plus size={12} />
                              )}
                              <span>Deploy</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workflow List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-blue-500 animate-spin" />
              <p className="text-sm text-gray-400">Loading workflows...</p>
            </div>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 bg-gray-800/50 rounded-2xl mb-4">
              <Workflow size={48} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-300 mb-1">No workflows yet</h3>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              Create your first automation workflow to start streamlining your business processes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/automation/workflow/new')}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/20"
              >
                <Plus size={16} />
                <span>Create Workflow</span>
              </button>
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all"
              >
                <Plus size={16} />
                <span>Use Template</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredWorkflows.map((wf) => {
              const TriggerIcon = TRIGGER_ICONS[wf.triggerType] || Workflow;
              const triggerColor = TRIGGER_COLORS[wf.triggerType] || 'text-gray-400 bg-gray-500/10';
              return (
                <div
                  key={wf.id}
                  className="group flex items-center gap-4 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 rounded-xl px-4 py-3 transition-all cursor-pointer"
                  onClick={() => navigate(`/automation/workflow/${wf.id}`)}
                >
                  {/* Trigger icon */}
                  <div className={`flex-shrink-0 p-2 rounded-lg ${triggerColor}`}>
                    <TriggerIcon size={16} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{wf.name}</span>
                      <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        wf.isActive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-gray-600/20 text-gray-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${wf.isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                        {wf.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {wf.description || wf.triggerType.replace(/_/g, ' ')}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                      {wf._count?.executions || 0} runs
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggle(wf.id, wf.isActive)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        wf.isActive
                          ? 'text-amber-400 hover:bg-amber-500/10'
                          : 'text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={wf.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {wf.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>
                    <button
                      onClick={() => navigate(`/automation/workflow/${wf.id}`)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Open workflow"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(wf.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Generation Modal */}
      {showAIModal && (
        <AIGenerationModal
          onClose={() => setShowAIModal(false)}
          onWorkflowGenerated={(id) => {
            setShowAIModal(false);
            if (id) navigate(`/automation/workflow/${id}`);
          }}
        />
      )}
    </div>
  );
}
