import React, { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import api from '../api/axios.js';

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-sky-100 text-sky-700',
  processing: 'bg-sky-100 text-sky-700',
  shipped: 'bg-secondary/10 text-secondary',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  refunded: 'bg-ink/10 text-ink/50',
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({}); // order id -> full order (with items)

  useEffect(() => {
    api.get('/orders')
      .then((r) => setOrders(r.data.data.items))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(orderId) {
    if (expanded === orderId) {
      setExpanded(null);
      return;
    }
    setExpanded(orderId);
    if (!details[orderId]) {
      api.get(`/orders/${orderId}`)
        .then((r) => setDetails((d) => ({ ...d, [orderId]: r.data.data.item })))
        .catch(() => {});
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {loading ? (
        <p className="text-ink/50">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Package className="w-12 h-12 mx-auto text-ink/20 mb-3" />
          <p className="text-ink/50">You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="glass-card p-5">
              <button
                onClick={() => toggleExpand(o.id)}
                className="w-full flex items-center justify-between gap-4 text-left"
              >
                <div>
                  <p className="font-semibold">{o.order_number}</p>
                  <p className="text-xs text-ink/50">{new Date(o.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[o.status] || 'bg-ink/10'}`}>
                    {o.status}
                  </span>
                  <span className="font-bold">${Number(o.grand_total).toFixed(2)}</span>
                </div>
              </button>

              {expanded === o.id && (
                <div className="mt-4 pt-4 border-t border-ink/10 space-y-3 text-sm">
                  {details[o.id] ? (
                    details[o.id].items.map((li) => (
                      <div key={li.id} className="flex justify-between text-ink/70">
                        <span>{li.product_name} × {li.quantity}</span>
                        <span>${(li.unit_price * li.quantity).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-ink/40">Loading items...</p>
                  )}
                  {o.tracking_number && (
                    <p className="text-ink/60">Tracking number: <span className="font-semibold">{o.tracking_number}</span></p>
                  )}
                  <p className="text-ink/50">Shipping to: {o.shipping_address}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
