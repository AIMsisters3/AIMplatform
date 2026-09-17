import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Printer, AlertCircle } from 'lucide-react';
import api from '../api/axios.js';
import logo from '../assets/lg.png';

const METHOD_LABELS = { manual_bank: 'Bank Transfer', manual_mobile_wallet: 'Mobile Wallet' };

// Every document type this page can render. `title` is what prints at the
// top of the page; `requires` gates which types are even offerable given
// the order's current state (e.g. no "receipt" before anything's verified —
// per spec, a receipt is only issued after payment is actually confirmed).
const DOC_TYPES = {
  confirmation: { title: 'Order Confirmation', requires: () => true },
  invoice: { title: 'Invoice', requires: () => true },
  payment_instructions: { title: 'Payment Instructions', requires: (o) => o.payment_state !== 'paid' },
  receipt: { title: 'Receipt', requires: (o) => ['paid', 'partially_paid', 'partially_refunded', 'refunded'].includes(o.payment_state) },
  deposit_receipt: { title: 'Deposit Receipt', requires: (o) => !!o.deposit_paid_at },
  balance_statement: { title: 'Remaining Balance Statement', requires: (o) => Number(o.grand_total) - Number(o.amount_paid || 0) > 0.005 },
  packing_slip: { title: 'Packing Slip', requires: (o) => o.fulfillment_type === 'delivery' },
  delivery_note: { title: 'Delivery Note', requires: (o) => o.fulfillment_type === 'delivery' },
  pickup_confirmation: { title: 'Pickup Confirmation', requires: (o) => o.fulfillment_type === 'pickup' },
  credit_note: { title: 'Refund / Credit Note', requires: (o) => !!o._hasRefunds },
};

function money(n) {
  return `N$ ${Number(n || 0).toFixed(2)}`;
}

function fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function label(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function docNumber(order, type) {
  const prefix = { invoice: 'INV', receipt: 'RCT', deposit_receipt: 'DEP', credit_note: 'CN' }[type] || 'DOC';
  return `${prefix}-${order.order_number}`;
}

export default function OrderDocument() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const type = params.get('type') || 'confirmation';
  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [settings, setSettings] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/orders/${id}`),
      api.get(`/orders/${id}/payments`).catch(() => ({ data: { data: { items: [] } } })),
      api.get(`/orders/${id}/refunds`).catch(() => ({ data: { data: { items: [] } } })),
      api.get('/settings/shop').catch(() => ({ data: { data: { items: {} } } })),
    ])
      .then(([o, p, r, s]) => {
        if (cancelled) return;
        setOrder(o.data.data.item);
        setPayments(p.data.data.items || []);
        setRefunds(r.data.data.items || []);
        setSettings(s.data.data.items || {});
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load this order.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-6 py-16 text-center text-ink/50">Loading document...</div>;
  }
  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
        <p className="text-ink/60">{error || 'Order not found.'}</p>
        <Link to="/orders" className="text-secondary text-sm font-semibold mt-4 inline-block">Back to My Orders</Link>
      </div>
    );
  }

  const decorated = { ...order, _hasRefunds: refunds.length > 0 };
  const meta = DOC_TYPES[type];
  if (!meta) {
    return <div className="max-w-3xl mx-auto px-6 py-16 text-center text-ink/50">Unknown document type.</div>;
  }
  if (!meta.requires(decorated)) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-ink/60">This document isn't available for order {order.order_number} yet.</p>
        {type === 'receipt' && <p className="text-xs text-ink/40 mt-2">A receipt is only issued once a payment has been verified.</p>}
        {type === 'credit_note' && <p className="text-xs text-ink/40 mt-2">No refund has been recorded for this order.</p>}
        <Link to="/orders" className="text-secondary text-sm font-semibold mt-4 inline-block">Back to My Orders</Link>
      </div>
    );
  }

  const balanceDue = Number(order.grand_total) - Number(order.amount_paid || 0);
  const isReceiptLike = ['receipt', 'deposit_receipt'].includes(type);
  const businessName = settings['shop.business_name'] || 'AIMsisters';

  return (
    <div className="min-h-screen bg-ink/5 print:bg-white">
      <div className="max-w-3xl mx-auto px-4 py-6 print:hidden flex items-center justify-between">
        <Link to="/orders" className="text-sm text-ink/50 hover:text-ink">&larr; Back to My Orders</Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl2 bg-brand-gradient text-white text-sm font-semibold shadow-glass"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-glass print:shadow-none print:rounded-none p-8 sm:p-12 mb-10 print:mb-0 print:max-w-full">
        <div className="flex items-start justify-between border-b border-ink/10 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt={`${businessName} logo`} className="h-12 w-auto" />
            <div>
              <p className="font-display font-bold text-lg">{businessName}</p>
              {settings['shop.business_email'] && <p className="text-xs text-ink/50">{settings['shop.business_email']}</p>}
              {settings['shop.business_phone'] && <p className="text-xs text-ink/50">{settings['shop.business_phone']}</p>}
              {settings['shop.business_address'] && <p className="text-xs text-ink/50 whitespace-pre-line">{settings['shop.business_address']}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-display font-bold">{meta.title}</h1>
            {['invoice', 'receipt', 'deposit_receipt', 'credit_note'].includes(type) && (
              <p className="text-xs text-ink/50 mt-1">No. {docNumber(order, type)}</p>
            )}
            <p className="text-xs text-ink/50">Order {order.order_number}</p>
            <p className="text-xs text-ink/50">{fmtDate(order.created_at)}</p>
            {(type === 'invoice' || type === 'payment_instructions') && (
              <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">
                Payment Request — Not Proof of Payment
              </span>
            )}
            {isReceiptLike && (
              <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
                Confirmed Payment
              </span>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-ink/40 uppercase mb-1">Customer</p>
            <p className="text-ink/80">{order.customer_name || 'Customer'}</p>
            {order.customer_email && <p className="text-ink/50">{order.customer_email}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-ink/40 uppercase mb-1">{order.fulfillment_type === 'pickup' ? 'Pickup' : 'Delivery'}</p>
            <p className="text-ink/80">{order.delivery_area_name_snapshot || (order.fulfillment_type === 'pickup' ? 'Store pickup' : '—')}</p>
            {order.shipping_address && order.fulfillment_type === 'delivery' && (
              <p className="text-ink/50 whitespace-pre-line">{order.shipping_address}</p>
            )}
            {order.tracking_number && <p className="text-ink/50">Tracking: {order.tracking_number}</p>}
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs font-semibold text-ink/40 uppercase">
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((li) => (
              <tr key={li.id} className="border-b border-ink/5">
                <td className="py-2.5">
                  {li.product_name}
                  {li.variant_attributes_snapshot && (
                    <span className="text-ink/40"> ({Object.values(li.variant_attributes_snapshot).join(', ')})</span>
                  )}
                  {li.sourcing_type_snapshot === 'on_order' && (
                    <span className="ml-2 text-[10px] font-bold text-sky-600 uppercase">On Order</span>
                  )}
                </td>
                <td className="py-2.5 text-center">{li.quantity}</td>
                <td className="py-2.5 text-right">{money(li.unit_price)}</td>
                <td className="py-2.5 text-right">{money(li.unit_price * li.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-full sm:w-64 text-sm space-y-1.5">
            <div className="flex justify-between text-ink/60"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
            {Number(order.discount_total) > 0 && (
              <div className="flex justify-between text-ink/60"><span>Discount</span><span>-{money(order.discount_total)}</span></div>
            )}
            <div className="flex justify-between text-ink/60"><span>Delivery Fee</span><span>{money(order.shipping_total)}</span></div>
            <div className="flex justify-between font-bold text-base border-t border-ink/10 pt-1.5"><span>Total</span><span>{money(order.grand_total)}</span></div>
            {order.deposit_amount && (
              <div className="flex justify-between text-ink/60"><span>Deposit ({order.deposit_percent}%, product only)</span><span>{money(order.deposit_amount)}</span></div>
            )}
            <div className="flex justify-between text-emerald-700"><span>Amount Paid</span><span>{money(order.amount_paid)}</span></div>
            <div className="flex justify-between font-bold text-red-600"><span>Balance Due</span><span>{money(balanceDue)}</span></div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 text-sm">
          <span className="text-ink/40 text-xs font-semibold uppercase">Payment State</span>
          <span className="px-2.5 py-1 rounded-full bg-ink/5 text-ink/70 text-xs font-semibold">{label(order.payment_state)}</span>
          <span className="text-ink/40 text-xs font-semibold uppercase ml-4">Status</span>
          <span className="px-2.5 py-1 rounded-full bg-ink/5 text-ink/70 text-xs font-semibold">{label(order.status)}</span>
        </div>

        {(type === 'payment_instructions' || (type === 'invoice' && order.payment_state !== 'paid')) && (
          <div className="bg-surface/60 rounded-xl2 p-4 mb-6 text-sm">
            <p className="font-semibold mb-2">How to Pay</p>
            {order.payment_method === 'manual_mobile_wallet' && settings['shop.payment_instructions_mobile_wallet'] && (
              <p className="whitespace-pre-line text-ink/70">{settings['shop.payment_instructions_mobile_wallet']}</p>
            )}
            {order.payment_method !== 'manual_mobile_wallet' && settings['shop.payment_instructions_bank'] && (
              <p className="whitespace-pre-line text-ink/70">{settings['shop.payment_instructions_bank']}</p>
            )}
            {order.payment_reference && <p className="mt-2 text-ink/70">Please use reference: <span className="font-semibold">{order.payment_reference || order.order_number}</span></p>}
          </div>
        )}

        {isReceiptLike && payments.filter((p) => p.status === 'verified').length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-ink/40 uppercase mb-2">Verified Payments</p>
            <table className="w-full text-sm">
              <tbody>
                {payments.filter((p) => p.status === 'verified').map((p) => (
                  <tr key={p.id} className="border-b border-ink/5">
                    <td className="py-1.5">{fmtDate(p.verified_at || p.created_at)}</td>
                    <td className="py-1.5">{METHOD_LABELS[p.method] || p.method}{p.reference ? ` · Ref: ${p.reference}` : ''}</td>
                    <td className="py-1.5 text-right font-semibold">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {type === 'credit_note' && refunds.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-ink/40 uppercase mb-2">Refunds</p>
            <table className="w-full text-sm">
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id} className="border-b border-ink/5">
                    <td className="py-1.5">{fmtDate(r.processed_at || r.created_at)}</td>
                    <td className="py-1.5">
                      {r.reason || '—'}
                      {r.method ? ` · via ${label(r.method)}` : ''}
                    </td>
                    <td className="py-1.5 text-right font-semibold">{money(r.amount)}</td>
                    <td className="py-1.5 text-right"><span className="px-2 py-0.5 rounded-full bg-ink/5 text-[10px] font-bold uppercase">{label(r.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(type === 'packing_slip' || type === 'delivery_note') && (
          <div className="bg-surface/60 rounded-xl2 p-4 mb-6 text-sm text-ink/70">
            <p className="font-semibold mb-1">{type === 'packing_slip' ? 'Packing Notes' : 'Delivery Notes'}</p>
            <p>{order.delivery_area_name_snapshot ? `Deliver to: ${order.delivery_area_name_snapshot}` : ''}</p>
            {order.shipping_address && <p className="whitespace-pre-line">{order.shipping_address}</p>}
            {order.tracking_number && <p>Tracking number: {order.tracking_number}</p>}
          </div>
        )}

        {type === 'pickup_confirmation' && (
          <div className="bg-surface/60 rounded-xl2 p-4 mb-6 text-sm text-ink/70">
            <p className="font-semibold mb-1">Pickup Details</p>
            <p>{order.delivery_area_name_snapshot || 'Please confirm your pickup location with us.'}</p>
            <p className="mt-1">Please bring this confirmation and a valid ID when collecting your order.</p>
          </div>
        )}

        <p className="text-[10px] text-ink/30 text-center mt-10 pt-4 border-t border-ink/5">
          {businessName} · Generated {fmtDate(new Date().toISOString())}
        </p>
      </div>

      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          nav, footer { display: none !important; }
        }
      `}</style>
    </div>
  );
}
