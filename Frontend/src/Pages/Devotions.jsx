import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, Sunrise, Sparkles, LayoutGrid, Image as ImageIcon, PlayCircle, FileText, Inbox } from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import CardGridSkeleton from '../Components/CardGridSkeleton.jsx';
import ExpandingSearchButton from '../Components/ExpandingSearchButton.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';
import { useLanguage } from '../context/LanguageContext.jsx';

// Poster/Video/Article only (migration 041's sibling backend change) -
// per explicit spec, these are the only three content types this page
// ever shows or lets an admin publish here.
const TYPE_FILTERS = [
  { value: '', label: 'All', icon: LayoutGrid },
  { value: 'devotional', label: 'Article', icon: FileText },
  { value: 'video', label: 'Video', icon: PlayCircle },
  { value: 'image', label: 'Poster', icon: ImageIcon },
];

export default function Devotions() {
  const [activeItem, setActiveItem] = useState(null);
  const [mediaType, setMediaType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const reduceMotion = useReducedMotion();
  const { language } = useLanguage();

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(r.data?.data?.items || r.data?.data || []))
      .catch(() => setCategories([]));
  }, []);

  const isFiltering = Boolean(mediaType || categoryId || search.trim());
  const params = useMemo(
    () => ({ language, media_type: mediaType || undefined, category_id: categoryId || undefined, search: search.trim() || undefined }),
    [language, mediaType, categoryId, search]
  );
  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList('/devotions', params);
  const [today, ...rest] = isFiltering ? [null, ...items] : items;

  const fadeUp = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } };
  const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } } };

  // Only categories a devotion has actually been tagged with (spec:
  // "avoid displaying empty sections") - a flat Reforms-style chip row
  // with no devotion behind most of it would be exactly that.
  const usedCategoryIds = useMemo(() => new Set(items.map((i) => i.category_id).filter(Boolean)), [items]);
  const relevantCategories = categories.filter((c) => usedCategoryIds.has(c.id) || String(c.id) === categoryId);

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden bg-gradient-to-br from-accent via-[#9B5FBF] to-primary py-12 sm:py-16">
        {!reduceMotion && (
          <motion.div
            className="absolute -top-16 -right-10 w-72 h-72 rounded-full bg-accent/20 blur-3xl pointer-events-none"
            animate={{ y: [0, 20, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-3 mb-3">
            <span className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 shadow-glass">
              <Sunrise className="w-6 h-6 text-white" />
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white leading-none tracking-tight break-words">
              Devotions
            </h1>
          </motion.div>
          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.08 }}
            className="font-body text-white/75 text-sm sm:text-base max-w-lg"
          >
            Posters, videos, and short readings to nourish your walk with God - a quiet moment, wherever you are today.
          </motion.p>
        </div>

        <div className="absolute z-20 bottom-5 right-5 sm:bottom-6 sm:right-8">
          <ExpandingSearchButton value={search} onChange={setSearch} placeholder="Search devotions..." />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.value}
              onClick={() => setMediaType(t.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                mediaType === t.value ? 'bg-brand-gradient text-white shadow-glass' : 'bg-white text-ink/60 border border-ink/10 hover:border-secondary/40'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
          {relevantCategories.length > 0 && <span className="w-px h-6 bg-ink/10 mx-1" />}
          {relevantCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(categoryId === String(c.id) ? '' : String(c.id))}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                categoryId === String(c.id) ? 'bg-ink text-white shadow-glass' : 'bg-white text-ink/60 border border-ink/10 hover:border-secondary/40'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <CardGridSkeleton />
        ) : items.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col items-center text-center py-20">
            <div className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center mb-4">
              {isFiltering ? <Inbox className="w-7 h-7 text-secondary" /> : <Sunrise className="w-7 h-7 text-secondary" />}
            </div>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">{isFiltering ? 'No devotions match your filters' : 'No devotions yet'}</h3>
            <p className="text-ink/50 text-sm max-w-xs">{isFiltering ? 'Try a different type, category, or search.' : "Check back soon for today's reflection."}</p>
          </motion.div>
        ) : (
          <>
            {!isFiltering && (
              <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <h2 className="font-display font-bold text-lg text-ink">Today's Devotion</h2>
                </div>
                <motion.div whileHover={reduceMotion ? undefined : { y: -4 }} className="max-w-2xl">
                  <ContentCard item={today} onClick={() => setActiveItem(today)} />
                </motion.div>
              </motion.div>
            )}

            {rest.length > 0 && (
              <>
                {!isFiltering && <h2 className="font-display font-bold text-lg text-ink mb-4">More Devotions</h2>}
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                  initial="hidden" animate="visible" variants={staggerContainer}
                >
                  {rest.map((item) => (
                    <motion.div key={item.id} variants={fadeUp} whileHover={reduceMotion ? undefined : { y: -6 }}>
                      <ContentCard item={item} onClick={() => setActiveItem(item)} />
                    </motion.div>
                  ))}
                </motion.div>
              </>
            )}

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
