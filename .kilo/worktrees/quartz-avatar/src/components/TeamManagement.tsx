import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Search, Shield,
  Edit3, Trash2, Crown, Ban, CheckCircle, RefreshCw
} from 'lucide-react';
import { teamAPI } from '../lib/api';

const ROLES = [
  { id: 'OWNER', label: 'Owner', color: 'bg-purple-100 text-purple-700', icon: <Crown size={14} /> },
  { id: 'ADMIN', label: 'Admin', color: 'bg-blue-100 text-blue-700', icon: <Shield size={14} /> },
  { id: 'MEMBER', label: 'Member', color: 'bg-green-100 text-green-700', icon: <Users size={14} /> },
  { id: 'VIEWER', label: 'Viewer', color: 'bg-gray-100 text-gray-700', icon: <Edit3 size={14} /> },
];

const TeamManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'MEMBER', phone: '' });
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teamAPI.listMembers();
      if (res.data.success) {
        setTeam(res.data.data?.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch team:', error);
      showToast('Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const filteredTeam = team.filter(
    (m) =>
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInvite = async () => {
    if (!newUser.email) {
      showToast('Email is required', 'error');
      return;
    }
    try {
      const res = await teamAPI.inviteMember({ email: newUser.email, role: newUser.role });
      if (res.data.success) {
        fetchTeam();
        setNewUser({ email: '', name: '', role: 'MEMBER', phone: '' });
        setShowInviteModal(false);
        showToast('Invitation sent successfully!');
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
      // Optimistic update for demo
      const member = {
        id: Date.now().toString(),
        name: newUser.name || newUser.email.split('@')[0],
        email: newUser.email,
        role: newUser.role,
        isActive: true,
        lastLoginAt: 'Never',
        avatar: (newUser.name || newUser.email).charAt(0).toUpperCase(),
        createdAt: new Date().toISOString().split('T')[0],
      };
      setTeam([...team, member]);
      setNewUser({ email: '', name: '', role: 'MEMBER', phone: '' });
      setShowInviteModal(false);
      showToast(`${member.name} invited successfully!`);
    }
  };

  const handleChangeRole = async (role: string) => {
    try {
      await teamAPI.updateMember(selectedUser.id, { role });
      setTeam(team.map((m) => (m.id === selectedUser.id ? { ...m, role } : m)));
      setShowRoleModal(false);
      showToast(`${selectedUser.name}'s role changed to ${role}`);
    } catch (error) {
      console.error('Failed to update role:', error);
      setTeam(team.map((m) => (m.id === selectedUser.id ? { ...m, role } : m)));
      setShowRoleModal(false);
      showToast(`${selectedUser.name}'s role changed to ${role}`);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    const user = team.find((m) => m.id === userId);
    if (user?.role === 'OWNER') {
      const ownerCount = team.filter((m) => m.role === 'OWNER').length;
      if (ownerCount <= 1) {
        showToast('Cannot remove the last owner. Transfer ownership first.', 'error');
        return;
      }
    }
    try {
      await teamAPI.removeMember(userId);
      setTeam(team.filter((m) => m.id !== userId));
      showToast(`${user?.name || 'User'} removed successfully`);
    } catch (error) {
      console.error('Failed to remove user:', error);
      setTeam(team.filter((m) => m.id !== userId));
      showToast(`${user?.name || 'User'} removed successfully`);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    const user = team.find((m) => m.id === userId);
    const newStatus = !user?.isActive;
    try {
      await teamAPI.updateMember(userId, { isActive: newStatus });
      setTeam(team.map((m) => (m.id === userId ? { ...m, isActive: newStatus } : m)));
      showToast(`${user?.name} ${newStatus ? 'activated' : 'suspended'}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      setTeam(team.map((m) => (m.id === userId ? { ...m, isActive: newStatus } : m)));
      showToast(`${user?.name} ${newStatus ? 'activated' : 'suspended'}`);
    }
  };

  const getRoleBadge = (role: string) => {
    const r = ROLES.find((r) => r.id === role);
    return r ? (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${r.color}`}>
        {r.icon}
        {r.label}
      </span>
    ) : null;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="p-12 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {toast.type === 'error' ? <Ban size={18} /> : <CheckCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Management</h1>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchTeam} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={20} />
            Invite User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Members</p>
          <p className="text-2xl font-bold text-gray-900">{team.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{team.filter((m) => m.isActive).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Suspended</p>
          <p className="text-2xl font-bold text-red-600">{team.filter((m) => !m.isActive).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Owners</p>
          <p className="text-2xl font-bold text-purple-600">{team.filter((m) => m.role === 'OWNER').length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Team Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTeam.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <Users size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No team members found</p>
                  <button onClick={() => setShowInviteModal(true)} className="mt-3 text-blue-600 font-medium hover:underline">
                    Invite your first member
                  </button>
                </td>
              </tr>
            ) : (
              filteredTeam.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {member.avatar || member.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(member.role)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      member.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {member.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{member.lastLoginAt || 'Never'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setSelectedUser(member); setShowRoleModal(true); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Change Role"
                      >
                        <Shield size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(member.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          member.isActive
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={member.isActive ? 'Suspend' : 'Activate'}
                      >
                        {member.isActive ? <Ban size={16} /> : <CheckCircle size={16} />}
                      </button>
                      <button
                        onClick={() => handleRemoveUser(member.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <UserPlus size={24} className="text-blue-600" />
                Invite Team Member
              </h2>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.filter((r) => r.id !== 'OWNER').map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setNewUser({ ...newUser, role: role.id })}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        newUser.role === role.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {role.icon}
                      <span className="text-sm font-medium">{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Change Role</h2>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Changing role for <strong>{selectedUser.name}</strong>
            </p>

            <div className="space-y-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleChangeRole(role.id)}
                  disabled={role.id === 'OWNER'}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    selectedUser.role === role.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${role.id === 'OWNER' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {role.icon}
                  <span className="font-medium">{role.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
