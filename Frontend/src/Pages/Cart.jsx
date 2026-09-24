import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, Package, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import api from '../api/axios.js';

function unitPriceFor(item) {
  if (item.variant_price_override != null) return item.variant_price_override;
  return item.sale_price !== null && item.sale_price < item.price ? item.sale_price : item.price;
}

function lineKey(productId, variantId) {
  return `${productId}::${variantId || 'base'}`;
}

export default function Cart() {
  const { items, setQuantity, removeItem, subtotal, hasPhysical, hasInStock, hasOnOrder } = useCart();
  const navigate = useNavigate();

  // Cart-time stock check — spec: "validate stock while items are still in
  // the cart, do NOT wait until checkout." This re-checks real, current
  // database availability every time the cart's contents change (not just
  // once on page load), so a shopper sees a problem (someone else bought
  // the last one, an admin adjusted stock, etc.) before they ever reach
  // checkout — checkout itself still does the authoritative, row-locked
  // check again; this is purely early, honest feedback.
  const [availability, setAvailability] = useState({});
  const [checkingStock, setCheckingStock] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setAvailability({});
      return;
    }
    let cancelled = false;
    setCheckingStock(true);
    api.post('/orders/check-availability', {
      items: items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity })),
    })
      .then((r) => {
        if (cancelled) return;
        const map = {};
        for (const result of r.data?.data?.items || []) {
          map[lineKey(result.product_id, result.variant_id)] = result;
        }
        setAvailability(map);
      })
      .catch(() => { /* best-effort — checkout's own real check is still authoritative */ })
      .finally(() => { if (!cancelled) setCheckingStock(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => `${i.product_id}:${i.variant_id}:${i.quantity}`).join(',')]);

  const stockIssues = useMemo(
    () => Object.values(availability).filter((r) => !r.ok),
    [availability]
  );

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <ShoppingBag className="w-14 h-14 mx-auto text-ink/20 mb-4" />
        <h1 className="text-2xl font-display font-bold mb-2">Your cart is empty</h1>
        <p className="text-ink/60 mb-8">Browse the shop to find clothing, accessories, food, wellness products, and more.</p>
        <Link to="/shop" className="inline-block px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition">
          Go to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Your Cart</h1>
      {hasInStock && hasOnOrder && (
        <p className="flex items-start gap-2 text-sm text-ink/60 mb-6 bg-brand-gradient-soft rounded-2xl px-4 py-3">
          <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          Your cart has both in-stock and on-order items — these will be placed as two separate orders (each with its own tracking and payment) so your in-stock items aren't held up waiting on a supplier order. You'll see both, clearly, before you confirm at checkout.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const unit = unitPriceFor(item);
            const key = lineKey(item.product_id, item.variant_id);
            const stock = availability[key];
            const isShort = stock && !stock.ok;
            return (
              <div key={key} className={`glass-card p-4 flex items-center gap-4 ${isShort ? 'ring-2 ring-red-300' : ''}`}>
                <div className="w-20 h-20 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center overflow-hidden shrink-0">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-secondary/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{item.name}</h3>
                  {item.variant_attributes && (
                    <p className="text-xs text-ink/50">
                      {Object.entries(item.variant_attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </p>
                  )}
                  {item.sourcing_type === 'on_order' && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold">ON ORDER</span>
                  )}
                  <p className="font-bold text-ink mt-1">N$ {unit.toFixed(2)}</p>
                  {isShort && (
                    <p className="flex items-center gap-1 text-xs font-semibold text-red-600 mt-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {stock.reason}
                      {stock.available_quantity > 0 && (
                        <button
                          type="button"
                          onClick={() => setQuantity(item.product_id, stock.available_quantity, item.variant_id)}
                          className="underline hover:no-underline"
                        >
                          Reduce to {stock.available_quantity}
                        </button>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(item.product_id, item.quantity - 1, item.variant_id)}
                    className="w-8 h-8 rounded-full glass-card flex items-center justify-center hover:bg-white"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => setQuantity(item.product_id, item.quantity + 1, item.variant_id)}
                    className="w-8 h-8 rounded-full glass-card flex items-center justify-center hover:bg-white"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.product_id, item.variant_id)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="glass-card p-6 h-fit sticky top-24">
          <h3 className="font-display font-semibold text-lg mb-4">Order Summary</h3>
          <div className="flex justify-between text-sm text-ink/70 mb-2">
            <span>Subtotal</span>
            <span>N$ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-ink/70 mb-4">
            <span>Delivery</span>
            <span>{hasPhysical ? 'Calculated at checkout' : 'N/A'}</span>
          </div>
          <div className="border-t border-ink/10 pt-4 flex justify-between font-bold mb-6">
            <span>Estimated Total</span>
            <span>N$ {subtotal.toFixed(2)}{hasPhysical ? '+' : ''}</span>
          </div>
          {stockIssues.length > 0 && (
            <p className="flex items-start gap-2 text-xs font-semibold text-red-600 mb-4 bg-red-50 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {stockIssues.length === 1 ? 'One item in your cart' : `${stockIssues.length} items in your cart`} won't fit as-is — fix the quantities highlighted above before checking out.
            </p>
          )}
          <button
            onClick={() => navigate('/checkout')}
            disabled={stockIssues.length > 0 || checkingStock}
            className="w-full py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {checkingStock && <Loader2 className="w-4 h-4 animate-spin" />}
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
