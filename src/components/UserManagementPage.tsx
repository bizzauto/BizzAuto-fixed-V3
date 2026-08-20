import { useState, useEffect } from 'react';
import { Users, Search, Loader2, Check, X, Edit3, UserCheck, UserX } from 'lucide-react';
import { useToast } from './Toast';
import { useAuthStore } from '../lib/authStore';
import { superAdminAPI, authAPI } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  business?: { id: string; name: string; type: string; plan: string } | null;
}

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'bg-red-100 text-red-700', desc: 'Full platform access' },
  { value: 'OWNER', label: 'Owner', color: 'bg-purple-100 text-purple-700', desc: 'Business owner' },
  { value: 'ADMIN', label: 'Admin', color: 'bg-blue-100 text-blue-700', desc: 'Business admin' },
  { value: 'MEMBER', label: 'Member', color: 'bg-green-100 text-green-700', desc: 'Team member' },
  { value: 'VIEWER', label: 'Viewer', color: 'bg-gray-100 text-gray-700', desc: 'Read-only access' },
];

export default function UserManagementPage() {
  const toast = useToast();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // SUPER_ADMIN uses super-admin API (sees all users platform-wide)
      // OWNER/ADMIN uses auth API (sees only their business users)
      const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
      const res = isSuperAdmin
        ? await superAdminAPI.listUsers({ limit: 100 })
        : await authAPI.listUsers({ limit: 100 });
      const data = res.data;
      if (data.success) setUsers(data.data.users);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      setSaving(true);
      const res = await superAdminAPI.changeUserRole(userId, role);
      const data = res.data;
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
        setEditingRole(null);
        toast.success(`Role changed to ${role}`);
      } else { toast.error(data.error); }
    } catch { toast.error('Failed to change role'); }
    finally { setSaving(false); }
  };

  const getRoleBadge = (role: string) => {
    const r = ROLES.find(r => r.value === role);
    return r || { label: role, color: 'bg-gray-100 text-gray-700' };
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-indigo-500" size={32} /><span className="ml-2 text-gray-500">Loading users...</span></div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Users className="text-indigo-500" /> User Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage roles and permissions for your team</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{users.length} users</span>
        </div>
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {ROLES.map(r => (
          <div key={r.value} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${r.color}`}>{r.label}</span>
            <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(user => {
                const roleBadge = getRoleBadge(user.role);
                const isCurrentUser = user.id === currentUser?.id;
                const isEditing = editingRole === user.id;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.name || 'No name'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <select value={newRole} onChange={e => setNewRole(e.target.value)}
                            className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm">
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <button onClick={() => changeRole(user.id, newRole)} disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={() => setEditingRole(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded-lg">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleBadge.color}`}>
                          {roleBadge.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs ${user.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {user.isActive ? <UserCheck size={12} /> : <UserX size={12} />}
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      {!isCurrentUser && !isEditing && (
                        <button onClick={() => { setEditingRole(user.id); setNewRole(user.role); }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Change Role">
                          <Edit3 size={14} />
                        </button>
                      )}
                      {isCurrentUser && (
                        <span className="text-xs text-gray-400 italic">You</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">No users found</div>
          )}
        </div>
      </div>
    </div>
  );
}
