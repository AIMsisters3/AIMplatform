import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import ProductCard from '../Components/ProductCard.jsx';

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/categories', { params: { type: 'product' } }).then((r) => setCategories(r.data.data.items)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/products', { params: { search: search || undefined, category_id: categoryId || undefined, limit: 24 } })
      .then((r) => setProducts(r.data.data.items))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [search, categoryId]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Christian Bookstore</h1>
      <p className="text-ink/60 mb-8">Bibles, books, study guides, music, apparel, and digital downloads.</p>

      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="flex-1 px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-ink/50">No products available yet. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
