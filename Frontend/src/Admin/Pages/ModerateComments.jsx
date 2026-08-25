import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'spam', label: 'Spam' },
];

export default function ModerateComments() {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/comments/moderation', { params: { status, limit: 50 } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function setCommentStatus(id, newStatus) {
    await api.post(`/comments/${id}/status`, { status: newStatus });
    setMessage(`Comment marked as ${newStatus}.`);
    setItems((prev) => prev.filter((c) => c.id !== id));
  }

  async function deleteComment(id) {
    if (!confirm('Permanently delete this comment?')) return;
    await api.delete(`/comments/${id}`);
    setItems((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Comments Moderation</h2>
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatus(t.value)}
              className={`px-4 py-2 rounded-xl2 text-xs font-semibold ${status === t.value ? 'bg-brand-gradient text-white' : 'glass-card'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {message && <p className="text-sm text-secondary">{message}</p>}

      {loading ? (
        <p className="text-ink/50">Loading comments...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">No {status} comments.</div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="font-semibold text-sm">{c.user_name || 'Unknown user'}</p>
                  <p className="text-xs text-ink/40">on "{c.content_title}" · {new Date(c.created_at).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-sm text-ink/80 mb-4">{c.body}</p>
              <div className="flex gap-2 text-xs font-semibold">
                {status !== 'approved' && (
                  <button onClick={() => setCommentStatus(c.id, 'approved')} className="px-3 py-1.5 rounded-xl2 bg-emerald-500 text-white">Approve</button>
                )}
                {status !== 'spam' && (
                  <button onClick={() => setCommentStatus(c.id, 'spam')} className="px-3 py-1.5 rounded-xl2 bg-amber-500 text-white">Mark Spam</button>
                )}
                {status !== 'pending' && (
                  <button onClick={() => setCommentStatus(c.id, 'pending')} className="px-3 py-1.5 rounded-xl2 bg-ink/70 text-white">Move to Pending</button>
                )}
                <button onClick={() => deleteComment(c.id)} className="px-3 py-1.5 rounded-xl2 bg-red-500 text-white">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
