import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music2, Search, Loader2 } from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import CardGridSkeleton from '../Components/CardGridSkeleton.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

export default function Songs() {
  const [searchParams] = useSearchParams();

  const [languageOptions, setLanguageOptions] = useState([]);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    api.get('/languages')
      .then((r) => setLanguageOptions(r.data?.data?.items || []))
      .catch(() => setLanguageOptions([]));
  }, []);

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList(
    '/songs',
    { search: search || undefined, language: language || undefined }
  );

  useEffect(() => {
    const slug = searchParams.get('item');
    if (!slug) return;
    api.get(`/content/${slug}`)
      .then((r) => { if (r.data?.data?.item) setActiveItem(r.data.data.item); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-[#6B3FE0] to-primary py-12 sm:py-16">
        <motion.div
          className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-accent/20 blur-3xl pointer-events-none"
          animate={{ y: [0, 20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            <span className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 shadow-glass">
              <Music2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-white leading-none tracking-tight">
              Songs
            </h1>
          </div>
          <p className="font-body text-white/70 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl mb-6">
            Uplifting gospel music and worship songs to encourage your walk with God.
          </p>

          <form onSubmit={(e) => e.preventDefault()} className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search songs by title..."
              className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-full border-0 bg-white shadow-glass focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
            />
          </form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
          >
            <option value="">All Languages</option>
            {languageOptions.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>

        {loading ? (
          <CardGridSkeleton />
        ) : items.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Music2 className="w-8 h-8 text-ink/25 mx-auto mb-3" />
            <p className="text-ink/50">No songs published yet. Check back soon.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {items.map((item) => (
                <ContentCard key={item.id} item={item} onClick={() => setActiveItem(item)} />
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
      </div>

      <ContentViewerModal item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
