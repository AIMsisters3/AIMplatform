import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Link2, FileText } from 'lucide-react';
import api from '../../api/axios.js';

const STATUSES = ['', 'awaiting_approval', 'awaiting_payment', 'processing', 'supplier_ordered', 'arrived', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled'];
const ORDER_KINDS = ['', 'standard', 'pay_later', 'on_order'];
const DOCUMENT_LINKS = [
  { type: 'confirmation', label: 'Confirmation' },
  { type: 'invoice', label: 'Invoice' },
  { type: 'payment_instructions', label: 'Payment Instructions' },
  { type: 'receipt', label: 'Receipt' },
  { type: 'deposit_receipt', label: 'Deposit Receipt' },
  { type: 'balance_statement', label: 'Balance Statement' },
  { type: 'packing_slip', label: 'Packing Slip' },
  { type: 'delivery_note', label: 'Delivery Note' },
  { type: 'pickup_confirmation', label: 'Pickup Confirmation' },
  { type: 'credit_note', label: 'Credit Note' },
];
const REFUND_STATUS_BADGE = {
  requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-sky-100 text-sky-700',
  rejected: 'bg-red-100 text-red-600',
  processed: 'bg-emerald-100 text-emerald-700',
};
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

function label(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [orderKind, setOrderKind] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({});
  const [tracking, setTracking] = useState({});
  const [depositForm, setDepositForm] = useState({}); // orderId -> {percent, deadline}
  const [message, setMessage] = useState('');
  const [refunds, setRefunds] = useState({}); // orderId -> refund[]
  const [refundForm, setRefundForm] = useState({}); // orderId -> {amount, reason}
  const [processForm, setProcessForm] = useState({}); // refundId -> {method, notes}

  const load = useCallback(() => {
    setLoading(true);
    api.get('/orders', { params: { all: 1, status: status || undefined, order_kind: orderKind || undefined, limit: 50 } })
      .then((r) => setOrders(r.data.data.items))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [status, orderKind]);

  useEffect(() => { load(); }, [load]);

  function refreshDetail(orderId) {
    return api.get(`/orders/${orderId}`).then((r) => setDetails((d) => ({ ...d, [orderId]: r.data.data.item })));
  }

  function refreshRefunds(orderId) {
    return api.get(`/orders/${orderId}/refunds`).then((r) => setRefunds((rf) => ({ ...rf, [orderId]: r.data.data.items || [] })));
  }

  function toggleExpand(orderId) {
    if (expanded === orderId) { setExpanded(null); return; }
    setExpanded(orderId);
    if (!details[orderId]) refreshDetail(orderId);
    if (!refunds[orderId]) refreshRefunds(orderId);
  }

  async function requestRefund(orderId) {
    const form = refundForm[orderId] || {};
    if (!form.amount || Number(form.amount) <= 0) {
      setMessage('Enter a refund amount first.');
      return;
    }
    try {
      await api.post(`/orders/${orderId}/refunds`, { amount: Number(form.amount), reason: form.reason || undefined });
      setRefundForm((f) => ({ ...f, [orderId]: { amount: '', reason: '' } }));
      refreshRefunds(orderId);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not request refund.');
    }
  }

  async function decideRefund(refundId, orderId, decision) {
    try {
      await api.post(`/refunds/${refundId}/decide`, { decision });
      refreshRefunds(orderId);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not record decision.');
    }
  }

  async function processRefund(refundId, orderId) {
    const form = processForm[refundId] || {};
    if (!form.method) {
      setMessage('Specify how the refund was sent before marking it processed.');
      return;
    }
    try {
      await api.post(`/refunds/${refundId}/process`, { method: form.method, notes: form.notes || undefined });
      refreshRefunds(orderId);
      refreshDetail(orderId);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not process refund.');
    }
  }

  async function updateStatus(orderId, newStatus) {
    setMessage('');
    try {
      await api.post(`/orders/${orderId}/status`, { status: newStatus, tracking_number: tracking[orderId] || undefined });
      load();
      refreshDetail(orderId);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not update status.');
    }
  }

  async function approvePayLater(orderId) {
    setMessage('');
    try {
      await api.post(`/orders/${orderId}/pay-later/approve`);
      load();
      refreshDetail(orderId);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not approve — stock may no longer be sufficient.');
    }
  }

  async function declinePayLater(orderId) {
    const reason = prompt('Reason for declining (optional):') || '';
    try {
      await api.post(`/orders/${orderId}/pay-later/decline`, { reason });
      load();
      refreshDetail(orderId);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not decline.');
    }
  }

  async function submitDeposit(orderId) {
    const form = depositForm[orderId] || {};
    if (!form.percent || !form.deadline) {
      setMessage('Choose a deposit percentage and deadline first.');
      return;
    }
    try {
      await api.post(`/orders/${orderId}/deposit`, { percent: Number(form.percent), deadline_at: form.deadline });
      load();
      refreshDetail(orderId);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not set deposit.');
    }
  }

  async function updateProcurement(orderId, itemId, procStatus) {
    try {
      await api.post(`/orders/${orderId}/item-procurement/${itemId}`, { status: procStatus });
      refreshDetail(orderId);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not update procurement status.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Manage Orders</h2>
        <div className="flex gap-2">
          <select value={orderKind} onChange={(e) => setOrderKind(e.target.value)}
            className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
            {ORDER_KINDS.map((k) => <option key={k} value={k}>{k ? label(k) : 'All Types'}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
            {STATUSES.map((s) => <option key={s} value={s}>{s ? label(s) : 'All Statuses'}</option>)}
          </select>
        </div>
      </div>

      {message && <p className="text-sm text-red-500">{message}</p>}

      {loading ? (
        <p className="text-ink/50">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">No orders match this filter.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const d = details[o.id];
            const balanceDue = Number(o.grand_total) - Number(o.amount_paid || 0);
            return (
              <div key={o.id} className="glass-card p-5">
                <button onClick={() => toggleExpand(o.id)} className="w-full flex flex-wrap items-center justify-between gap-3 text-left">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{o.order_number}</p>
                      {o.order_kind !== 'standard' && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {label(o.order_kind)}
                        </span>
                      )}
                      {o.split_group_id && <Link2 className="w-3.5 h-3.5 text-ink/30" />}
                    </div>
                    <p className="text-xs text-ink/50">{o.customer_name || 'Guest'} · {o.customer_email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[o.status] || 'bg-ink/10'}`}>{label(o.status)}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-ink/10 text-ink/60">{label(o.payment_state)}</span>
                    <span className="font-bold">N$ {Number(o.grand_total).toFixed(2)}</span>
                  </div>
                </button>

                {expanded === o.id && (
                  <div className="mt-4 pt-4 border-t border-ink/10 space-y-4 text-sm">
                    {d ? (
                      <div className="space-y-1">
                        {d.items.map((li) => (
                          <div key={li.id} className="flex items-center justify-between text-ink/70 gap-3">
                            <span className="truncate">
                              {li.product_name} × {li.quantity}
                              {li.variant_attributes_snapshot && (
                                <span className="text-ink/40"> ({Object.values(li.variant_attributes_snapshot).join(', ')})</span>
                              )}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span>N$ {(li.unit_price * li.quantity).toFixed(2)}</span>
                              {li.sourcing_type_snapshot === 'on_order' && (
                                <select
                                  value={li.procurement_status || 'pending'}
                                  onChange={(e) => updateProcurement(o.id, li.id, e.target.value)}
                                  className="px-2 py-1 rounded-lg border border-ink/10 text-xs"
                                >
                                  {['pending', 'ordered_from_supplier', 'arrived', 'unavailable'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
                                </select>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-ink/40">Loading items...</p>}

                    <p className="text-ink/50">
                      {o.fulfillment_type === 'pickup' ? 'Pickup' : 'Delivery'}{o.delivery_area_name_snapshot ? ` — ${o.delivery_area_name_snapshot}` : ''} · Contact: {o.shipping_address}
                    </p>
                    <p className="text-ink/50">Paid so far: N$ {Number(o.amount_paid || 0).toFixed(2)} {balanceDue > 0 && <span className="text-red-500 font-semibold">(N$ {balanceDue.toFixed(2)} outstanding)</span>}</p>

                    {o.order_kind === 'pay_later' && o.status === 'awaiting_approval' && (
                      <div className="flex gap-2 pt-2 border-t border-ink/10">
                        <button onClick={() => approvePayLater(o.id)} className="px-4 py-2 rounded-xl2 bg-emerald-500 text-white text-xs font-semibold">Approve Pay Later</button>
                        <button onClick={() => declinePayLater(o.id)} className="px-4 py-2 rounded-xl2 bg-red-500 text-white text-xs font-semibold">Decline</button>
                      </div>
                    )}

                    {o.order_kind === 'on_order' && !o.deposit_amount && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ink/10">
                        <select
                          value={depositForm[o.id]?.percent || ''}
                          onChange={(e) => setDepositForm((f) => ({ ...f, [o.id]: { ...f[o.id], percent: e.target.value } }))}
                          className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm"
                        >
                          <option value="">Deposit %</option>
                          <option value="30">30%</option>
                          <option value="50">50%</option>
                        </select>
                        <input
                          type="datetime-local"
                          value={depositForm[o.id]?.deadline || ''}
                          onChange={(e) => setDepositForm((f) => ({ ...f, [o.id]: { ...f[o.id], deadline: e.target.value } }))}
                          className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm"
                        />
                        <button onClick={() => submitDeposit(o.id)} className="px-4 py-2 rounded-xl2 bg-brand-gradient text-white text-xs font-semibold shadow-glass">Set Deposit</button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-ink/10">
                      <select
                        defaultValue={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                      >
                        {STATUSES.filter((s) => s).map((s) => <option key={s} value={s}>{label(s)}</option>)}
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
                        Save
                      </button>
                    </div>

                    <div className="pt-3 border-t border-ink/10">
                      <p className="text-xs font-semibold text-ink/40 mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Documents
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {DOCUMENT_LINKS.map(({ type, label: docLabel }) => (
                          <Link key={type} to={`/orders/${o.id}/document?type=${type}`} target="_blank" rel="noopener noreferrer" className="text-xs text-secondary hover:underline">
                            {docLabel}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-ink/10 space-y-2">
                      <p className="text-xs font-semibold text-ink/40">Refunds</p>
                      {(refunds[o.id] || []).map((r) => (
                        <div key={r.id} className="bg-surface/60 rounded-xl2 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-ink/70">
                            N$ {Number(r.amount).toFixed(2)}{r.reason ? ` — ${r.reason}` : ''}
                            {r.method ? ` · via ${label(r.method)}` : ''}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${REFUND_STATUS_BADGE[r.status] || 'bg-ink/10'}`}>{label(r.status)}</span>
                            {r.status === 'requested' && (
                              <>
                                <button onClick={() => decideRefund(r.id, o.id, 'approved')} className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-semibold">Approve</button>
                                <button onClick={() => decideRefund(r.id, o.id, 'rejected')} className="px-2.5 py-1 rounded-lg bg-red-500 text-white font-semibold">Reject</button>
                              </>
                            )}
                            {r.status === 'approved' && (
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={processForm[r.id]?.method || ''}
                                  onChange={(e) => setProcessForm((f) => ({ ...f, [r.id]: { ...f[r.id], method: e.target.value } }))}
                                  className="px-2 py-1 rounded-lg border border-ink/10"
                                >
                                  <option value="">Sent via...</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                  <option value="mobile_wallet">Mobile Wallet</option>
                                  <option value="cash">Cash</option>
                                  <option value="other">Other</option>
                                </select>
                                <button onClick={() => processRefund(r.id, o.id)} className="px-2.5 py-1 rounded-lg bg-brand-gradient text-white font-semibold">Mark Processed</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="number" step="0.01" min="0"
                          value={refundForm[o.id]?.amount || ''}
                          onChange={(e) => setRefundForm((f) => ({ ...f, [o.id]: { ...f[o.id], amount: e.target.value } }))}
                          placeholder="Refund amount (N$)"
                          className="px-3 py-1.5 rounded-xl2 border border-ink/10 text-xs w-36"
                        />
                        <input
                          value={refundForm[o.id]?.reason || ''}
                          onChange={(e) => setRefundForm((f) => ({ ...f, [o.id]: { ...f[o.id], reason: e.target.value } }))}
                          placeholder="Reason (optional)"
                          className="px-3 py-1.5 rounded-xl2 border border-ink/10 text-xs flex-1 min-w-[10rem]"
                        />
                        <button onClick={() => requestRefund(o.id)} className="px-3 py-1.5 rounded-xl2 bg-ink text-white text-xs font-semibold">Request Refund</button>
                      </div>
                    </div>
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
