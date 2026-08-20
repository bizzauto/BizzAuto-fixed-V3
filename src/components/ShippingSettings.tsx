import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Plus, Edit, Trash2, Loader2, Save, X, MapPin, DollarSign, Package,
} from 'lucide-react';
import apiClient from '../lib/api';
import { useToast } from './Toast';

interface ShippingRule {
  id: string;
  name: string;
  minOrderAmount: number;
  maxOrderAmount: number | null;
  shippingFee: number;
  freeAbove: number | null;
  pincodePrefixes: string[];
  states: string[];
  isActive: boolean;
}

const emptyRule: Omit<ShippingRule, 'id'> = {
  name: '',
  minOrderAmount: 0,
  maxOrderAmount: null,
  shippingFee: 0,
  freeAbove: null,
  pincodePrefixes: [],
  states: [],
  isActive: true,
};

const ShippingSettings: React.FC = () => {
  const { error: showError, success: showSuccess } = useToast();
  const [rules, setRules] = useState<ShippingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ShippingRule | null>(null);
  const [form, setForm] = useState(emptyRule);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');
  const [stateInput, setStateInput] = useState('');

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/store-features/shipping/rules');
      setRules(res.data.rules || res.data || []);
    } catch {
      showError('Failed to load shipping rules');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyRule });
    setPincodeInput('');
    setStateInput('');
    setShowForm(true);
  };

  const openEdit = (rule: ShippingRule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      minOrderAmount: rule.minOrderAmount,
      maxOrderAmount: rule.maxOrderAmount,
      shippingFee: rule.shippingFee,
      freeAbove: rule.freeAbove,
      pincodePrefixes: [...rule.pincodePrefixes],
      states: [...rule.states],
      isActive: rule.isActive,
    });
    setPincodeInput(rule.pincodePrefixes.join(', '));
    setStateInput(rule.states.join(', '));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showError('Rule name is required');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      pincodePrefixes: pincodeInput.split(',').map((s) => s.trim()).filter(Boolean),
      states: stateInput.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        await apiClient.put(`/store-features/shipping/rules/${editing.id}`, payload);
        showSuccess('Rule updated');
      } else {
        await apiClient.post('/store-features/shipping/rules', payload);
        showSuccess('Rule created');
      }
      setShowForm(false);
      fetchRules();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shipping rule?')) return;
    try {
      await apiClient.delete(`/store-features/shipping/rules/${id}`);
      showSuccess('Rule deleted');
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {
      showError('Failed to delete rule');
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Truck size={18} className="text-blue-600" />
          Shipping Rules
        </h3>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
        >
          <Plus size={16} />
          Add Rule
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <Truck size={40} className="mx-auto mb-3 opacity-50" />
          <p>No shipping rules configured</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{rule.name}</span>
                  {!rule.isActive && (
                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-500 text-xs rounded">Inactive</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><DollarSign size={12} />Fee: ₹{rule.shippingFee}</span>
                  {rule.freeAbove && <span className="flex items-center gap-1"><Package size={12} />Free above ₹{rule.freeAbove}</span>}
                  {rule.minOrderAmount > 0 && <span>Min: ₹{rule.minOrderAmount}</span>}
                  {rule.maxOrderAmount && <span>Max: ₹{rule.maxOrderAmount}</span>}
                  {rule.pincodePrefixes.length > 0 && (
                    <span className="flex items-center gap-1"><MapPin size={12} />Pincodes: {rule.pincodePrefixes.slice(0, 3).join(', ')}{rule.pincodePrefixes.length > 3 ? ` +${rule.pincodePrefixes.length - 3}` : ''}</span>
                  )}
                  {rule.states.length > 0 && <span>States: {rule.states.join(', ')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-3">
                <button onClick={() => openEdit(rule)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(rule.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 md:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? 'Edit Shipping Rule' : 'Add Shipping Rule'}
              </h4>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Rule Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Standard Shipping"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    value={form.minOrderAmount || ''}
                    onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Max Order Amount (₹)</label>
                  <input
                    type="number"
                    value={form.maxOrderAmount ?? ''}
                    onChange={(e) => setForm({ ...form, maxOrderAmount: e.target.value ? Number(e.target.value) : null })}
                    placeholder="No limit"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Shipping Fee (₹)</label>
                  <input
                    type="number"
                    value={form.shippingFee || ''}
                    onChange={(e) => setForm({ ...form, shippingFee: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Free Above (₹)</label>
                  <input
                    type="number"
                    value={form.freeAbove ?? ''}
                    onChange={(e) => setForm({ ...form, freeAbove: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Never free"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Pincode Prefixes (comma-separated)</label>
                <input
                  type="text"
                  value={pincodeInput}
                  onChange={(e) => setPincodeInput(e.target.value)}
                  placeholder="e.g. 110, 400, 560"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">States (comma-separated)</label>
                <input
                  type="text"
                  value={stateInput}
                  onChange={(e) => setStateInput(e.target.value)}
                  placeholder="e.g. Maharashtra, Delhi, Karnataka"
                  className={inputClass}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Saving...' : editing ? 'Update Rule' : 'Create Rule'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingSettings;

