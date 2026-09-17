import React, { useEffect, useState } from 'react';
import { Package, Clock, Truck, Link2, Upload, Loader2, Eye, CheckCircle2, XCircle } from 'lucide-react';
import api from '../api/axios.js';

const STATUS_BADGE = {
  awaiting_approval: 'bg-amber-100 text-amber-700',
  awaiting_payment: 'bg-amber-100 text-amber-700',
  processing: 'bg-sky-100 text-sky-700',
  supplier_ordered: 'bg-sky-100 text-sky-700',
  arrived: 'bg-violet-100 text-violet-700',
  ready_for_pickup: 'bg-violet-100 text-violet-700',
  shipped: 'bg-secondary/10 text-secondary',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
};

const PAYMENT_BADGE = {
  pending: 'bg-ink/10 text-ink/50',
  awaiting_verification: 'bg-amber-100 text-amber-700',
  partially_paid: 'bg-sky-100 text-sky-700',
  paid: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-600',
  expired: 'bg-red-100 text-red-600',
  cancelled: 'bg-ink/10 text-ink/50',
  refunded: 'bg-ink/10 text-ink/50',
  partially_refunded: 'bg-ink/10 text-ink/50',
};

const RECORD_BADGE = {
  awaiting_verification: { label: 'Awaiting Verification', className: 'bg-amber-100 text-amber-700', icon: Clock },
  verified: { label: 'Verified', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-600', icon: XCircle },
};

const KIND_LABEL = { pay_later: 'Pay Later', on_order: 'On Order', standard: null };
const CLOSED_PAYMENT_STATES = ['paid', 'cancelled', 'expired', 'refunded'];

function label(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function PaymentHistory({ orderId, refreshKey }) {
  const [records, setRecords] = useState(null);

  useEffect(() => {
    api.get(`/orders/${orderId}/payments`).then((r) => setRecords(r.data?.data?.items || [])).catch(() => setRecords([]));
  }, [orderId, refreshKey]);

  async function viewProof(paymentId) {
    try {
      const res = await api.get(`/payments/${paymentId}/proof`, { responseType: 'blob' });
      window.open(URL.createObjectURL(res.data), '_blank');
    } catch {
      // best-effort
    }
  }

  if (!records || records.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-ink/40">Payment submissions</p>
      {records.map((r) => {
        const meta = RECORD_BADGE[r.status] || {};
        const Icon = meta.icon || Clock;
        return (
          <div key={r.id} className="flex items-center justify-between gap-3 bg-surface/60 rounded-xl2 px-3 py-2">
            <span className="text-ink/70">
              N$ {Number(r.amount).toFixed(2)} · {r.method === 'manual_mobile_wallet' ? 'Mobile Wallet' : 'Bank Transfer'}
              {r.reference && ` · Ref: ${r.reference}`}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {r.proof_file_path && (
                <button onClick={() => viewProof(r.id)} className="text-secondary" aria-label="View proof"><Eye className="w-3.5 h-3.5" /></button>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${meta.className || 'bg-ink/10 text-ink/50'}`}>
                <Icon className="w-2.5 h-2.5" /> {meta.label || label(r.status)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentSubmitForm({ orderId, defaultAmount, onSubmitted }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState('manual_bank');
  const [amount, setAmount] = useState(defaultAmount.toFixed(2));
  const [reference, setReference] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!reference.trim() && !file) {
      setError('Please provide a payment reference and/or upload proof of payment.');
      return;
    }
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('method', method);
      data.append('amount', amount);
      if (reference.trim()) data.append('reference', reference.trim());
      if (file) data.append('proof', file);
      await api.post(`/orders/${orderId}/payments`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setOpen(false);
      setReference('');
      setFile(null);
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit payment.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
        <Upload className="w-3.5 h-3.5" /> Submit Payment Reference / Proof
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface/60 rounded-xl2 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm">
          <option value="manual_bank">Bank Transfer</option>
          <option value="manual_mobile_wallet">Mobile Wallet</option>
        </select>
        <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount paid (N$)" className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm" />
      </div>
      <input value={reference} onChange={(e) => setReference(e.target.value)}
        placeholder="Payment reference (e.g. bank ref number)" className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm" />
      <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files[0] || null)} className="text-xs" />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl2 bg-brand-gradient text-white text-xs font-semibold shadow-glass disabled:opacity-60 flex items-center gap-1.5">
          {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl2 text-xs font-semibold text-ink/50">Cancel</button>
      </div>
    </form>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({}); // order id -> full order (with items)
  const [paymentsRefresh, setPaymentsRefresh] = useState({});

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
          {orders.map((o) => {
            const d = details[o.id];
            const balanceDue = Number(o.grand_total) - Number(o.amount_paid || 0);
            const canSubmitPayment = o.status !== 'awaiting_approval' && !CLOSED_PAYMENT_STATES.includes(o.payment_state) && balanceDue > 0;
            return (
              <div key={o.id} className="glass-card p-5">
                <button
                  onClick={() => toggleExpand(o.id)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 text-left"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold">{o.order_number}</p>
                      {KIND_LABEL[o.order_kind] && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {KIND_LABEL[o.order_kind]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink/50">{new Date(o.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[o.status] || 'bg-ink/10'}`}>{label(o.status)}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PAYMENT_BADGE[o.payment_state] || 'bg-ink/10'}`}>{label(o.payment_state)}</span>
                    <span className="font-bold">N$ {Number(o.grand_total).toFixed(2)}</span>
                  </div>
                </button>

                {expanded === o.id && (
                  <div className="mt-4 pt-4 border-t border-ink/10 space-y-3 text-sm">
                    {d ? (
                      <>
                        {d.items.map((li) => (
                          <div key={li.id} className="flex justify-between text-ink/70">
                            <span>
                              {li.product_name} × {li.quantity}
                              {li.variant_attributes_snapshot && (
                                <span className="text-ink/40"> ({Object.values(li.variant_attributes_snapshot).join(', ')})</span>
                              )}
                              {li.sourcing_type_snapshot === 'on_order' && li.procurement_status && (
                                <span className="ml-2 text-[10px] font-bold text-sky-600 uppercase">{label(li.procurement_status)}</span>
                              )}
                            </span>
                            <span>N$ {(li.unit_price * li.quantity).toFixed(2)}</span>
                          </div>
                        ))}

                        {o.order_kind === 'pay_later' && d.pay_later && (
                          <div className="bg-surface/60 rounded-xl2 px-4 py-3">
                            {d.pay_later.approved_at ? (
                              <p className="text-ink/70">Payment due by <span className="font-semibold">{new Date(d.pay_later.due_at).toLocaleString()}</span></p>
                            ) : d.pay_later.declined_at ? (
                              <p className="text-red-600">Request declined{d.pay_later.decline_reason ? `: ${d.pay_later.decline_reason}` : '.'}</p>
                            ) : (
                              <p className="text-ink/70">Your Pay Later request is awaiting approval.</p>
                            )}
                          </div>
                        )}

                        {o.order_kind === 'on_order' && (
                          <div className="bg-surface/60 rounded-xl2 px-4 py-3 space-y-1">
                            {o.deposit_amount ? (
                              <>
                                <p className="text-ink/70">Deposit ({o.deposit_percent}%): <span className="font-semibold">N$ {Number(o.deposit_amount).toFixed(2)}</span></p>
                                {o.deposit_deadline_at && <p className="text-ink/70">Due by <span className="font-semibold">{new Date(o.deposit_deadline_at).toLocaleString()}</span></p>}
                              </>
                            ) : (
                              <p className="text-ink/70">We're finalizing your deposit amount and supplier timeline — you'll be notified shortly.</p>
                            )}
                          </div>
                        )}

                        {balanceDue > 0 && (
                          <p className="text-ink/70">Balance due: <span className="font-semibold">N$ {balanceDue.toFixed(2)}</span></p>
                        )}

                        <PaymentHistory orderId={o.id} refreshKey={paymentsRefresh[o.id] || 0} />

                        {canSubmitPayment && (
                          <PaymentSubmitForm
                            orderId={o.id}
                            defaultAmount={o.deposit_amount && !o.deposit_paid_at ? Number(o.deposit_amount) : balanceDue}
                            onSubmitted={() => setPaymentsRefresh((p) => ({ ...p, [o.id]: (p[o.id] || 0) + 1 }))}
                          />
                        )}

                        {d.sibling_orders?.length > 0 && (
                          <p className="flex items-center gap-1.5 text-ink/50 text-xs">
                            <Link2 className="w-3.5 h-3.5" /> Split from the same checkout: {d.sibling_orders.map((s) => s.order_number).join(', ')}
                          </p>
                        )}

                        {o.tracking_number && (
                          <p className="text-ink/60">Tracking number: <span className="font-semibold">{o.tracking_number}</span></p>
                        )}
                        <p className="text-ink/50 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" /> {o.fulfillment_type === 'pickup' ? 'Pickup' : 'Delivery'}
                          {o.delivery_area_name_snapshot ? ` — ${o.delivery_area_name_snapshot}` : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-ink/40">Loading items...</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
