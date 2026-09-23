import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Search, HeartPulse, Sparkles, Shirt, ScrollText,
  Layers, Loader2, Inbox, Quote, Users,
} from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import LiveNowStrip from '../Components/LiveNowStrip.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';
import { formatRelativeDate } from '../utils/formatters.js';
import { getVerseOfDay } from '../utils/verseOfDay.js';

// Reforms + Prophecy (migrations 018/019/020) get their own small icon
// set so they read as a distinct, recognizable group of filter chips
// rather than blending into the plain category dropdown.
const REFORM_META = {
  'Health Reform':    { icon: HeartPulse, className: 'bg-emerald-100 text-emerald-700' },
  'Spiritual Reform':  { icon: Sparkles, className: 'bg-purple-100 text-purple-700' },
  'Dress Reform':      { icon: Shirt, className: 'bg-orange-100 text-orange-700' },
  'Prophecy':          { icon: ScrollText, className: 'bg-rose-100 text-rose-700' },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

function VerseOfDayCard() {
  const verse = useMemo(() => getVerseOfDay(), []);
  return (
    <motion.div
      variants={fadeUp}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-[#6B3FE0] to-primary p-6 flex flex-col justify-center text-center shadow-glass min-h-[220px]"
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-black/10" />
      <Quote className="relative z-10 w-6 h-6 text-white/50 mx-auto mb-3" />
      <p className="relative z-10 font-display italic text-white text-sm leading-relaxed mb-3 line-clamp-6">
        "{verse.text}"
      </p>
      <p className="relative z-10 text-accent font-semibold text-xs tracking-wide uppercase">
        {verse.reference}
      </p>
      <p className="relative z-10 text-white/50 text-[10px] mt-2 uppercase tracking-wider">Verse of the Day</p>
    </motion.div>
  );
}

function SeriesRow({ s }) {
  return (
    <Link
      to={`/series/${s.slug}`}
      className="flex items-center gap-4 glass-card p-3 hover:-translate-y-0.5 transition-transform"
    >
      <div className="w-24 h-16 shrink-0 rounded-xl overflow-hidden bg-brand-gradient-soft flex items-center justify-center">
        {s.cover_image ? (
          <img src={s.cover_image} alt={s.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <Layers className="w-6 h-6 text-secondary" />
        )}
      </div>
      <div className="min-w-0">
        <h3 className="font-display font-bold text-sm text-ink leading-snug line-clamp-1">{s.title}</h3>
        <p className="text-xs text-ink/50 mt-0.5">{s.episode_count} {Number(s.episode_count) === 1 ? 'video' : 'videos'}</p>
        {s.latest_episode_at && (
          <p className="text-[11px] text-ink/40 mt-0.5">Latest: {formatRelativeDate(s.latest_episode_at)}</p>
        )}
      </div>
    </Link>
  );
}

export default function BibleStudies() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [continuing, setContinuing] = useState([]);
  const [categories, setCategories] = useState([]);
  const [series, setSeries] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');

  const bsParams = useMemo(() => ({
    category_id: categoryId || undefined,
    language,
    search: search || undefined,
  }), [categoryId, language, search]);

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList('/bible-studies', bsParams, 24);
  const topItems = items.slice(0, 3);
  const restItems = items.slice(3);

  const reformCategories = useMemo(
    () => categories.filter((c) => Object.prototype.hasOwnProperty.call(REFORM_META, c.name)),
    [categories]
  );

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(r.data?.data?.items || []))
      .catch(() => setCategories([]));
    // Recently-updated series first (Series::all()'s own ordering) - a
    // handful is enough for the compact desktop-only strip below.
    api.get('/series', { params: { section: 'bible_study', limit: 5 } })
      .then((r) => setSeries(r.data?.data?.items || []))
      .catch(() => setSeries([]));
  }, []);

  useEffect(() => {
    if (!user) { setContinuing([]); return; }
    api.get('/bible-studies/continue').then((r) => setContinuing(r.data.data.items)).catch(() => setContinuing([]));
  }, [user]);

  function toggleCategory(id) {
    setCategoryId((current) => (current === String(id) ? '' : String(id)));
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero — exact hierarchy: small label, moderate heading, plain
          supporting line, italic verse. Kept compact. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-[#6B3FE0] to-primary py-10 sm:py-12">
        <motion.div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"
          animate={{ y: [0, 20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-accent" />
            <span className="text-[18px] font-semibold text-accent tracking-wide">Bible Study</span>
          </motion.div>
          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.05 }}
            className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-white leading-tight mb-2"
          >
            Dig deeper in God's Word
          </motion.h1>
          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.1 }}
            className="font-body text-white/75 text-sm sm:text-base mb-3"
          >
            Discover Truth. Grow in Faith. Be transformed.
          </motion.p>
          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.15 }}
            className="italic text-white/70 text-sm sm:text-base max-w-xl"
          >
            "Thy word is a lamp unto my feet, and a light unto my path."
            <span className="not-italic text-accent font-semibold ml-2 text-xs tracking-wide uppercase align-middle">
              Psalm 119:105, KJV
            </span>
          </motion.p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <LiveNowStrip endpoint="/bible-studies" itemHref={(item) => `/bible-studies/${item.slug}`} />

        {continuing.length > 0 && (
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

        {/* Reforms + Prophecy filter chips — one swipeable horizontal line
            on mobile (no vertical wrap), wraps freely once there's room
            on larger screens. */}
        {reformCategories.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-ink/40 uppercase mb-2.5">Reforms & Prophecy</p>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1 sm:flex-wrap sm:overflow-visible">
              {reformCategories.map((c) => {
                const meta = REFORM_META[c.name];
                const Icon = meta.icon;
                const active = categoryId === String(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                      active ? 'bg-brand-gradient text-white shadow-glass' : `${meta.className} hover:shadow-glass`
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search + Category filter — Format and Language were removed:
            Format exposed admin-facing upload vocabulary rather than
            helping discovery (spec), and Language is now the navbar's
            single site-wide selector, not a per-page control. */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Bible studies by title..."
              className="w-full pl-11 pr-4 py-3 rounded-full border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {(categoryId || search) && (
            <button
              onClick={() => { setCategoryId(''); setSearch(''); }}
              className="px-5 py-3 rounded-full text-sm font-semibold text-ink/50 hover:text-ink"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white/70 shadow-glass animate-pulse">
                <div className="h-40 bg-ink/10" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-1/2 bg-ink/10 rounded-full" />
                  <div className="h-4 w-4/5 bg-ink/10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Inbox className="w-8 h-8 text-ink/25 mx-auto mb-3" />
            <p className="text-ink/50">No Bible studies match your filters yet.</p>
          </div>
        ) : (
          <>
            {/* Main content: three cards + a Verse of the Day card in the
                fourth slot on desktop; mobile stacks everything in one
                column (grid-cols-1 already achieves this, no separate
                mobile-only markup needed). */}
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10"
              initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              {topItems.map((item) => (
                <motion.div key={item.id} variants={fadeUp}>
                  <Link to={`/bible-studies/${item.slug}`}>
                    <ContentCard item={item} />
                  </Link>
                </motion.div>
              ))}
              <VerseOfDayCard />
            </motion.div>

            {restItems.length > 0 && (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              >
                {restItems.map((item) => (
                  <motion.div key={item.id} variants={fadeUp}>
                    <Link to={`/bible-studies/${item.slug}`}>
                      <ContentCard item={item} />
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {hasMore && (
              <div className="flex justify-center mb-12">
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

        {/* Bible Study Series — desktop only */}
        {series.length > 0 && (
          <div className="hidden lg:block mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                <Layers className="w-4 h-4 text-secondary" /> Bible Study Series
              </h2>
              <Link to="/series" className="flex items-center gap-1 text-xs font-semibold text-secondary shrink-0">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
              {series.slice(0, 5).map((s) => <SeriesRow key={s.id} s={s} />)}
            </div>
          </div>
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
