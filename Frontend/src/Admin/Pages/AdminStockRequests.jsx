import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../api/axios.js';

const STATUSES = ['', 'new', 'waiting_for_stock', 'customer_notified', 'converted', 'closed'];
const STATUS_BADGE = {
  new: 'bg-amber-100 text-amber-700',
  waiting_for_stock: 'bg-sky-100 text-sky-700',
  customer_notified: 'bg-violet-100 text-violet-700',
  converted: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-ink/10 text-ink/50',
};

function label(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminStockRequests() {
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/stock-requests', { params: { status: status || undefined, limit: 100 } })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, newStatus) {
    setMessage('');
    try {
      await api.post(`/stock-requests/${id}/status`, { status: newStatus });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not update this request.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-lg">Stock Requests</h2>
          <p className="text-xs text-ink/50">Customers asking to be notified when an out-of-stock item is back.</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s ? label(s) : 'All Statuses'}</option>)}
        </select>
      </div>

      {message && <p className="text-sm text-red-500">{message}</p>}

      {loading ? (
        <p className="text-ink/50">Loading...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">
          <Bell className="w-8 h-8 mx-auto text-ink/20 mb-2" />
          No stock requests{status ? ` with status "${label(status)}"` : ''}.
        </div>
      ) : (
        <div className="glass-card divide-y divide-ink/5">
          {items.map((r) => (
            <div key={r.id} className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Link to={`/shop/${r.product_slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-secondary">
                    {r.product_name}
                  </Link>
                  {r.requested_attributes && (
                    <span className="text-xs text-ink/50">({Object.values(r.requested_attributes).join(', ')})</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[r.status] || 'bg-ink/10'}`}>{label(r.status)}</span>
                </div>
                <p className="text-xs text-ink/50 mt-0.5">
                  Qty {r.quantity} · {r.customer_name} — <a href={`tel:${r.customer_phone}`} className="text-secondary font-semibold">{r.customer_phone}</a>
                  {' · '}{new Date(r.created_at).toLocaleDateString()}
                </p>
                {r.notes && <p className="text-xs text-ink/60 mt-1">"{r.notes}"</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.status !== 'customer_notified' && r.status !== 'converted' && r.status !== 'closed' && (
                  <button onClick={() => updateStatus(r.id, 'customer_notified')} className="px-3 py-1.5 rounded-xl2 bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Notified
                  </button>
                )}
                {r.status !== 'closed' && r.status !== 'converted' && (
                  <button onClick={() => updateStatus(r.id, 'closed')} className="px-3 py-1.5 rounded-xl2 bg-ink/10 text-ink/60 text-xs font-semibold flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
