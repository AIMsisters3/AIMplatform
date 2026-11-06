import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Heart, Package } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';

const AVAILABILITY_LABEL = {
  in_stock: null, // the common case — no badge needed, keeps the grid calm
  on_order: 'On Order',
  out_of_stock: 'Out of Stock',
};

export default function ProductCard({ product, onWishlistChange }) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(!!product.is_wishlisted);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const price = product.effective_price ?? (product.sale_price ?? product.price);
  const onSale = Number(price) < Number(product.price);
  const availability = product.availability || 'in_stock';
  const canQuickAdd = availability !== 'out_of_stock' && (product.variant_count || 0) === 0;

  function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  async function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || wishlistBusy) return;
    setWishlistBusy(true);
    try {
      const { data } = await api.post(`/wishlist/${product.id}`);
      setWishlisted(data.data.wishlisted);
      onWishlistChange?.(product.id, data.data.wishlisted);
    } catch {
      // best-effort — leave the heart in its previous state
    } finally {
      setWishlistBusy(false);
    }
  }

  return (
    <Link
      to={`/shop/${product.slug}`}
      className="glass-card overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform block"
    >
      <div className="relative aspect-[4/5] bg-brand-gradient-soft overflow-hidden">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-secondary/50" />
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
          {onSale && <span className="px-2.5 py-1 rounded-full bg-accent text-white text-[10px] font-bold">SALE</span>}
          {!!product.is_new && <span className="px-2.5 py-1 rounded-full bg-secondary text-white text-[10px] font-bold">NEW</span>}
          {AVAILABILITY_LABEL[availability] && (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${availability === 'on_order' ? 'bg-sky-500 text-white' : 'bg-ink/70 text-white'}`}>
              {AVAILABILITY_LABEL[availability]}
            </span>
          )}
        </div>

        {user && (
          <button
            onClick={handleWishlist}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow-glass flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Heart className={`w-4 h-4 transition-colors ${wishlisted ? 'fill-accent text-accent' : 'text-ink/50'}`} />
          </button>
        )}
      </div>
      <div className="p-4">
        {product.brand && <p className="text-[11px] font-semibold text-ink/40 uppercase tracking-wide mb-0.5">{product.brand}</p>}
        <h3 className="font-display font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-secondary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-bold text-ink">N$ {Number(price).toFixed(2)}</span>
          {onSale && (
            <span className="text-xs text-ink/40 line-through">N$ {Number(product.price).toFixed(2)}</span>
          )}
        </div>
        {canQuickAdd ? (
          <button
            onClick={handleAddToCart}
            className={`w-full py-2 rounded-full text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
              added ? 'bg-emerald-500 text-white' : 'bg-brand-gradient text-white hover:opacity-90'
            }`}
          >
            {added ? (<><Check className="w-4 h-4" /> Added</>) : 'Add to Cart'}
          </button>
        ) : (
          <span className="block w-full py-2 rounded-full text-sm font-semibold text-center bg-surface text-ink/50">
            {(product.variant_count || 0) > 0 ? 'Select Options' : 'View Details'}
          </span>
        )}
      </div>
    </Link>
  );
}
