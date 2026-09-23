import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, Sunrise, Sparkles } from 'lucide-react';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import CardGridSkeleton from '../Components/CardGridSkeleton.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';
import { useLanguage } from '../context/LanguageContext.jsx';

// Category and content-type are still set by the admin when publishing
// (UploadContent.jsx) - this public page just no longer shows them as
// labels/filters, per spec: devotions are meant to be browsed simply,
// without that extra classification surfaced to visitors. The language
// filter is the one exception - it comes from the navbar globally, not
// a page-level control.
export default function Devotions() {
  const [activeItem, setActiveItem] = useState(null);
  const reduceMotion = useReducedMotion();
  const { language } = useLanguage();

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList('/devotions', { language });
  const [today, ...rest] = items;

  // Respects prefers-reduced-motion: entrance transitions collapse to an
  // instant appearance instead of being disabled awkwardly mid-scroll.
  const fadeUp = reduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } };
  const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } } };

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-[#6B3FE0] to-primary py-12 sm:py-14">
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
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white leading-none tracking-tight">
              Devotions
            </h1>
          </motion.div>
          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.08 }}
            className="font-body text-white/75 text-sm sm:text-base max-w-lg"
          >
            Daily moments of reflection to nourish your walk with God.
          </motion.p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <CardGridSkeleton />
        ) : items.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col items-center text-center py-20">
            <div className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center mb-4">
              <Sunrise className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">No devotions yet</h3>
            <p className="text-ink/50 text-sm max-w-xs">Check back soon for today's reflection.</p>
          </motion.div>
        ) : (
          <>
            {/* Today's Devotion — spotlight for the single latest item;
                only ever real, already-published content. */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-secondary" />
                <h2 className="font-display font-bold text-lg text-ink">Today's Devotion</h2>
              </div>
              <motion.div whileHover={reduceMotion ? undefined : { y: -4 }} className="max-w-2xl">
                <ContentCard item={today} onClick={() => setActiveItem(today)} />
              </motion.div>
            </motion.div>

            {rest.length > 0 && (
              <>
                <h2 className="font-display font-bold text-lg text-ink mb-4">More Devotions</h2>
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
