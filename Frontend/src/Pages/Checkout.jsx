import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Truck, MapPin, Clock, Info } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';
import DeliveryLocationPicker from '../Components/DeliveryLocationPicker.jsx';
import { matchDeliveryArea } from '../utils/geo.js';

const METHOD_LABELS = {
  manual_bank: 'Bank Transfer',
  manual_mobile_wallet: 'Mobile Wallet',
};

export default function Checkout() {
  const { items, subtotal, hasOnOrder, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [methods, setMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [payLaterDays, setPayLaterDays] = useState(7);
  const [deliveryAreas, setDeliveryAreas] = useState([]);
  const [fulfillmentType, setFulfillmentType] = useState('delivery');
  const [deliveryAreaId, setDeliveryAreaId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(null); // {lat, lng}
  const [autoMatchedAreaName, setAutoMatchedAreaName] = useState('');
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
    api.get('/delivery-areas').then((r) => setDeliveryAreas(r.data?.data?.items || [])).catch(() => setDeliveryAreas([]));
    api.get('/settings/shop').then((r) => setShopSettings(r.data?.data?.items || {})).catch(() => setShopSettings({}));
  }, []);

  const deliveryOptions = deliveryAreas.filter((a) => !a.is_pickup);
  const pickupOptions = deliveryAreas.filter((a) => a.is_pickup);
  const areaOptions = fulfillmentType === 'pickup' ? pickupOptions : deliveryOptions;
  const selectedArea = areaOptions.find((a) => String(a.id) === String(deliveryAreaId));
  const deliveryFee = fulfillmentType === 'delivery' ? Number(selectedArea?.fee || 0) : 0;
  const estimatedTotal = subtotal + deliveryFee;

  const payLaterEligible = !hasOnOrder;

  useEffect(() => {
    setDeliveryAreaId('');
    setDeliveryLocation(null);
    setAutoMatchedAreaName('');
  }, [fulfillmentType]);

  // Once the customer pins (or "Use My Location"s) a spot on the map,
  // auto-select the delivery area whose admin-configured center+radius
  // actually contains it — spec: "pick it up to be the delivery area"
  // instead of making them separately choose one from the dropdown. The
  // dropdown itself is left untouched and still fully editable, so a
  // customer whose real address falls outside every configured zone (or
  // who simply disagrees with the match) can still pick manually.
  function handlePinChange(location) {
    setDeliveryLocation(location);
    const match = matchDeliveryArea(deliveryOptions, location.lat, location.lng);
    if (match) {
      setDeliveryAreaId(String(match.id));
      setAutoMatchedAreaName(match.name);
    } else {
      setAutoMatchedAreaName('');
    }
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError('');
    if (contactPhone.trim() === '') {
      setError('Please provide a phone number so we can reach you.');
      return;
    }
    if (fulfillmentType === 'delivery' && !deliveryAreaId) {
      setError('Please choose your delivery area.');
      return;
    }
    if (fulfillmentType === 'delivery' && !deliveryLocation) {
      setError('Please pin your delivery location on the map below.');
      return;
    }
    if (fulfillmentType === 'pickup' && pickupOptions.length > 0 && !deliveryAreaId) {
      setError('Please choose a pickup location.');
      return;
    }

    setPlacing(true);
    try {
      const { data } = await api.post('/orders', {
        items: items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id || undefined, quantity: i.quantity })),
        fulfillment_type: fulfillmentType,
        delivery_area_id: deliveryAreaId || undefined,
        contact_name: contactName.trim() || undefined,
        contact_phone: contactPhone.trim(),
        delivery_latitude: fulfillmentType === 'delivery' ? deliveryLocation?.lat : undefined,
        delivery_longitude: fulfillmentType === 'delivery' ? deliveryLocation?.lng : undefined,
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

        {paymentMethod !== 'pay_later' && (shopSettings[`shop.payment_instructions_${paymentMethod === 'manual_mobile_wallet' ? 'mobile_wallet' : 'bank'}`]) && (
          <div className="glass-card p-5 text-left mb-8">
            <h3 className="font-display font-semibold mb-2">{METHOD_LABELS[paymentMethod]} Instructions</h3>
            <p className="text-sm text-ink/70 whitespace-pre-line">
              {shopSettings[`shop.payment_instructions_${paymentMethod === 'manual_mobile_wallet' ? 'mobile_wallet' : 'bank'}`]}
            </p>
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

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold mb-4">Delivery or Pickup</h3>
            <div className="inline-flex rounded-xl2 border border-ink/10 p-1 bg-surface/60 mb-4">
              {[{ value: 'delivery', label: 'Delivery', icon: Truck }, { value: 'pickup', label: 'Pickup', icon: MapPin }].map((f) => (
                <button
                  key={f.value} type="button" onClick={() => setFulfillmentType(f.value)}
                  className={`px-4 py-1.5 rounded-xl2 text-xs font-semibold flex items-center gap-1.5 transition ${
                    fulfillmentType === f.value ? 'bg-brand-gradient text-white shadow-glass' : 'text-ink/60'
                  }`}
                >
                  <f.icon className="w-3.5 h-3.5" /> {f.label}
                </button>
              ))}
            </div>

            {areaOptions.length > 0 ? (
              <select
                value={deliveryAreaId}
                onChange={(e) => { setDeliveryAreaId(e.target.value); setAutoMatchedAreaName(''); }}
                className="w-full px-4 py-3 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
              >
                <option value="">{fulfillmentType === 'pickup' ? 'Choose a pickup location...' : 'Choose your delivery area...'}</option>
                {areaOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.is_pickup ? '' : ` — N$ ${Number(a.fee).toFixed(2)}`}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-ink/50">No {fulfillmentType} options are configured yet — please contact us to arrange {fulfillmentType}.</p>
            )}
            {autoMatchedAreaName && String(selectedArea?.id) === deliveryAreaId && (
              <p className="text-xs text-emerald-600 font-medium mt-2">
                Matched to "{autoMatchedAreaName}" from your pinned location below — change it above if that's wrong.
              </p>
            )}
            {selectedArea?.instructions && <p className="text-xs text-ink/45 mt-2">{selectedArea.instructions}</p>}
          </div>

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

            {/* Real pin, not a hand-typed street address — the ministry's
                delivery person gets a map to follow, not a description to
                interpret. See DeliveryLocationPicker.jsx. Pinning here also
                auto-selects the matching delivery area above. */}
            {fulfillmentType === 'delivery' && (
              <div className="mt-4 pt-4 border-t border-ink/10">
                <p className="text-sm font-semibold mb-2">Delivery Location</p>
                <DeliveryLocationPicker value={deliveryLocation} onChange={handlePinChange} />
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h3 className="font-display font-semibold mb-4">Coupon Code</h3>
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
                <label key={m} className="flex items-center gap-3 px-4 py-3 rounded-xl2 border border-ink/10 cursor-pointer has-[:checked]:border-secondary has-[:checked]:bg-secondary/5">
                  <input type="radio" name="payment_method" value={m} checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
                  <span className="text-sm">{METHOD_LABELS[m] || m}</span>
                </label>
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
          <div className="flex justify-between text-sm text-ink/70 mb-4">
            <span>Delivery</span>
            <span>{fulfillmentType === 'pickup' ? 'Free (pickup)' : selectedArea ? `N$ ${deliveryFee.toFixed(2)}` : '—'}</span>
          </div>
          <div className="border-t border-ink/10 pt-4 flex justify-between font-bold mb-6">
            <span>Estimated Total</span>
            <span>N$ {estimatedTotal.toFixed(2)}</span>
          </div>
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
