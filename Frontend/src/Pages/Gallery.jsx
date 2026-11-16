import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

// Gallery deliberately has no category filter (spec) and no language
// filter (gallery items always store language: null by design) — a
// simple, uncategorized wall of photos.
export default function Gallery() {
  const [activeItem, setActiveItem] = useState(null);

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList('/gallery', {}, 40);

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Gallery</h1>
      <p className="text-ink/60 mb-8">Moments captured from ministry events, services, and outreach.</p>

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
