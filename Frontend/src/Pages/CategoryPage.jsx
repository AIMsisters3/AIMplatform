import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Inbox } from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/**
 * A category is shared across every section (Content/media_library,
 * Bible Study, Devotions, News, ...) via the one `categories` table, so
 * "browse this category" has to show all of it together, not just
 * whatever Content.jsx's own media_library-only feed would return.
 * Deliberately a thin, dedicated page rather than retrofitting
 * Content.jsx's section-locked filters/type-chips.
 */
export default function CategoryPage() {
  const { id } = useParams();
  const [category, setCategory] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList('/content', { category_id: id }, 24);

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => {
        const found = (r.data?.data?.items || []).find((c) => String(c.id) === String(id));
        setCategory(found || null);
      })
      .catch(() => setCategory(null));
  }, [id]);

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-[#6B3FE0] to-primary py-14">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp}
            className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-white"
          >
            {category?.name || 'Category'}
          </motion.h1>
          {category?.description && (
            <p className="text-white/70 mt-2 max-w-xl">{category.description}</p>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white/70 shadow-glass animate-pulse h-56" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col items-center text-center py-20">
            <div className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">Nothing here yet</h3>
            <p className="text-ink/50 text-sm max-w-xs">No content has been assigned to this category yet — check back soon.</p>
          </motion.div>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5"
              initial="hidden" animate="visible" variants={staggerContainer}
            >
              {items.map((item) => (
                <motion.div key={item.id} variants={fadeUp}>
                  <ContentCard item={item} onClick={() => setActiveItem(item)} />
                </motion.div>
              ))}
            </motion.div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-full glass-card font-semibold text-sm disabled:opacity-60"
                >
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
