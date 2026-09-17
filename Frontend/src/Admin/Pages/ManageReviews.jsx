import React, { useCallback, useEffect, useState } from 'react';
import { Star, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import api from '../../api/axios.js';

const STATUSES = ['pending', 'approved', 'rejected'];

function Stars({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-ink/15'}`} />
      ))}
    </div>
  );
}

export default function ManageReviews() {
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/reviews/moderation', { params: { status, limit: 50 } })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, newStatus) {
    setMessage('');
    try {
      await api.post(`/reviews/${id}/status`, { status: newStatus });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not update review status.');
    }
  }

  async function submitResponse(id) {
    if (!responseText.trim()) return;
    try {
      await api.post(`/reviews/${id}/respond`, { response: responseText.trim() });
      setRespondingTo(null);
      setResponseText('');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not post response.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Product Reviews</h2>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {message && <p className="text-sm text-red-500">{message}</p>}

      {loading ? (
        <p className="text-ink/50">Loading...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">No {status} reviews.</div>
      ) : (
        <div className="glass-card divide-y divide-ink/5">
          {items.map((r) => (
            <div key={r.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.product_name}</span>
                    <Stars value={r.rating} />
                  </div>
                  <p className="text-xs text-ink/50">{r.user_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                {status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => updateStatus(r.id, 'approved')} className="px-3 py-1.5 rounded-xl2 bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => updateStatus(r.id, 'rejected')} className="px-3 py-1.5 rounded-xl2 bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
              {r.review && <p className="text-sm text-ink/70 mb-2">{r.review}</p>}
              {r.admin_response ? (
                <div className="mt-2 pl-4 border-l-2 border-secondary/30">
                  <p className="text-xs font-semibold text-secondary mb-1">Your response</p>
                  <p className="text-sm text-ink/60">{r.admin_response}</p>
                </div>
              ) : respondingTo === r.id ? (
                <div className="flex gap-2 mt-2">
                  <input
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write a public response..."
                    className="flex-1 px-3 py-2 rounded-xl2 border border-ink/10 text-sm"
                  />
                  <button onClick={() => submitResponse(r.id)} className="px-4 py-2 rounded-xl2 bg-brand-gradient text-white text-xs font-semibold shadow-glass">Post</button>
                  <button onClick={() => { setRespondingTo(null); setResponseText(''); }} className="px-3 py-2 text-xs text-ink/50">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setRespondingTo(r.id)} className="flex items-center gap-1.5 text-xs font-semibold text-secondary mt-1">
                  <MessageSquare className="w-3.5 h-3.5" /> Respond
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
