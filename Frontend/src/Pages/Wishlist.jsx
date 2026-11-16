import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import api from '../api/axios.js';
import ProductCard from '../Components/ProductCard.jsx';

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get('/wishlist')
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function handleWishlistChange(productId, stillWishlisted) {
    if (!stillWishlisted) setItems((prev) => prev.filter((i) => i.id !== productId));
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-2xl bg-brand-gradient-soft flex items-center justify-center shrink-0">
          <Heart className="w-5 h-5 text-secondary" />
        </span>
        <h1 className="text-3xl font-display font-bold text-ink">My Wishlist</h1>
      </div>
      <p className="text-ink/60 mb-8">Items you've saved for later.</p>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl3 overflow-hidden bg-white/70 shadow-glass animate-pulse">
              <div className="aspect-[4/5] bg-ink/10" />
              <div className="p-4 space-y-2"><div className="h-3 w-2/3 bg-ink/10 rounded-full" /><div className="h-4 w-1/2 bg-ink/10 rounded-full" /></div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center text-center py-20">
          <div className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center mb-4">
            <Heart className="w-7 h-7 text-secondary" />
          </div>
          <h3 className="font-display font-semibold text-lg text-ink mb-1">Your wishlist is empty</h3>
          <p className="text-ink/50 text-sm mb-5 max-w-xs">Tap the heart on any product to save it here.</p>
          <a href="/shop" className="px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass">Browse the Shop</a>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((p) => <ProductCard key={p.id} product={{ ...p, is_wishlisted: true }} onWishlistChange={handleWishlistChange} />)}
        </div>
      )}
    </div>
  );
}
