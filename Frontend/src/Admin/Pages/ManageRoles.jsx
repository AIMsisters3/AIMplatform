import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ManageRoles() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [expandedRole, setExpandedRole] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/users', { params: { limit: 100 } }),
      api.get('/users/roles'),
    ])
      .then(([u, r]) => { setUsers(u.data.data.items); setRoles(r.data.data.items); })
      .catch(() => { setUsers([]); setRoles([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeRole(userId, role) {
    try {
      await api.post(`/users/${userId}/role`, { role });
      setMessage('Role updated.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not update role.');
    }
  }

  async function toggleStatus(userId, currentStatus) {
    const next = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.post(`/users/${userId}/status`, { status: next });
      setMessage(`Account ${next}.`);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not update account status.');
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="font-display font-semibold text-lg">Roles &amp; Permissions</h2>

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 text-sm">Role Definitions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setExpandedRole(expandedRole === r.id ? null : r.id)}
              className="text-left glass-card p-4 hover:bg-white transition"
            >
              <p className="font-semibold capitalize mb-1">{r.name}</p>
              <p className="text-xs text-ink/50">
                {r.slug === 'superadmin' ? 'Bypasses all checks — every permission' : `${r.permissions.length} permission${r.permissions.length === 1 ? '' : 's'}`}
              </p>
              {expandedRole === r.id && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.permissions.length === 0 ? (
                    <span className="text-xs text-ink/40">No permissions granted.</span>
                  ) : (
                    r.permissions.map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded-full bg-surface text-[10px] text-ink/60">{p}</span>
                    ))
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {message && <p className="text-sm text-secondary">{message}</p>}

      {loading ? (
        <p className="text-ink/50">Loading users...</p>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-ink/10">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-ink/5 hover:bg-white/50">
                  <td className="p-4 font-medium">{u.name}</td>
                  <td className="p-4 text-ink/60">{u.email}</td>
                  <td className="p-4">
                    <select
                      defaultValue={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      disabled={u.id === me?.id}
                      className="px-3 py-1.5 rounded-xl2 border border-ink/10 text-xs focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
                    >
                      {roles.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-ink/40 text-xs">{u.created_at?.slice(0, 10)}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => toggleStatus(u.id, u.status)}
                      disabled={u.id === me?.id}
                      className="text-xs font-semibold text-red-500 disabled:opacity-40"
                    >
                      {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
