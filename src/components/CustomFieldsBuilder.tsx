import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings, Plus, Trash2, Edit3, GripVertical, ChevronDown, ChevronUp,
  Type, Hash, Mail, Phone, Calendar, Clock, List, CheckSquare, Radio,
  AlignLeft, Globe, DollarSign, Upload, ToggleLeft, ToggleRight,
  HelpCircle, Eye, EyeOff, X, Save, Loader2, AlertCircle, Check,
  Search, ArrowUpDown, FileText, Users, Target, CalendarClock, ShoppingCart,
} from 'lucide-react';
import { customFieldsAPI } from '../lib/api';
import { useToast } from './Toast';

// ============================================================
// TYPES
// ============================================================

type FieldType =
  | 'text' | 'number' | 'email' | 'phone' | 'date' | 'datetime'
  | 'select' | 'multi_select' | 'radio' | 'checkbox' | 'textarea'
  | 'url' | 'currency' | 'file';

type EntityType = 'contact' | 'lead' | 'deal' | 'appointment' | 'order';

interface CustomField {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  type: FieldType;
  entityType: EntityType;
  options: string[] | null;
  validation: Record<string, any> | null;
  defaultValue: string | null;
  placeholder: string | null;
  helpText: string | null;
  isRequired: boolean;
  isVisible: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface FieldFormState {
  name: string;
  type: FieldType;
  placeholder: string;
  helpText: string;
  isRequired: boolean;
  isVisible: boolean;
  options: string[];
  defaultValue: string;
}

const EMPTY_FORM: FieldFormState = {
  name: '',
  type: 'text',
  placeholder: '',
  helpText: '',
  isRequired: false,
  isVisible: true,
  options: [],
  defaultValue: '',
};

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ReactNode }[] = [
  { value: 'text', label: 'Text', icon: <Type size={14} /> },
  { value: 'number', label: 'Number', icon: <Hash size={14} /> },
  { value: 'email', label: 'Email', icon: <Mail size={14} /> },
  { value: 'phone', label: 'Phone', icon: <Phone size={14} /> },
  { value: 'date', label: 'Date', icon: <Calendar size={14} /> },
  { value: 'datetime', label: 'Date & Time', icon: <Clock size={14} /> },
  { value: 'select', label: 'Dropdown', icon: <List size={14} /> },
  { value: 'multi_select', label: 'Multi-Select', icon: <CheckSquare size={14} /> },
  { value: 'radio', label: 'Radio', icon: <Radio size={14} /> },
  { value: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={14} /> },
  { value: 'textarea', label: 'Text Area', icon: <AlignLeft size={14} /> },
  { value: 'url', label: 'URL', icon: <Globe size={14} /> },
  { value: 'currency', label: 'Currency', icon: <DollarSign size={14} /> },
  { value: 'file', label: 'File Upload', icon: <Upload size={14} /> },
];

const ENTITY_TABS: { value: EntityType; label: string; icon: React.ReactNode }[] = [
  { value: 'contact', label: 'Contacts', icon: <Users size={16} /> },
  { value: 'lead', label: 'Leads', icon: <Target size={16} /> },
  { value: 'deal', label: 'Deals', icon: <DollarSign size={16} /> },
  { value: 'appointment', label: 'Appointments', icon: <CalendarClock size={16} /> },
  { value: 'order', label: 'Orders', icon: <ShoppingCart size={16} /> },
];

const TYPE_COLORS: Record<FieldType, string> = {
  text: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  number: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  email: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  phone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  date: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  datetime: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  select: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  multi_select: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  radio: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  checkbox: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  textarea: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  url: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  currency: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  file: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

// ============================================================
// COMPONENT
// ============================================================

export default function CustomFieldsBuilder() {
  const toast = useToast();
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const [activeTab, setActiveTab] = useState<EntityType>('contact');
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [form, setForm] = useState<FieldFormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const hasOptions = ['select', 'multi_select', 'radio'].includes(form.type);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customFieldsAPI.getEntityFields(activeTab);
      setFields(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load fields');
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  useEffect(() => {
    if (!hasOptions && form.options.length > 0) {
      setForm((p) => ({ ...p, options: [] }));
    }
  }, [form.type, hasOptions]);

  const filteredFields = fields.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ---- CRUD Handlers ----

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Field name is required');
      return;
    }
    if (hasOptions && form.options.length === 0) {
      toast.error('Add at least one option');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        type: form.type,
        entityType: activeTab,
        placeholder: form.placeholder || undefined,
        helpText: form.helpText || undefined,
        isRequired: form.isRequired,
        isVisible: form.isVisible,
        defaultValue: form.defaultValue || undefined,
      };
      if (hasOptions) {
        payload.options = form.options;
      }
      await customFieldsAPI.create(payload);
      toast.success('Field created');
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      fetchFields();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create field');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingField) return;
    if (!form.name.trim()) {
      toast.error('Field name is required');
      return;
    }
    if (hasOptions && form.options.length === 0) {
      toast.error('Add at least one option');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        type: form.type,
        placeholder: form.placeholder || undefined,
        helpText: form.helpText || undefined,
        isRequired: form.isRequired,
        isVisible: form.isVisible,
        defaultValue: form.defaultValue || undefined,
      };
      if (hasOptions) {
        payload.options = form.options;
      }
      await customFieldsAPI.update(editingField.id, payload);
      toast.success('Field updated');
      setShowForm(false);
      setEditingField(null);
      setForm({ ...EMPTY_FORM });
      fetchFields();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update field');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await customFieldsAPI.delete(id);
      toast.success('Field deleted');
      setDeleteConfirm(null);
      fetchFields();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete field');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleVisibility = async (field: CustomField) => {
    try {
      await customFieldsAPI.update(field.id, { isVisible: !field.isVisible });
      toast.success(field.isVisible ? 'Field hidden' : 'Field visible');
      fetchFields();
    } catch (err: any) {
      toast.error('Failed to update visibility');
    }
  };

  const handleReorder = async () => {
    const reordered = [...fields];
    const dragged = reordered.splice(dragItem.current!, 1)[0];
    reordered.splice(dragOverItem.current!, 0, dragged);
    setFields(reordered);

    try {
      await customFieldsAPI.reorder(reordered.map((f) => f.id));
      toast.success('Fields reordered');
    } catch (err: any) {
      toast.error('Failed to save order');
      fetchFields();
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const openCreateForm = () => {
    setEditingField(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEditForm = (field: CustomField) => {
    setEditingField(field);
    setForm({
      name: field.name,
      type: field.type,
      placeholder: field.placeholder || '',
      helpText: field.helpText || '',
      isRequired: field.isRequired,
      isVisible: field.isVisible,
      options: Array.isArray(field.options) ? (field.options as string[]) : [],
      defaultValue: field.defaultValue || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingField(null);
    setForm({ ...EMPTY_FORM });
  };

  // ---- Option management ----

  const addOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (form.options.includes(trimmed)) {
      toast.error('Option already exists');
      return;
    }
    setForm((p) => ({ ...p, options: [...p.options, trimmed] }));
    setNewOption('');
  };

  const removeOption = (idx: number) => {
    setForm((p) => ({ ...p, options: p.options.filter((_, i) => i !== idx) }));
  };

  const moveOption = (from: number, to: number) => {
    if (to < 0 || to >= form.options.length) return;
    const opts = [...form.options];
    const [item] = opts.splice(from, 1);
    opts.splice(to, 0, item);
    setForm((p) => ({ ...p, options: opts }));
  };

  // ---- Drag handlers for field list ----

  const onDragStart = (index: number) => {
    dragItem.current = index;
  };

  const onDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const onDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      handleReorder();
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // ---- Render ----

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-5 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <Settings className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Custom Fields</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Build and manage custom fields for each entity type
              </p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Plus size={16} />
            New Field
          </button>
        </div>
      </div>

      {/* Entity Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6">
          <nav className="flex gap-1 overflow-x-auto" role="tablist">
            {ENTITY_TABS.map((tab) => {
              const count = fields.filter((f) => f.entityType === tab.value).length;
              return (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={activeTab === tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.value
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                        activeTab === tab.value
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6">
        {/* Search & Stats Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 ml-4">
            {filteredFields.length} field{filteredFields.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Field List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="inline-flex p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl mb-4">
              <Settings className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              No custom fields yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              Create your first custom field for {ENTITY_TABS.find((t) => t.value === activeTab)?.label} to collect additional information.
            </p>
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium text-sm"
            >
              <Plus size={16} />
              Create Field
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFields.map((field, index) => (
              <div
                key={field.id}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragEnter={() => onDragEnter(index)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 ${
                  deleteConfirm === field.id ? 'ring-2 ring-red-200 dark:ring-red-900' : ''
                }`}
              >
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors">
                  <GripVertical size={18} />
                </div>

                {/* Field Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {field.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[field.type]}`}
                    >
                      {FIELD_TYPES.find((t) => t.value === field.type)?.icon}
                      {FIELD_TYPES.find((t) => t.value === field.type)?.label}
                    </span>
                    {field.isRequired && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
                        Required
                      </span>
                    )}
                    {!field.isVisible && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                        <EyeOff size={10} />
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                    <span className="font-mono">/{field.slug}</span>
                    {field.placeholder && <span>Placeholder: "{field.placeholder}"</span>}
                    {Array.isArray(field.options) && field.options.length > 0 && (
                      <span>{field.options.length} option{field.options.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggleVisibility(field)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    title={field.isVisible ? 'Hide field' : 'Show field'}
                  >
                    {field.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button
                    onClick={() => openEditForm(field)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Edit field"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(field.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete field"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Delete Confirmation Inline */}
                {deleteConfirm === field.id && (
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                      Delete?
                    </span>
                    <button
                      onClick={() => handleDelete(field.id)}
                      disabled={deleting}
                      className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? <Loader2 className="animate-spin" size={12} /> : 'Yes'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                  <Plus className="text-indigo-600 dark:text-indigo-400" size={18} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingField ? 'Edit Field' : 'Create Field'}
                </h2>
              </div>
              <button
                onClick={closeForm}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 md:px-6 py-5 space-y-5">
              {/* Field Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Field Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Industry, Company Size"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Field Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {FIELD_TYPES.map((ft) => (
                    <button
                      key={ft.value}
                      onClick={() => setForm((p) => ({ ...p, type: ft.value }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium border transition-all ${
                        form.type === ft.value
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 shadow-sm'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {ft.icon}
                      <span className="leading-tight text-center">{ft.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={form.placeholder}
                  onChange={(e) => setForm((p) => ({ ...p, placeholder: e.target.value }))}
                  placeholder="Shown when field is empty"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Help Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Help Text
                </label>
                <input
                  type="text"
                  value={form.helpText}
                  onChange={(e) => setForm((p) => ({ ...p, helpText: e.target.value }))}
                  placeholder="Optional helper description shown below the field"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Default Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Default Value
                </label>
                <input
                  type="text"
                  value={form.defaultValue}
                  onChange={(e) => setForm((p) => ({ ...p, defaultValue: e.target.value }))}
                  placeholder="Pre-filled value for new records"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Options Editor */}
              {hasOptions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Options <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {form.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 text-xs text-gray-400 text-center">{idx + 1}</span>
                        <div className="flex-1 flex items-center gap-1">
                          <input
                            type="text"
                            value={opt}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => moveOption(idx, idx - 1)}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveOption(idx, idx + 1)}
                            disabled={idx === form.options.length - 1}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                          >
                            <ChevronDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                        placeholder="Type an option and press Enter"
                        className="flex-1 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={addOption}
                        className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Toggles Row */}
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isRequired: !p.isRequired }))}
                  className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300"
                >
                  {form.isRequired ? (
                    <ToggleRight className="text-indigo-600" size={28} />
                  ) : (
                    <ToggleLeft className="text-gray-300 dark:text-gray-600" size={28} />
                  )}
                  Required
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isVisible: !p.isVisible }))}
                  className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300"
                >
                  {form.isVisible ? (
                    <ToggleRight className="text-indigo-600" size={28} />
                  ) : (
                    <ToggleLeft className="text-gray-300 dark:text-gray-600" size={28} />
                  )}
                  Visible
                </button>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                  Preview
                </p>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {form.name || 'Field Name'}
                    {form.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {form.type === 'textarea' ? (
                    <textarea
                      placeholder={form.placeholder || 'Enter value...'}
                      disabled
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 resize-none"
                    />
                  ) : form.type === 'select' ? (
                    <select disabled className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400">
                      <option>{form.placeholder || 'Select an option...'}</option>
                    </select>
                  ) : form.type === 'radio' ? (
                    <div className="flex flex-wrap gap-3 mt-1">
                      {form.options.length > 0 ? (
                        form.options.map((opt, i) => (
                          <label key={i} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <input type="radio" disabled className="accent-indigo-600" />
                            {opt}
                          </label>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No options defined</span>
                      )}
                    </div>
                  ) : form.type === 'checkbox' ? (
                    <div className="flex flex-wrap gap-3 mt-1">
                      {form.options.length > 0 ? (
                        form.options.map((opt, i) => (
                          <label key={i} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <input type="checkbox" disabled className="accent-indigo-600" />
                            {opt}
                          </label>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No options defined</span>
                      )}
                    </div>
                  ) : (
                    <input
                      type={form.type === 'datetime' ? 'text' : form.type}
                      placeholder={form.placeholder || 'Enter value...'}
                      disabled
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400"
                    />
                  )}
                  {form.helpText && (
                    <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
                      <HelpCircle size={12} />
                      {form.helpText}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-4 sm:px-5 md:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingField ? handleUpdate : handleCreate}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                {editingField ? 'Update Field' : 'Create Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
