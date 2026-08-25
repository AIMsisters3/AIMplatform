import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';

const STATUSES = ['', 'pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded'];
const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-sky-100 text-sky-700',
  processing: 'bg-sky-100 text-sky-700',
  shipped: 'bg-secondary/10 text-secondary',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  refunded: 'bg-ink/10 text-ink/50',
};

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({});
  const [tracking, setTracking] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    api.get('/orders', { params: { all: 1, status: status || undefined, limit: 50 } })
      .then((r) => setOrders(r.data.data.items))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(orderId) {
    if (expanded === orderId) { setExpanded(null); return; }
    setExpanded(orderId);
    if (!details[orderId]) {
      api.get(`/orders/${orderId}`).then((r) => setDetails((d) => ({ ...d, [orderId]: r.data.data.item })));
    }
  }

  async function updateStatus(orderId, newStatus) {
    await api.post(`/orders/${orderId}/status`, { status: newStatus, tracking_number: tracking[orderId] || undefined });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Manage Orders</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
          {STATUSES.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : 'All Statuses'}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">No orders match this filter.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="glass-card p-5">
              <button onClick={() => toggleExpand(o.id)} className="w-full flex flex-wrap items-center justify-between gap-3 text-left">
                <div>
                  <p className="font-semibold">{o.order_number}</p>
                  <p className="text-xs text-ink/50">{o.customer_name || 'Guest'} · {o.customer_email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[o.status] || 'bg-ink/10'}`}>{o.status}</span>
                  <span className="font-bold">${Number(o.grand_total).toFixed(2)}</span>
                </div>
              </button>

              {expanded === o.id && (
                <div className="mt-4 pt-4 border-t border-ink/10 space-y-4 text-sm">
                  {details[o.id] ? (
                    <div className="space-y-1">
                      {details[o.id].items.map((li) => (
                        <div key={li.id} className="flex justify-between text-ink/70">
                          <span>{li.product_name} × {li.quantity}</span>
                          <span>${(li.unit_price * li.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-ink/40">Loading items...</p>}
                  <p className="text-ink/50">Shipping to: {o.shipping_address}</p>

                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-ink/10">
                    <select
                      defaultValue={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                    >
                      {STATUSES.filter((s) => s).map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <input
                      value={tracking[o.id] ?? o.tracking_number ?? ''}
                      onChange={(e) => setTracking((t) => ({ ...t, [o.id]: e.target.value }))}
                      placeholder="Tracking number"
                      className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                    <button
                      onClick={() => updateStatus(o.id, o.status)}
                      className="px-4 py-2 rounded-xl2 bg-brand-gradient text-white text-xs font-semibold shadow-glass"
                    >
                      Save Tracking
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
