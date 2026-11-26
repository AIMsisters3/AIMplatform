import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Clock, Info, Copy, Check } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

const METHOD_LABELS = {
  manual_bank: 'Bank Transfer',
  manual_mobile_wallet: 'Mobile Wallet',
};

/** Shows the admin-configured bank/mobile-wallet details right where the
 * customer picks that payment method — spec bug report: "you didnt even
 * display the number when the user chose ewallet or bank transwfer." */
function PaymentMethodDetails({ method, shopSettings }) {
  const [copied, setCopied] = useState(false);
  const number = method === 'manual_mobile_wallet' ? shopSettings['shop.mobile_wallet_number'] : null;
  const instructions = shopSettings[`shop.payment_instructions_${method === 'manual_mobile_wallet' ? 'mobile_wallet' : 'bank'}`];

  if (!number && !instructions) return null;

  function handleCopy() {
    if (!number) return;
    navigator.clipboard?.writeText(number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mt-3 p-4 rounded-xl2 bg-secondary/5 border border-secondary/20">
      {number && (
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <p className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Mobile Wallet Number</p>
            <p className="text-lg font-bold text-ink">{number}</p>
          </div>
          <button
            type="button" onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white text-xs font-semibold shadow-glass hover:bg-surface transition shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      {instructions && <p className="text-sm text-ink/70 whitespace-pre-line">{instructions}</p>}
    </div>
  );
}

export default function Checkout() {
  const { items, subtotal, hasOnOrder, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [methods, setMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [payLaterDays, setPayLaterDays] = useState(7);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { orders, split }
  const [shopSettings, setShopSettings] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (items.length === 0 && !result) {
      navigate('/cart', { replace: true });
    }
  }, [user, items.length, result, navigate]);

  useEffect(() => {
    api.get('/orders/payment-methods')
      .then((r) => {
        const list = r.data?.data?.methods || [];
        setMethods(list.filter((m) => m !== 'pay_later'));
        if (list.length) setPaymentMethod(list.find((m) => m !== 'pay_later') || list[0]);
      })
      .catch(() => setMethods(['manual_bank']));
    api.get('/settings/shop').then((r) => setShopSettings(r.data?.data?.items || {})).catch(() => setShopSettings({}));
  }, []);

  const estimatedTotal = subtotal;
  const payLaterEligible = !hasOnOrder;

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError('');
    if (contactPhone.trim() === '') {
      setError('Please provide a phone number so we can reach you.');
      return;
    }

    setPlacing(true);
    try {
      const { data } = await api.post('/orders', {
        items: items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id || undefined, quantity: i.quantity })),
        contact_name: contactName.trim() || undefined,
        contact_phone: contactPhone.trim(),
        coupon_code: couponCode || undefined,
        payment_method: paymentMethod === 'pay_later' ? 'pay_later' : paymentMethod,
        pay_later_days: paymentMethod === 'pay_later' ? payLaterDays : undefined,
      });
      setResult(data.data);
      clear();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong placing your order.');
    } finally {
      setPlacing(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
        <h1 className="text-3xl font-display font-bold mb-2">Thank you!</h1>
        <p className="text-ink/60 mb-8">
          {result.split
            ? 'Your cart included both in-stock and on-order items, so it was placed as two separate orders:'
            : 'Your order has been received.'}
        </p>
        <div className="space-y-4 mb-8 text-left">
          {result.orders.map((o) => (
            <div key={o.id} className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{o.order_number}</span>
                <span className="font-bold">N$ {Number(o.grand_total).toFixed(2)}</span>
              </div>
              <p className="text-xs text-ink/50 uppercase tracking-wide font-semibold mb-1">
                {o.order_kind === 'pay_later' ? 'Pay Later — Awaiting Approval' : o.order_kind === 'on_order' ? 'On Order — Awaiting Deposit Details' : 'Standard Order'}
              </p>
              <p className="text-sm text-ink/60">
                {o.order_kind === 'pay_later' && "We'll notify you once your Pay Later request is approved, with your exact payment deadline."}
                {o.order_kind === 'on_order' && "Our team will confirm a deposit amount and deadline shortly — we'll notify you."}
                {o.order_kind === 'standard' && 'Please complete payment using the instructions below, then submit your payment reference/proof from My Orders.'}
              </p>
            </div>
          ))}
        </div>

        {paymentMethod !== 'pay_later' && (
          <div className="glass-card p-5 text-left mb-6">
            <h3 className="font-display font-semibold mb-2">{METHOD_LABELS[paymentMethod]} Details</h3>
            <PaymentMethodDetails method={paymentMethod} shopSettings={shopSettings} />
          </div>
        )}

        {paymentMethod !== 'pay_later' && (
          <div className="rounded-2xl bg-secondary text-white p-5 text-left mb-8 shadow-glass">
            <p className="font-display font-semibold mb-1">Next step: upload your proof of payment</p>
            <p className="text-sm text-white/90">
              Once you've paid, go to <strong>My Orders</strong> and tap <strong>Submit Payment Proof</strong> on this order —
              that's how we confirm it. Your order stays "Awaiting Payment" until you do this.
            </p>
            <Link to="/orders" className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full bg-white text-secondary text-sm font-bold shadow-glass hover:opacity-90 transition">
              Go Submit Payment Proof
            </Link>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Link to="/orders" className="px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition">
            View My Orders
          </Link>
          <Link to="/shop" className="px-6 py-3 rounded-full glass-card font-semibold hover:bg-white transition">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {hasOnOrder && (
        <p className="flex items-start gap-2 text-sm text-ink/60 mb-6 bg-brand-gradient-soft rounded-2xl px-4 py-3">
          <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          Your cart has both in-stock and on-order items — placing this order will create two separate orders, each with its own tracking.
        </p>
      )}

      <p className="flex items-start gap-2 text-sm text-ink/60 mb-6 bg-brand-gradient-soft rounded-2xl px-4 py-3">
        <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
        We'll ask whether you'd like delivery or pickup — and your delivery location — once your order is ready. No need to arrange that now.
      </p>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold mb-4">Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-ink/50">Full Name (optional)</span>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 w-full px-4 py-3 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink/50">Phone Number *</span>
                <input
                  required
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 081 234 5678"
                  className="mt-1 w-full px-4 py-3 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </label>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-display font-semibold mb-1">Coupon Code</h3>
            <p className="text-xs text-ink/45 mb-4">A promo code for a discount, if you have one (e.g. from a promotion or an admin). Leave this blank otherwise — it's optional.</p>
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          <div className="glass-card p-6">
            <h3 className="font-display font-semibold mb-4">Payment Method</h3>
            <div className="space-y-2">
              {methods.map((m) => (
                <div key={m}>
                  <label className="flex items-center gap-3 px-4 py-3 rounded-xl2 border border-ink/10 cursor-pointer has-[:checked]:border-secondary has-[:checked]:bg-secondary/5">
                    <input type="radio" name="payment_method" value={m} checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
                    <span className="text-sm">{METHOD_LABELS[m] || m}</span>
                  </label>
                  {paymentMethod === m && <PaymentMethodDetails method={m} shopSettings={shopSettings} />}
                </div>
              ))}
              {payLaterEligible && (
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl2 border border-ink/10 cursor-pointer has-[:checked]:border-secondary has-[:checked]:bg-secondary/5">
                  <input type="radio" name="payment_method" value="pay_later" checked={paymentMethod === 'pay_later'} onChange={() => setPaymentMethod('pay_later')} />
                  <span className="text-sm flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-secondary" /> Pay Later (in-stock items only)</span>
                </label>
              )}
            </div>

            {paymentMethod === 'pay_later' && (
              <div className="mt-4 p-4 rounded-xl2 bg-surface/60">
                <label className="block text-xs font-semibold text-ink/50 mb-2">Pay within how many days? (1–14)</label>
                <input
                  type="number" min="1" max="14" value={payLaterDays}
                  onChange={(e) => setPayLaterDays(Math.max(1, Math.min(14, Number(e.target.value) || 1)))}
                  className="w-24 px-3 py-2 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <p className="text-xs text-ink/45 mt-2">Subject to admin approval. Stock is not reserved until your request is approved.</p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="glass-card p-6 h-fit sticky top-24">
          <h3 className="font-display font-semibold text-lg mb-4">Order Summary</h3>
          <div className="space-y-2 mb-4 max-h-56 overflow-y-auto scrollbar-none">
            {items.map((i) => {
              const unit = i.variant_price_override ?? (i.sale_price !== null && i.sale_price < i.price ? i.sale_price : i.price);
              return (
                <div key={`${i.product_id}::${i.variant_id || 'base'}`} className="flex justify-between text-sm text-ink/70">
                  <span className="truncate pr-2">{i.name} × {i.quantity}</span>
                  <span className="shrink-0">N$ {(unit * i.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-sm text-ink/70 mb-1">
            <span>Subtotal</span>
            <span>N$ {subtotal.toFixed(2)}</span>
          </div>
          <div className="border-t border-ink/10 pt-4 flex justify-between font-bold mb-2">
            <span>Total</span>
            <span>N$ {estimatedTotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-ink/45 mb-6">Delivery/pickup fee (if any) is added once we confirm where to send it.</p>
          <button
            disabled={placing}
            className="w-full py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-60"
          >
            {placing ? 'Placing order...' : paymentMethod === 'pay_later' ? 'Submit Pay Later Request' : 'Place Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
