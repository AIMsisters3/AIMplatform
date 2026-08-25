import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

const METHOD_LABELS = {
  manual: 'Pay Offline (bank transfer / cash — confirmed by our team)',
};

export default function Checkout() {
  const { items, subtotal, hasPhysical, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [methods, setMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('manual');
  const [shippingAddress, setShippingAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (items.length === 0 && !placedOrder) {
      navigate('/cart', { replace: true });
    }
  }, [user, items.length, placedOrder, navigate]);

  useEffect(() => {
    api.get('/orders/payment-methods')
      .then((r) => {
        const list = r.data?.data?.methods || [];
        setMethods(list);
        if (list.length) setPaymentMethod(list[0]);
      })
      .catch(() => setMethods(['manual']));
  }, []);

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError('');
    if (shippingAddress.trim() === '') {
      setError('Please provide a shipping / contact address.');
      return;
    }
    setPlacing(true);
    try {
      const { data } = await api.post('/orders', {
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        shipping_address: shippingAddress,
        coupon_code: couponCode || undefined,
        payment_method: paymentMethod,
      });
      setPlacedOrder(data.data.item);
      clear();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong placing your order.');
    } finally {
      setPlacing(false);
    }
  }

  if (placedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
        <h1 className="text-3xl font-display font-bold mb-2">Thank you!</h1>
        <p className="text-ink/60 mb-1">Your order has been received.</p>
        <p className="text-ink/60 mb-8">
          Order number: <span className="font-semibold text-ink">{placedOrder.order_number}</span> · Total: <span className="font-semibold text-ink">${Number(placedOrder.grand_total).toFixed(2)}</span>
        </p>
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

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-display font-semibold mb-4">Shipping / Contact Address</h3>
            <textarea
              rows={4}
              required
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder={hasPhysical ? 'Full name, street address, city, region, postal code, country' : 'Your name and contact email (for digital delivery)'}
              className="w-full px-4 py-3 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
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
                  <input
                    type="radio"
                    name="payment_method"
                    value={m}
                    checked={paymentMethod === m}
                    onChange={() => setPaymentMethod(m)}
                  />
                  <span className="text-sm">{METHOD_LABELS[m] || m}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="glass-card p-6 h-fit sticky top-24">
          <h3 className="font-display font-semibold text-lg mb-4">Order Summary</h3>
          <div className="space-y-2 mb-4 max-h-56 overflow-y-auto scrollbar-none">
            {items.map((i) => (
              <div key={i.product_id} className="flex justify-between text-sm text-ink/70">
                <span className="truncate pr-2">{i.name} × {i.quantity}</span>
                <span className="shrink-0">${((i.sale_price !== null && i.sale_price < i.price ? i.sale_price : i.price) * i.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-ink/10 pt-4 flex justify-between font-bold mb-6">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-ink/40 mb-4">Final total (with shipping/discount) is confirmed on the order you receive.</p>
          <button
            disabled={placing}
            className="w-full py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-60"
          >
            {placing ? 'Placing order...' : 'Place Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
