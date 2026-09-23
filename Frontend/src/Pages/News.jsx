import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import CardGridSkeleton from '../Components/CardGridSkeleton.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function News() {
  const { language } = useLanguage();
  const [activeItem, setActiveItem] = useState(null);

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList(
    '/news',
    { language }
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Ministry News</h1>
      <p className="text-ink/60 mb-8">Stay up to date with what God is doing across the ministry.</p>

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
