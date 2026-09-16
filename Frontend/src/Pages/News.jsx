import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import CardGridSkeleton from '../Components/CardGridSkeleton.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

export default function News() {
  const [categories, setCategories] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('');
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(r.data?.data?.items || []))
      .catch(() => setCategories([]));
    api.get('/languages')
      .then((r) => setLanguageOptions(r.data?.data?.items || []))
      .catch(() => setLanguageOptions([]));
  }, []);

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList(
    '/news',
    { category_id: categoryId || undefined, language: language || undefined }
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Ministry News</h1>
      <p className="text-ink/60 mb-8">Stay up to date with what God is doing across the ministry.</p>

      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <option value="">All Languages</option>
          {languageOptions.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
      </div>

      {loading ? (
        <CardGridSkeleton />
      ) : items.length === 0 ? (
        <p className="text-ink/50">No news published yet. Check back soon.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {items.map((item) => <ContentCard key={item.id} item={item} onClick={() => setActiveItem(item)} />)}
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
