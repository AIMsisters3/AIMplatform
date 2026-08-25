import React, { useCallback, useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import api from '../../api/axios.js';

const STATUSES = ['', 'pending', 'subscribed', 'unsubscribed'];

export default function ManageNewsletter() {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/newsletter/subscribers', { params: { status: status || undefined, limit: 100 } })
      .then((r) => { setItems(r.data.data.items); setCount(r.data.data.subscribed_count); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Newsletter Subscribers</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
          {STATUSES.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : 'All'}</option>)}
        </select>
      </div>

      <div className="glass-card p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-brand-gradient-soft flex items-center justify-center">
          <Mail className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-xs text-ink/50">Confirmed subscribers</p>
        </div>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading subscribers...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">No subscribers match this filter.</div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-ink/10">
                <th className="p-4">Email</th>
                <th className="p-4">Language</th>
                <th className="p-4">Status</th>
                <th className="p-4">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-ink/5 hover:bg-white/50">
                  <td className="p-4 font-medium">{s.email}</td>
                  <td className="p-4 text-ink/60">{s.language}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-ink/10 capitalize">{s.status}</span>
                  </td>
                  <td className="p-4 text-ink/40 text-xs">{s.subscribed_at?.slice(0, 10) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
