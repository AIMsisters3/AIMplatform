import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Newspaper } from 'lucide-react';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import CardGridSkeleton from '../Components/CardGridSkeleton.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatRelativeDate } from '../utils/formatters.js';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

// The newest article gets a large masthead-style "lead story" treatment
// instead of sitting in the grid like every other card — a real uploaded
// thumbnail becomes the backdrop when one exists; otherwise a plain
// gradient card (never a fabricated stock photo).
function LeadStory({ item, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="group relative w-full text-left rounded-3xl overflow-hidden shadow-glass min-h-[280px] sm:min-h-[380px] flex items-end"
    >
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-[#1B1839] to-accent" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10" />
      <div className="relative z-10 p-6 sm:p-9 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-white text-[11px] font-bold uppercase tracking-wide mb-3 shadow-glass">
          Latest Story
        </span>
        <h2 className="font-display font-extrabold text-white text-2xl sm:text-3xl md:text-4xl leading-tight mb-2 line-clamp-3">
          {item.title}
        </h2>
        {item.description && (
          <p className="text-white/75 text-sm sm:text-base line-clamp-2 mb-2">{item.description}</p>
        )}
        <p className="text-white/50 text-xs">{formatRelativeDate(item.publish_date || item.created_at)}</p>
      </div>
    </motion.button>
  );
}

export default function News() {
  const { language } = useLanguage();
  const [activeItem, setActiveItem] = useState(null);

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList('/news', { language });
  const [lead, ...rest] = items;

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero — a dark navy/ink masthead with a pink glow, deliberately not
          the purple gradient used on most other section heroes (spec:
          "stop using purple for every hero"; News specifically asked for
          "a varied palette, not just purple"). */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink via-[#1B1839] to-[#3a1030] py-12 sm:py-16">
        <motion.div
          className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-accent/20 blur-3xl pointer-events-none"
          animate={{ y: [0, 20, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-primary/15 blur-3xl pointer-events-none"
          animate={{ y: [0, -16, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-2 mb-3">
            <Newspaper className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-accent tracking-[0.2em] uppercase">AIMsisters Ministry</span>
          </motion.div>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.05 }}
            className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-white leading-none tracking-tight mb-3"
          >
            Ministry News
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.1 }}
            className="font-body text-white/70 text-sm sm:text-base md:text-lg max-w-xl"
          >
            Stay up to date with what God is doing across the ministry — announcements, stories of impact, and updates from the field.
          </motion.p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <CardGridSkeleton />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <div className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center mb-4">
              <Newspaper className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">No news yet</h3>
            <p className="text-ink/50 text-sm max-w-xs">Check back soon for ministry updates.</p>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <LeadStory item={lead} onClick={() => setActiveItem(lead)} />
            </div>

            {rest.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-ink/10" />
                  <h2 className="font-display font-bold text-sm text-ink/50 uppercase tracking-wide">More News</h2>
                  <div className="h-px flex-1 bg-ink/10" />
                </div>
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                >
                  {rest.map((item) => (
                    <motion.div key={item.id} variants={fadeUp}>
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
