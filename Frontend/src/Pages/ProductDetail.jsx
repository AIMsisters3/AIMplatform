import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Heart, Check, Minus, Plus, Truck, MapPin, Package, ShieldCheck,
  ChevronRight, AlertCircle,
} from 'lucide-react';
import api from '../api/axios.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ProductCard from '../Components/ProductCard.jsx';

const ATTRIBUTE_LABELS = {
  size: 'Size', color: 'Color', fit: 'Fit', material: 'Material',
  author: 'Author', isbn: 'ISBN', format: 'Format', pages: 'Pages',
  ingredients: 'Ingredients', allergens: 'Allergens', weight_volume: 'Weight / Volume',
  best_before: 'Best Before', storage_instructions: 'Storage', batch_number: 'Batch Number',
  usage_instructions: 'How to Use', warnings: 'Warnings', expiry_date: 'Expiry Date',
  dimensions: 'Dimensions',
};

const AVAILABILITY_META = {
  in_stock: { label: 'In Stock', className: 'text-emerald-600 bg-emerald-50' },
  on_order: { label: 'Available On Order', className: 'text-sky-600 bg-sky-50' },
  out_of_stock: { label: 'Out of Stock', className: 'text-red-600 bg-red-50' },
};

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [deliveryAreas, setDeliveryAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api.get(`/products/${slug}`)
      .then((r) => {
        const item = r.data?.data?.item;
        if (!item) { setNotFound(true); return; }
        setProduct(item);
        setRelated(r.data?.data?.related || []);
        setWishlisted(!!item.is_wishlisted);
        setActiveImage(0);
        setSelectedAttrs({});
        setQuantity(1);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    api.get('/delivery-areas').then((r) => setDeliveryAreas(r.data?.data?.items || [])).catch(() => setDeliveryAreas([]));
  }, []);

  // Which attribute keys (Size, Color, ...) this product's variants vary
  // by, and the distinct values offered for each — built from whatever
  // the admin actually entered, not a fixed schema.
  const variantAxes = useMemo(() => {
    const variants = product?.variants || [];
    const axes = {};
    for (const v of variants) {
      for (const [key, value] of Object.entries(v.attributes || {})) {
        axes[key] = axes[key] || new Set();
        axes[key].add(value);
      }
    }
    return Object.entries(axes).map(([key, values]) => ({ key, values: Array.from(values) }));
  }, [product]);

  const hasVariants = variantAxes.length > 0;

  const matchedVariant = useMemo(() => {
    if (!hasVariants) return null;
    const variants = product?.variants || [];
    return variants.find((v) =>
      variantAxes.every((axis) => selectedAttrs[axis.key] === v.attributes[axis.key])
    ) || null;
  }, [hasVariants, product, variantAxes, selectedAttrs]);

  const images = product?.images?.length ? product.images : (product?.thumbnail ? [{ url: product.thumbnail, alt_text: product.name }] : []);
  const price = product ? Number(matchedVariant?.price_override ?? product.effective_price ?? product.price) : 0;
  const compareAtPrice = product && !matchedVariant?.price_override && price < Number(product.price) ? Number(product.price) : null;

  const availability = product ? product.availability : 'out_of_stock';
  const availableToOrder = hasVariants
    ? (matchedVariant ? (matchedVariant.stock_quantity - (matchedVariant.reserved_quantity || 0)) > 0 : null)
    : availability !== 'out_of_stock';

  const pickupOnly = deliveryAreas.filter((a) => a.is_pickup);
  const deliveryOnly = deliveryAreas.filter((a) => !a.is_pickup);
  const cheapestDelivery = deliveryOnly.length ? Math.min(...deliveryOnly.map((a) => Number(a.fee))) : null;

  function changeQuantity(delta) {
    setQuantity((q) => Math.max(1, q + delta));
  }

  function handleAddToCart() {
    setAddError('');
    if (hasVariants && !matchedVariant) {
      setAddError(`Please select ${variantAxes.map((a) => ATTRIBUTE_LABELS[a.key] || a.key).join(' and ')}.`);
      return;
    }
    addItem(product, quantity, matchedVariant);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  async function handleWishlist() {
    if (!user) { navigate('/login'); return; }
    setWishlistBusy(true);
    try {
      const { data } = await api.post(`/wishlist/${product.id}`);
      setWishlisted(data.data.wishlisted);
    } catch {
      // best-effort
    } finally {
      setWishlistBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-square rounded-xl3 bg-white/70 shadow-glass animate-pulse" />
        <div className="space-y-4">
          <div className="h-4 w-1/3 bg-ink/10 rounded-full animate-pulse" />
          <div className="h-8 w-2/3 bg-ink/10 rounded-full animate-pulse" />
          <div className="h-24 bg-ink/10 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <Package className="w-10 h-10 mx-auto text-ink/25 mb-4" />
        <h1 className="text-xl font-display font-bold mb-2">Product not found</h1>
        <Link to="/shop" className="text-secondary font-semibold">← Back to Shop</Link>
      </div>
    );
  }

  const availMeta = AVAILABILITY_META[availability] || AVAILABILITY_META.out_of_stock;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center gap-1.5 text-xs text-ink/40 mb-6">
        <Link to="/shop" className="hover:text-secondary">Shop</Link>
        {product.category_name && (
          <>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/shop?category_id=${product.category_id}`} className="hover:text-secondary">{product.category_name}</Link>
          </>
        )}
        <ChevronRight className="w-3 h-3" />
        <span className="text-ink/60 truncate">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <div className="aspect-square rounded-xl3 overflow-hidden bg-brand-gradient-soft flex items-center justify-center mb-3">
            {images[activeImage] ? (
              <img src={images[activeImage].url} alt={images[activeImage].alt_text || product.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="w-16 h-16 text-secondary/40" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {images.map((img, i) => (
                <button
                  key={img.id || i}
                  onClick={() => setActiveImage(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl2 overflow-hidden border-2 transition ${i === activeImage ? 'border-secondary' : 'border-transparent opacity-70'}`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">{product.brand}</p>}
          <h1 className="text-2xl md:text-3xl font-display font-bold text-ink mb-3">{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-ink">N$ {price.toFixed(2)}</span>
            {compareAtPrice && <span className="text-base text-ink/40 line-through">N$ {compareAtPrice.toFixed(2)}</span>}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${availMeta.className}`}>{availMeta.label}</span>
          </div>

          {product.description && <p className="text-ink/70 mb-6 leading-relaxed">{product.description}</p>}

          {variantAxes.map((axis) => (
            <div key={axis.key} className="mb-5">
              <p className="text-xs font-semibold text-ink/50 mb-2">{ATTRIBUTE_LABELS[axis.key] || axis.key}</p>
              <div className="flex flex-wrap gap-2">
                {axis.values.map((value) => {
                  const active = selectedAttrs[axis.key] === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedAttrs((prev) => ({ ...prev, [axis.key]: active ? undefined : value }))}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                        active ? 'bg-brand-gradient text-white border-transparent shadow-glass' : 'border-ink/15 text-ink/70 hover:border-secondary/40'
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center rounded-full border border-ink/10 overflow-hidden">
              <button onClick={() => changeQuantity(-1)} className="w-10 h-10 flex items-center justify-center hover:bg-surface" aria-label="Decrease quantity">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-semibold">{quantity}</span>
              <button onClick={() => changeQuantity(1)} className="w-10 h-10 flex items-center justify-center hover:bg-surface" aria-label="Increase quantity">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={availableToOrder === false}
              className={`flex-1 py-3 rounded-full font-semibold shadow-glass transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                added ? 'bg-emerald-500 text-white' : 'bg-brand-gradient text-white hover:opacity-90'
              }`}
            >
              {added ? <><Check className="w-4 h-4" /> Added to Cart</> : availableToOrder === false ? 'Out of Stock' : 'Add to Cart'}
            </button>

            {user && (
              <button
                onClick={handleWishlist}
                disabled={wishlistBusy}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                className="w-12 h-12 rounded-full glass-card flex items-center justify-center shrink-0 hover:bg-white transition"
              >
                <Heart className={`w-5 h-5 transition-colors ${wishlisted ? 'fill-accent text-accent' : 'text-ink/50'}`} />
              </button>
            )}
          </div>

          {addError && (
            <p className="flex items-center gap-1.5 text-sm text-red-600 mb-5"><AlertCircle className="w-4 h-4 shrink-0" /> {addError}</p>
          )}

          {product.sourcing_type === 'on_order' && (
            <div className="glass-card p-4 mb-5 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <p className="text-sm text-ink/70">
                This item is sourced from our supplier after you order. A deposit secures your order — full details and the deposit amount are shown at checkout.
              </p>
            </div>
          )}

          {(cheapestDelivery !== null || pickupOnly.length > 0) && (
            <div className="glass-card p-4 mb-5 space-y-2">
              {cheapestDelivery !== null && (
                <p className="flex items-center gap-2 text-sm text-ink/70">
                  <Truck className="w-4 h-4 text-secondary shrink-0" /> Delivery from N$ {cheapestDelivery.toFixed(2)} depending on your area — choose yours at checkout.
                </p>
              )}
              {pickupOnly.length > 0 && (
                <p className="flex items-center gap-2 text-sm text-ink/70">
                  <MapPin className="w-4 h-4 text-secondary shrink-0" /> Pickup available at {pickupOnly.length} location{pickupOnly.length > 1 ? 's' : ''}.
                </p>
              )}
            </div>
          )}

          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="glass-card p-5 mb-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Product Details</h3>
              <dl className="space-y-2">
                {Object.entries(product.attributes).map(([key, value]) => value && (
                  <div key={key} className="flex gap-3 text-sm">
                    <dt className="text-ink/45 w-36 shrink-0">{ATTRIBUTE_LABELS[key] || key}</dt>
                    <dd className="text-ink/75">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {(product.sku || product.barcode) && (
            <p className="text-xs text-ink/35">
              {product.sku && <>SKU: {product.sku}</>} {product.sku && product.barcode && ' · '} {product.barcode && <>Barcode/ISBN: {product.barcode}</>}
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-lg font-display font-bold text-ink mb-5">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
