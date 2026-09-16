import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../api/axios.js';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

export default function Gallery() {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(r.data?.data?.items || []))
      .catch(() => setCategories([]));
  }, []);

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList(
    '/gallery',
    { category_id: categoryId || undefined },
    40
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Gallery</h1>
      <p className="text-ink/60 mb-8">Moments captured from ministry events, services, and outreach.</p>

      <div className="mb-8">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl2 bg-brand-gradient-soft animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-ink/50">No gallery photos published yet. Check back soon.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveItem(item)}
                className="aspect-square rounded-xl2 overflow-hidden bg-brand-gradient-soft cursor-pointer hover:opacity-90 transition"
              >
                {item.thumbnail && <img src={item.thumbnail} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />}
              </button>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-3 rounded-full glass-card font-semibold text-sm disabled:opacity-60 flex items-center gap-2"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      <ContentViewerModal item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
