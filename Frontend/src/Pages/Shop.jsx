import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, Inbox, Sparkles, Tag, ArrowRight } from 'lucide-react';
import api from '../api/axios.js';
import ProductCard from '../Components/ProductCard.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

const SORT_OPTIONS = [
  { value: '', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name A–Z' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function ProductRow({ title, icon: Icon, products }) {
  if (products.length === 0) return null;
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-secondary" />
        <h2 className="text-lg font-display font-bold text-ink">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
        {products.map((p) => (
          <div key={p.id} className="shrink-0 w-44 sm:w-52">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Shop() {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [onSale, setOnSale] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [newArrivals, setNewArrivals] = useState([]);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get('/categories', { params: { type: 'product' } }).then((r) => setCategories(r.data?.data?.items || [])).catch(() => {});
    api.get('/products', { params: { is_new: 1, limit: 10 } }).then((r) => setNewArrivals(r.data?.data?.items || [])).catch(() => {});
    api.get('/products', { params: { is_featured: 1, limit: 10 } }).then((r) => setFeatured(r.data?.data?.items || [])).catch(() => {});
  }, []);

  const topCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const subCategories = useMemo(() => categories.filter((c) => String(c.parent_id) === String(categoryId)), [categories, categoryId]);

  const params = useMemo(() => ({
    search: search || undefined,
    category_id: categoryId || undefined,
    sort: sort || undefined,
    on_sale: onSale ? 1 : undefined,
    min_price: minPrice || undefined,
    max_price: maxPrice || undefined,
  }), [search, categoryId, sort, onSale, minPrice, maxPrice]);

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList('/products', params, 16);

  const isFiltering = Boolean(search || categoryId || sort || onSale || minPrice || maxPrice);

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      {/* Dark-to-blue-to-pink - a more distinctive, premium-feeling
          gradient than the site's default purple-led hero (spec: "stop
          using purple for every hero"). */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink via-primary to-accent py-14">
        <motion.div
          className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-accent/20 blur-3xl pointer-events-none"
          animate={{ y: [0, 20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="max-w-xl">
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white mb-3">
              AIMsisters <span className="bg-gradient-to-r from-accent via-pink-300 to-white bg-clip-text text-transparent">Shop</span>
            </h1>
            <p className="text-white/85 text-base sm:text-lg">
              Modest clothing, accessories, home & lifestyle, food, natural wellness products, and books — proudly Namibian.
            </p>
          </motion.div>
          <motion.form
            initial="hidden" animate="visible" variants={fadeUp}
            onSubmit={(e) => e.preventDefault()}
            className="relative max-w-lg mt-8"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-11 pr-4 py-3.5 rounded-full border-0 shadow-glass focus:outline-none focus:ring-2 focus:ring-white text-sm"
            />
          </motion.form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {!isFiltering && (
          <>
            <ProductRow title="New Arrivals" icon={Sparkles} products={newArrivals} />
            <ProductRow title="Featured" icon={Tag} products={featured} />
          </>
        )}

        {/* Category pills */}
        <div className="mb-4">
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setCategoryId('')}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${!categoryId ? 'bg-ink text-white shadow-glass' : 'bg-white text-ink/70 border border-ink/10'}`}
            >
              All Products
            </button>
            {topCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(String(c.id) === String(categoryId) ? '' : String(c.id))}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${
                  String(categoryId) === String(c.id) ? 'bg-brand-gradient text-white shadow-glass' : 'bg-white text-ink/70 border border-ink/10 hover:border-secondary/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {subCategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-none">
              {subCategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setCategoryId(String(sub.id))}
                  className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-surface text-ink/60 border border-ink/10 hover:border-secondary/40"
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-4 py-2 rounded-full border border-ink/10 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-secondary">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min N$" className="w-24 px-3 py-2 rounded-full border border-ink/10 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <input
            type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max N$" className="w-24 px-3 py-2 rounded-full border border-ink/10 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <button
            onClick={() => setOnSale((v) => !v)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition ${onSale ? 'bg-accent text-white shadow-glass' : 'bg-white text-ink/70 border border-ink/10'}`}
          >
            On Sale
          </button>
          {isFiltering && (
            <button
              onClick={() => { setSearch(''); setCategoryId(''); setSort(''); setOnSale(false); setMinPrice(''); setMaxPrice(''); }}
              className="text-xs font-semibold text-secondary"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl3 overflow-hidden bg-white/70 shadow-glass animate-pulse">
                <div className="aspect-[4/5] bg-ink/10" />
                <div className="p-4 space-y-2"><div className="h-3 w-2/3 bg-ink/10 rounded-full" /><div className="h-4 w-1/2 bg-ink/10 rounded-full" /></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <div className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">No products found</h3>
            <p className="text-ink/50 text-sm">Try a different search, category, or price range.</p>
          </div>
        ) : (
          <>
            <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {items.map((p) => (
                <motion.div key={p.id} variants={fadeUp}><ProductCard product={p} /></motion.div>
              ))}
            </motion.div>
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-full glass-card font-semibold text-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? 'Loading...' : 'Load More'}
                  {!loadingMore && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
