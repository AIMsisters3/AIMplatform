import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, ScrollText, Layers, Loader2, Inbox, Quote, Users, Sparkles,
} from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import LiveNowStrip from '../Components/LiveNowStrip.jsx';
import ScrollHintRow from '../Components/ScrollHintRow.jsx';
import ExpandingSearchButton from '../Components/ExpandingSearchButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';
import { getVerseOfDay } from '../utils/verseOfDay.js';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// Daniel/Revelation/Matthew 24 (migration 039) - the one place their
// display order is pinned, since the three are seeded together and
// nothing guarantees the backend returns them in reading order.
const PROPHECY_ORDER = ['Daniel', 'Revelation', 'Matthew 24'];

/**
 * The Prophecy row's three permanent books - deliberately a richer,
 * more editorial treatment than a plain SeriesCard (full-bleed cover art,
 * gradient scrim, bigger type) since these never change and are meant to
 * anchor the page, not blend into an admin-growable list.
 */
function ProphecyCard({ s }) {
  return (
    <Link
      to={`/series/${s.slug}`}
      className="group relative block rounded-3xl overflow-hidden shadow-glass h-64 sm:h-72"
    >
      {s.cover_image ? (
        <img
          src={s.cover_image}
          alt={s.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-[#3D2E6B] to-primary">
          <ScrollText className="absolute -bottom-6 -right-6 w-40 h-40 text-white/5" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <span className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-wide mb-3 shadow-glass">
          <ScrollText className="w-3 h-3" /> Prophecy
        </span>
        <h3 className="text-2xl font-display font-extrabold text-white leading-tight mb-1">{s.title}</h3>
        <p className="text-white/70 text-sm">
          {s.episode_count} {Number(s.episode_count) === 1 ? 'study' : 'studies'}
        </p>
      </div>
    </Link>
  );
}

/** A lighter card for the general (admin-created, non-Prophecy) series row. */
function SeriesCard({ s }) {
  return (
    <Link to={`/series/${s.slug}`} className="group glass-card overflow-hidden hover:-translate-y-1 transition-transform block">
      <div className="h-36 bg-brand-gradient-soft overflow-hidden relative">
        {s.cover_image ? (
          <img
            src={s.cover_image}
            alt={s.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="w-8 h-8 text-secondary" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-sm leading-snug line-clamp-1 mb-1">{s.title}</h3>
        <p className="text-xs text-ink/50">{s.episode_count} {Number(s.episode_count) === 1 ? 'study' : 'studies'}</p>
      </div>
    </Link>
  );
}

export default function BibleStudies() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [continuing, setContinuing] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [allSeries, setAllSeries] = useState([]);
  const [search, setSearch] = useState('');
  const verse = useMemo(() => getVerseOfDay(), []);

  const searchParams = useMemo(() => ({
    language,
    search: search || undefined,
  }), [language, search]);
  // Only actually fetched/shown while a search is active - the default
  // view is the curated Featured/Prophecy/Explore rows below, not a flat
  // "every Bible study" list.
  const { items: searchResults, loading: searchLoading, loadingMore, hasMore, loadMore } = usePaginatedList('/bible-studies', searchParams, 24);

  useEffect(() => {
    api.get('/bible-studies/featured', { params: { limit: 8 } })
      .then((r) => setFeatured(r.data?.data?.items || []))
      .catch(() => setFeatured([]))
      .finally(() => setFeaturedLoading(false));
    // Fetched once, split client-side into Prophecy vs everything else -
    // there are only ever 3 Prophecy series (migration 039 seeds them,
    // nothing in the admin can add a 4th), so a single reasonably-sized
    // fetch covers every series this page needs without a dedicated
    // is_prophecy filter on the backend.
    api.get('/series', { params: { section: 'bible_study', limit: 50 } })
      .then((r) => setAllSeries(r.data?.data?.items || []))
      .catch(() => setAllSeries([]));
  }, []);

  useEffect(() => {
    if (!user) { setContinuing([]); return; }
    api.get('/bible-studies/continue').then((r) => setContinuing(r.data.data.items)).catch(() => setContinuing([]));
  }, [user]);

  const prophecySeries = useMemo(
    () => [...allSeries]
      .filter((s) => s.is_prophecy)
      .sort((a, b) => PROPHECY_ORDER.indexOf(a.title) - PROPHECY_ORDER.indexOf(b.title)),
    [allSeries]
  );
  const otherSeries = useMemo(() => allSeries.filter((s) => !s.is_prophecy), [allSeries]);
  const isSearching = search.trim().length > 0;

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero — a deeper, contemplative indigo rather than the site's
          default purple-led hero (fitting a study/reflection page), with
          a large faint open-book watermark, soft drifting glows, the
          Verse of the Day folded directly in as its own glass panel, and
          the corner expand-search (spec: icon only, expands on click). */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink via-[#2B2056] to-[#3D2E6B] py-14 sm:py-20">
        <BookOpen className="absolute -right-10 -bottom-16 w-72 h-72 text-white/[0.04] pointer-events-none rotate-[-8deg]" />
        <motion.div
          className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-secondary/20 blur-3xl pointer-events-none"
          animate={{ y: [0, 20, 0], x: [0, 15, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none"
          animate={{ y: [0, -15, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-2 mb-4">
            <span className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-4.5 h-4.5 text-accent" />
            </span>
            <span className="text-sm font-semibold text-accent tracking-wide uppercase">Bible Study</span>
          </motion.div>
          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.05 }}
            className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-white leading-tight mb-3 max-w-2xl break-words"
          >
            Dig deeper in God's Word
          </motion.h1>
          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.1 }}
            className="font-body text-white/75 text-base sm:text-lg mb-8 max-w-xl"
          >
            Discover Truth. Grow in Faith. Be transformed.
          </motion.p>

          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.15 }}
            className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 px-6 py-5 max-w-xl"
          >
            <div className="flex items-start gap-3">
              <Quote className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="italic text-white/90 text-sm sm:text-base leading-relaxed">"{verse.text}"</p>
                <p className="text-accent font-semibold text-xs tracking-wide uppercase mt-2">{verse.reference}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="absolute z-20 bottom-5 right-5 sm:bottom-8 sm:right-8">
          <ExpandingSearchButton value={search} onChange={setSearch} placeholder="Search Bible studies..." />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <LiveNowStrip endpoint="/bible-studies" itemHref={(item) => `/bible-studies/${item.slug}`} />

        {continuing.length > 0 && !isSearching && (
          <div className="mb-12">
            <h2 className="font-display font-semibold text-lg mb-4">Continue Studying</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {continuing.map((item) => (
                <Link key={item.id} to={`/bible-studies/${item.slug}`} className="glass-card p-5 hover:-translate-y-1 transition-transform">
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden mb-1">
                    <div className="h-full bg-brand-gradient rounded-full" style={{ width: `${item.progress_percent}%` }} />
                  </div>
                  <p className="text-xs text-ink/40">{item.progress_percent}% complete</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {isSearching ? (
          /* Search mode - a flat filtered grid, same ContentCard the
             curated rows below use, replacing them while a search is
             active rather than sitting alongside them. */
          searchLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 rounded-2xl bg-white/70 shadow-glass animate-pulse" />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="glass-card p-10 text-center mb-12">
              <Inbox className="w-8 h-8 text-ink/25 mx-auto mb-3" />
              <p className="text-ink/50">No Bible studies match "{search}".</p>
            </div>
          ) : (
            <div className="mb-12">
              <h2 className="font-display font-bold text-xl mb-4">Search Results</h2>
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                initial="hidden" animate="visible" variants={staggerContainer}
              >
                {searchResults.map((item) => (
                  <motion.div key={item.id} variants={fadeUp}>
                    <Link to={`/bible-studies/${item.slug}`}><ContentCard item={item} /></Link>
                  </motion.div>
                ))}
              </motion.div>
              {hasMore && (
                <div className="flex justify-center mt-8">
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
            </div>
          )
        ) : (
          <>
            {/* Featured Studies - purely the most liked/viewed (see
                BibleStudy::featuredRanked()), deliberately not the same
                ranking the Home page's own Featured section shows. */}
            {(featuredLoading || featured.length > 0) && (
              <div className="mb-14">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <h2 className="font-display font-bold text-xl">Featured Studies</h2>
                </div>
                {featuredLoading ? (
                  <div className="flex gap-5 overflow-hidden">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="shrink-0 w-64 h-56 rounded-2xl bg-white/70 shadow-glass animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <ScrollHintRow className="gap-5 pb-2">
                    {featured.map((item) => (
                      <Link key={item.id} to={`/bible-studies/${item.slug}`} className="shrink-0 w-64 sm:w-72">
                        <ContentCard item={item} />
                      </Link>
                    ))}
                  </ScrollHintRow>
                )}
              </div>
            )}

            {/* Prophecy - exactly Daniel/Revelation/Matthew 24, permanent. */}
            {prophecySeries.length > 0 && (
              <div className="mb-14">
                <div className="flex items-center gap-2 mb-4">
                  <ScrollText className="w-4 h-4 text-secondary" />
                  <h2 className="font-display font-bold text-xl">Prophecy</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {prophecySeries.map((s) => <ProphecyCard key={s.id} s={s} />)}
                </div>
              </div>
            )}

            {/* Everything else - every other admin-created study series
                (e.g. "The Great Controversy", "Steps to Christ"). */}
            {otherSeries.length > 0 && (
              <div className="mb-14">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-secondary" />
                    <h2 className="font-display font-bold text-xl">Explore More Studies</h2>
                  </div>
                  <Link to="/series?section=bible_study" className="flex items-center gap-1 text-xs font-semibold text-secondary shrink-0">
                    View All <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
                  initial="hidden" animate="visible" variants={staggerContainer}
                >
                  {otherSeries.map((s) => (
                    <motion.div key={s.id} variants={fadeUp}>
                      <SeriesCard s={s} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}

            {!featuredLoading && featured.length === 0 && prophecySeries.length === 0 && otherSeries.length === 0 && (
              <div className="glass-card p-10 text-center mb-12">
                <Inbox className="w-8 h-8 text-ink/25 mx-auto mb-3" />
                <p className="text-ink/50">No Bible studies published yet.</p>
              </div>
            )}
          </>
        )}

        {/* Join AIMsisters Community — only for visitors who aren't
            already part of it; no dedicated community page exists yet,
            so this leads to registration/login, the real destination
            for "joining" today (comments, testimonies, notes, bookmarks
            all require an account). */}
        {!user && (
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#3a2a6e] to-secondary p-8 sm:p-10 text-center"
          >
            <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <Users className="relative z-10 w-8 h-8 text-accent mx-auto mb-4" />
            <h2 className="relative z-10 text-2xl sm:text-3xl font-display font-bold text-white mb-2">
              Join AIMsisters Community
            </h2>
            <p className="relative z-10 text-white/70 max-w-md mx-auto mb-6">
              Track your study progress, save notes, leave comments, and grow alongside believers around the world.
            </p>
            <Link
              to="/login"
              className="relative z-10 inline-block px-8 py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition"
            >
              Join Now
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
