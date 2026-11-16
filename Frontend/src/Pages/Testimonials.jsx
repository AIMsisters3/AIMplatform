import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Quote, Loader2 } from 'lucide-react';
import TestimonialCard from '../Components/TestimonialCard.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/**
 * The full testimonies listing - every approved testimony, not just
 * Home.jsx's 3-card teaser. Deliberately not linked from the navbar
 * (spec) - reached via the "View all testimonies" link at the bottom of
 * Home's own Testimonies section.
 */
export default function Testimonials() {
  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList('/testimonials', {}, 12);

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-[#6B3FE0] to-primary py-16 sm:py-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <span className="inline-flex w-14 h-14 rounded-2xl bg-white/15 items-center justify-center mb-5">
              <Quote className="w-6 h-6 text-white" />
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight mb-3">
              Testimonies
            </h1>
            <p className="text-white/80 text-sm sm:text-base">
              Real stories from our community of how God has worked in their lives.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-14">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-secondary animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Quote className="w-10 h-10 text-ink/20 mx-auto mb-3" />
            <p className="text-ink/50">No testimonies have been shared yet.</p>
            <Link to="/" className="inline-block mt-4 text-sm font-semibold text-secondary hover:text-ink transition">
              ← Back to Home
            </Link>
          </div>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden" animate="visible" variants={staggerContainer}
            >
              {items.map((t) => (
                <TestimonialCard key={t.id} testimonial={t} />
              ))}
            </motion.div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-7 py-3 rounded-full bg-white text-secondary font-semibold shadow-glass border border-secondary/15 hover:bg-secondary/5 transition disabled:opacity-60"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
