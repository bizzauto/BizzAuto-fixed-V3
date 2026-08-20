import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { Shield, Plus, Edit, Trash2, Users, Check, Loader2 } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  color: string;
  users: number;
  permissions: string[];
  isSystem: boolean;
}

const allPermissions: Permission[] = [
  { id: 'contacts.view', name: 'View Contacts', category: 'Contacts' },
  { id: 'contacts.create', name: 'Create Contacts', category: 'Contacts' },
  { id: 'contacts.delete', name: 'Delete Contacts', category: 'Contacts' },
  { id: 'campaigns.view', name: 'View Campaigns', category: 'Campaigns' },
  { id: 'campaigns.create', name: 'Create Campaigns', category: 'Campaigns' },
  { id: 'campaigns.send', name: 'Send Campaigns', category: 'Campaigns' },
  { id: 'invoices.view', name: 'View Invoices', category: 'Finance' },
  { id: 'invoices.create', name: 'Create Invoices', category: 'Finance' },
  { id: 'invoices.approve', name: 'Approve Invoices', category: 'Finance' },
  { id: 'team.manage', name: 'Manage Team', category: 'Team' },
  { id: 'team.invite', name: 'Invite Members', category: 'Team' },
  { id: 'settings.view', name: 'View Settings', category: 'Settings' },
  { id: 'settings.edit', name: 'Edit Settings', category: 'Settings' },
  { id: 'reports.view', name: 'View Reports', category: 'Reports' },
  { id: 'reports.export', name: 'Export Reports', category: 'Reports' },
];

const colorOptions = ['bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700'];

export default function CustomRolesPage() {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: '', color: 'bg-purple-100 text-purple-700', permissions: [] as string[] });
  const [saving, setSaving] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/custom-roles', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setRoles(data.data);
    } catch { toast.error('Failed to load roles'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const categories = [...new Set(allPermissions.map(p => p.category))];

  const togglePermission = (permId: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId) ? prev.permissions.filter(p => p !== permId) : [...prev.permissions, permId],
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Role name required'); return; }
    try {
      setSaving(true);
      const res = await fetch('/api/custom-roles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreating(false); setForm({ name: '', color: 'bg-purple-100 text-purple-700', permissions: [] });
        fetchRoles(); toast.success('Role created!');
      } else { toast.error(data.error || 'Failed to create'); }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/custom-roles/${editingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null); setForm({ name: '', color: 'bg-purple-100 text-purple-700', permissions: [] });
        fetchRoles(); toast.success('Role updated!');
      } else { toast.error(data.error || 'Failed to update'); }
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this custom role?')) return;
    try {
      const res = await fetch(`/api/custom-roles/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { fetchRoles(); toast.success('Role deleted'); }
      else { toast.error(data.error || 'Failed to delete'); }
    } catch { toast.error('Network error'); }
  };

  const startEdit = (role: Role) => {
    if (role.isSystem) { toast.error('Cannot edit system role'); return; }
    setEditingId(role.id);
    setForm({ name: role.name, color: role.color, permissions: role.permissions });
    setIsCreating(false);
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setForm({ name: '', color: 'bg-purple-100 text-purple-700', permissions: [] });
  };

  const cancelForm = () => {
    setIsCreating(false); setEditingId(null);
    setForm({ name: '', color: 'bg-purple-100 text-purple-700', permissions: [] });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-indigo-600" /> Custom Roles & Permissions
          </h1>
          <p className="text-gray-600 mt-1">Create custom roles with granular permission control</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg">
          <Plus size={18} /> Create Role
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {roles.map((role) => (
              <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${role.color}`}>{role.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Users size={12} /> {role.users || 0}</span>
                    {!role.isSystem && (
                      <>
                        <button onClick={() => startEdit(role)} className="p-1 hover:bg-blue-50 rounded text-blue-400"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(role.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {role.permissions?.length || 0} permissions
                  {role.isSystem && <span className="ml-2 text-gray-400">(System)</span>}
                </div>
              </div>
            ))}
          </div>

          {(isCreating || editingId) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {editingId ? <><Edit size={18} /> Edit Role</> : <><Plus size={18} /> Create New Role</>}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg" placeholder="e.g., Content Manager" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map(c => (
                      <button key={c} onClick={() => setForm({ ...form, color: c })}
                        className={`w-8 h-8 rounded-full ${c} ${form.color === c ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                {categories.map(cat => (
                  <div key={cat} className="mb-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{cat}</div>
                    <div className="flex flex-wrap gap-2">
                      {allPermissions.filter(p => p.category === cat).map(perm => (
                        <button key={perm.id} onClick={() => togglePermission(perm.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${form.permissions.includes(perm.id) ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {form.permissions.includes(perm.id) ? <Check size={12} className="inline mr-1" /> : null}
                          {perm.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={editingId ? handleUpdate : handleCreate} disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : null}
                  {editingId ? 'Save Changes' : 'Create Role'}
                </button>
                <button onClick={cancelForm} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}