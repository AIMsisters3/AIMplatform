import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, ScrollText, Layers, Loader2, Inbox, Quote, Users, Sparkles,
  Headphones, FileText, Clock,
} from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import LiveNowStrip from '../Components/LiveNowStrip.jsx';
import ExpandingSearchButton from '../Components/ExpandingSearchButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';
import { getVerseOfDay } from '../utils/verseOfDay.js';
import { getItemKind } from '../utils/mediaKind.js';

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

/**
 * Full-width colored band wrapping one curated row (Featured / Prophecy /
 * Explore More / Latest) - the look the user's reference screenshot asked
 * for: an icon + title + one-line subtitle, then a grid of cards, each
 * section its own band rather than sitting on one flat background.
 */
function SectionBand({ icon: Icon, title, subtitle, tint = 'bg-white', action, children }) {
  return (
    <section className={`${tint} py-12 sm:py-14`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shrink-0 shadow-glass">
              <Icon className="w-5 h-5 text-white" />
            </span>
            <div>
              <h2 className="font-display font-extrabold text-xl text-ink tracking-tight">{title}</h2>
              {subtitle && <p className="text-sm text-ink/50 mt-0.5 max-w-lg">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

// Compact icon + title + one tag-line card - the reference screenshot's
// tile shape, used for every row except Prophecy (which keeps its richer
// full-bleed photo treatment, since admin-added cover art is meaningful
// there - see ProphecyCard above).
function StudyTile({ to, icon: Icon, title, meta }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 bg-white rounded-2xl border border-ink/5 px-4 py-3.5 hover:border-secondary/30 hover:shadow-glass hover:-translate-y-0.5 transition-all"
    >
      <span className="w-10 h-10 rounded-xl bg-brand-gradient-soft flex items-center justify-center shrink-0 group-hover:bg-brand-gradient transition-colors">
        <Icon className="w-4.5 h-4.5 text-secondary group-hover:text-white transition-colors" />
      </span>
      <div className="min-w-0">
        <h3 className="font-display font-semibold text-sm text-ink leading-snug line-clamp-1">{title}</h3>
        {meta && <p className="text-[11px] font-bold text-secondary/70 uppercase tracking-wide truncate mt-0.5">{meta}</p>}
      </div>
    </Link>
  );
}

const FORMAT_TILE = {
  audio: { icon: Headphones, label: 'Audio' },
  pdf: { icon: FileText, label: 'PDF' },
};

export default function BibleStudies() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [continuing, setContinuing] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [latest, setLatest] = useState([]);
  const [latestLoading, setLatestLoading] = useState(true);
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
      .then((r) => r.data?.data?.items || [])
      .catch(() => [])
      .then((items) => {
        setFeatured(items);
        setFeaturedLoading(false);
        // Latest Studies exists so a standalone upload has somewhere to
        // be seen before it earns enough views/likes to rank into
        // Featured - exclude whatever Featured already shows so nothing
        // appears twice on the page.
        return api.get('/bible-studies/latest', { params: { limit: 8, exclude: items.map((i) => i.id).join(',') } })
          .then((r) => setLatest(r.data?.data?.items || []))
          .catch(() => setLatest([]))
          .finally(() => setLatestLoading(false));
      });
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

      {/* No padding when there's nothing to show here (LiveNowStrip
          renders null with no live items, Continue Studying needs a
          signed-in user) - otherwise an empty py-12 box leaves a blank
          gap between the hero and the first curated band below. */}
      <div className={`max-w-7xl mx-auto px-6 ${(continuing.length > 0 || isSearching) ? 'py-12' : 'pt-6'}`}>
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

        {isSearching && (
          /* Search mode - a flat filtered grid, same ContentCard the
             curated bands below use, replacing them while a search is
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
        )}
      </div>

      {/* Curated bands - each its own full-bleed, alternating-tint
          section (icon + title + subtitle, then a tile grid), matching
          the reference layout rather than one flat background. */}
      {!isSearching && (
        <>
          {/* Featured Studies - purely the most liked/viewed (see
              BibleStudy::featuredRanked()), deliberately not the same
              ranking the Home page's own Featured section shows. */}
          {(featuredLoading || featured.length > 0) && (
            <SectionBand
              icon={Sparkles}
              title="Featured Studies"
              subtitle="The studies our community is reading and listening to the most."
              tint="bg-white"
            >
              {featuredLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-[70px] rounded-2xl bg-surface animate-pulse" />
                  ))}
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  initial="hidden" animate="visible" variants={staggerContainer}
                >
                  {featured.map((item) => {
                    const kind = getItemKind(item);
                    const { icon, label } = FORMAT_TILE[kind] || FORMAT_TILE.audio;
                    return (
                      <motion.div key={item.id} variants={fadeUp}>
                        <StudyTile
                          to={`/bible-studies/${item.slug}`}
                          icon={icon}
                          title={item.title}
                          meta={`${label} · ${item.views ?? 0} views`}
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </SectionBand>
          )}

          {/* Prophecy - exactly Daniel/Revelation/Matthew 24, permanent. */}
          {prophecySeries.length > 0 && (
            <SectionBand
              icon={ScrollText}
              title="Prophecy"
              subtitle="Daniel, Revelation and Matthew 24 — unlocking Bible prophecy for the last days."
              tint="bg-secondary/[0.05]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {prophecySeries.map((s) => <ProphecyCard key={s.id} s={s} />)}
              </div>
            </SectionBand>
          )}

          {/* Everything else - every other admin-created study series
              (e.g. "The Great Controversy", "Steps to Christ"). */}
          {otherSeries.length > 0 && (
            <SectionBand
              icon={Layers}
              title="Explore More Studies"
              subtitle="Multi-chapter books and collections to study at your own pace."
              tint="bg-white"
              action={
                <Link to="/series?section=bible_study" className="flex items-center gap-1 text-xs font-semibold text-secondary shrink-0">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                initial="hidden" animate="visible" variants={staggerContainer}
              >
                {otherSeries.map((s) => (
                  <motion.div key={s.id} variants={fadeUp}>
                    <StudyTile
                      to={`/series/${s.slug}`}
                      icon={Layers}
                      title={s.title}
                      meta={`${s.episode_count} ${Number(s.episode_count) === 1 ? 'chapter' : 'chapters'}`}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </SectionBand>
          )}

          {/* Latest Studies - standalone uploads (no collection card of
              their own) that haven't yet earned a Featured spot, so
              nothing new is invisible while it's still fresh. */}
          {!latestLoading && latest.length > 0 && (
            <SectionBand
              icon={Clock}
              title="Latest Studies"
              subtitle="Freshly added studies, hot off the press."
              tint="bg-accent/[0.05]"
            >
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                initial="hidden" animate="visible" variants={staggerContainer}
              >
                {latest.map((item) => {
                  const kind = getItemKind(item);
                  const { icon, label } = FORMAT_TILE[kind] || FORMAT_TILE.audio;
                  return (
                    <motion.div key={item.id} variants={fadeUp}>
                      <StudyTile
                        to={`/bible-studies/${item.slug}`}
                        icon={icon}
                        title={item.title}
                        meta={label}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            </SectionBand>
          )}

          {!featuredLoading && !latestLoading && featured.length === 0 && latest.length === 0
            && prophecySeries.length === 0 && otherSeries.length === 0 && (
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="glass-card p-10 text-center">
                <Inbox className="w-8 h-8 text-ink/25 mx-auto mb-3" />
                <p className="text-ink/50">No Bible studies published yet.</p>
              </div>
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
        <div className="max-w-7xl mx-auto px-6 pb-12">
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
        </div>
      )}
    </div>
  );
}
