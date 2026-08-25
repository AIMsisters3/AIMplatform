import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

export default function Cart() {
  const { items, setQuantity, removeItem, subtotal, hasPhysical } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <ShoppingBag className="w-14 h-14 mx-auto text-ink/20 mb-4" />
        <h1 className="text-2xl font-display font-bold mb-2">Your cart is empty</h1>
        <p className="text-ink/60 mb-8">Browse the bookstore to find Bibles, study guides, music, and more.</p>
        <Link to="/shop" className="inline-block px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition">
          Go to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const unit = item.sale_price !== null && item.sale_price < item.price ? item.sale_price : item.price;
            return (
              <div key={item.product_id} className="glass-card p-4 flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center overflow-hidden shrink-0">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">📖</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{item.name}</h3>
                  <p className="text-sm text-ink/50 capitalize">{item.product_type}</p>
                  <p className="font-bold text-ink mt-1">${unit.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(item.product_id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full glass-card flex items-center justify-center hover:bg-white"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => setQuantity(item.product_id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full glass-card flex items-center justify-center hover:bg-white"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.product_id)}
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
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-ink/70 mb-4">
            <span>Shipping</span>
            <span>{hasPhysical ? 'Calculated at checkout' : 'Free (digital)'}</span>
          </div>
          <div className="border-t border-ink/10 pt-4 flex justify-between font-bold mb-6">
            <span>Estimated Total</span>
            <span>${subtotal.toFixed(2)}{hasPhysical ? '+' : ''}</span>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="w-full py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
