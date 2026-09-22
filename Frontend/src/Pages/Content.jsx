import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, HeartPulse, Shirt,
  ScrollText, PlayCircle, FileText, Headphones, Inbox, Globe,
  Sparkles, Image as ImageIcon, Layers, Loader2, X,
} from 'lucide-react';
import api from '../api/axios.js';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import LiveNowStrip from '../Components/LiveNowStrip.jsx';
import { getItemKind } from '../utils/mediaKind.js';
import { usePaginatedList } from '../hooks/usePaginatedList.js';
import contentBg from '../assets/content_bg.png';
import heroGirl from '../assets/hero-girl.png';
import logo from '../assets/lg.png';

// The system only ever offers these three content categories (migration
// 019 removes every other type='content' row) — matched here by name so
// each gets its own icon/color rather than the generic fallback.
const CATEGORY_META = {
  'Health Reform':    { icon: HeartPulse, tagline: 'Wellness & Godly Living', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  'Spiritual Reform':  { icon: Sparkles, tagline: 'Renewal in Christ', bg: 'bg-purple-100', text: 'text-purple-600' },
  'Dress Reform':      { icon: Shirt, tagline: 'Modesty & Godly Life', bg: 'bg-orange-100', text: 'text-orange-600' },
};

const CATEGORY_ORDER = ['Health Reform', 'Spiritual Reform', 'Dress Reform'];
const EXCLUDED_CATEGORIES = [];

// Categories are admin-managed, so their exact names can't be relied on to
// match CATEGORY_META above (an admin can rename "Children Ministry" to
// "Children", or add a brand-new category CATEGORY_META has never heard
// of). Any category without a curated entry still gets a real color from
// this rotating palette, keyed by its id so a given category's color stays
// stable across reloads — rather than the flat, colorless fallback that
// made unmatched categories look broken/unstyled next to the curated ones.
const FALLBACK_PALETTE = [
  { bg: 'bg-amber-100', text: 'text-amber-600' },
  { bg: 'bg-teal-100', text: 'text-teal-600' },
  { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600' },
  { bg: 'bg-lime-100', text: 'text-lime-600' },
  { bg: 'bg-cyan-100', text: 'text-cyan-600' },
];

function fallbackMetaFor(cat) {
  return { icon: ScrollText, tagline: '', ...FALLBACK_PALETTE[cat.id % FALLBACK_PALETTE.length] };
}

// Drives how many "Latest Content" cards render before the Popular This
// Week strip: exactly one full row on each breakpoint (spec: "after at
// least 1 row" on desktop, "after 1-2 rows" on mobile) — a single fixed
// item count can't satisfy both, since mobile shows 1 card per row and
// desktop shows 4, so this actually has to know the current breakpoint
// rather than just slicing the same array length for everyone.
function useIsMobile(breakpointPx = 640) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpointPx
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpointPx]);
  return isMobile;
}

function LogoSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <img
        src={logo}
        alt=""
        className="w-14 h-14 rounded-full object-cover shadow-glass animate-spin"
        style={{ animationDuration: '1.1s' }}
      />
      <p className="text-xs text-ink/40 font-medium">{label}</p>
    </div>
  );
}

function sortCategories(categories) {
  return [...categories]
    .filter((c) => !EXCLUDED_CATEGORIES.includes(c.name.trim().toLowerCase()))
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.name);
      const bi = CATEGORY_ORDER.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
}

const KIND_ICON = { video: PlayCircle, pdf: FileText, audio: Headphones };
const KIND_LABEL = { video: 'Watch', pdf: 'Read', audio: 'Listen', article: 'Read' };

// "Browse by Type" chips — per spec, the only content types displayed
// and used for filtering on this page are Video, Poster, and Audio.
// 'Poster' maps to media_type 'image' (a single cover image, no separate
// video/audio file) - other media_library types (short_film, interview,
// music) still exist and remain visible/playable, just without their
// own dedicated filter chip; clicking an already-active chip clears it,
// same as before, so no separate "All" option is needed.
const TYPE_FILTERS = [
  { value: 'video', label: 'Video', icon: PlayCircle },
  { value: 'image', label: 'Poster', icon: ImageIcon },
  { value: 'audio,music', label: 'Audio', icon: Headphones },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const dateVal = (d) => (d ? new Date(d).getTime() : 0);

function FeaturedCard({ item, onClick }) {
  const kind = getItemKind(item);
  const KindIcon = KIND_ICON[kind] || FileText;

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6 }}
      onClick={onClick}
      className="glass-card overflow-hidden cursor-pointer group"
    >
      <div className="relative h-36 bg-brand-gradient-soft overflow-hidden">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl brand-gradient-text font-display font-bold">AIM</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-sm leading-snug mb-1 line-clamp-1">{item.title}</h3>
        <p className="text-xs text-ink/50 line-clamp-2 mb-3">{item.description}</p>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-gradient px-3 py-1.5 rounded-full">
          <KindIcon className="w-3.5 h-3.5" />
          {KIND_LABEL[kind] || 'View'}
        </span>
      </div>
    </motion.div>
  );
}

function PopularItem({ item, rank, onClick }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="relative shrink-0 w-36 cursor-pointer group"
    >
      <div className="absolute -top-2 -left-2 z-10 w-7 h-7 rounded-full bg-brand-gradient text-white text-xs font-bold flex items-center justify-center shadow-glass">
        {rank}
      </div>
      <div className="h-44 rounded-xl2 overflow-hidden bg-brand-gradient-soft shadow-glass">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xl brand-gradient-text font-display font-bold">AIM</span>
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-ink mt-2 line-clamp-1">{item.title}</p>
    </motion.div>
  );
}

function SeriesStrip({ series }) {
  if (series.length === 0) return null;
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
            <Layers className="w-4 h-4 text-secondary" /> Series & Collections
          </h2>
          <p className="text-xs text-ink/45">Multi-part stories, animations, and studies told across episodes.</p>
        </div>
        <Link to="/series" className="flex items-center gap-1 text-xs font-semibold text-secondary shrink-0">
          View All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {series.map((s) => (
          <Link
            key={s.id}
            to={`/series/${s.slug}`}
            className="shrink-0 w-60 glass-card overflow-hidden group hover:-translate-y-1 transition-transform"
          >
            <div className="relative h-32 bg-brand-gradient-soft flex items-center justify-center overflow-hidden">
              {s.cover_image ? (
                <img src={s.cover_image} alt={s.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <Layers className="w-8 h-8 text-secondary" />
              )}
              <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-brand-gradient text-white text-[11px] font-semibold shadow-glass flex items-center gap-1">
                <PlayCircle className="w-3 h-3" /> {s.episode_count}
              </span>
            </div>
            <div className="p-3.5">
              <h3 className="font-display font-semibold text-sm leading-snug mb-0.5 line-clamp-1 group-hover:text-secondary transition-colors">
                {s.title}
              </h3>
              {s.category_name && <p className="text-[11px] text-ink/45">{s.category_name}</p>}
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

export default function Content() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [series, setSeries] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [activeItem, setActiveItem] = useState(null);

  const [featuredItems, setFeaturedItems] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [popularItems, setPopularItems] = useState([]);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const isMobile = useIsMobile();

  // Every eligible published item — media_library section only (Bible
  // Studies/Devotions/News/Gallery/Kids/Songs each have their own
  // dedicated destination and shouldn't also duplicate into this feed).
  // Real server-side pagination via usePaginatedList, same pattern as
  // Gallery/News/Devotions - resets to page 1 whenever a filter changes,
  // so a filter change can never show a stale/duplicated page of results.
  const feedParams = useMemo(() => ({
    section: 'media_library',
    search: search || undefined,
    category_id: categoryId || undefined,
    language: language || undefined,
    media_type: mediaType || undefined,
  }), [search, categoryId, language, mediaType]);
  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList('/content', feedParams, 24);

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(sortCategories(r.data?.data?.items || [])))
      .catch(() => setCategories([]));
    api.get('/languages')
      .then((r) => setLanguageOptions(r.data?.data?.items || []))
      .catch(() => setLanguageOptions([]));
    api.get('/series', { params: { section: 'media_library', limit: 8 } })
      .then((r) => setSeries(r.data?.data?.items || []))
      .catch(() => setSeries([]));
    // Popular This Week reflects genuine site-wide activity (real,
    // deduplicated views in the last 7 days, min. 10 - see
    // Content::popularThisWeek()) rather than whatever the visitor
    // happens to currently be filtering by, so it's fetched once, not
    // re-fetched on every filter change. Stays empty (section hidden)
    // when nothing has reached the threshold yet - never backfilled
    // with lower-view items to avoid showing an empty/misleading list.
    api.get('/content/popular', { params: { section: 'media_library', limit: 12 } })
      .then((r) => setPopularItems(r.data?.data?.items || []))
      .catch(() => setPopularItems([]));
  }, []);

  // Featured Content is its own real server query (never derived from
  // whatever happens to be on the current feed page) - only items an
  // admin explicitly marked is_featured=1 ever appear here, and if none
  // match the active filters, the section simply doesn't render (no
  // fallback to showing non-featured items).
  useEffect(() => {
    setFeaturedLoading(true);
    api.get('/content', { params: { ...feedParams, featured: 1, limit: 4 } })
      .then((r) => setFeaturedItems(r.data?.data?.items || []))
      .catch(() => setFeaturedItems([]))
      .finally(() => setFeaturedLoading(false));
  }, [feedParams]);

  useEffect(() => {
    const slug = searchParams.get('item');
    if (!slug) return;
    api.get(`/content/${slug}`)
      .then((r) => { if (r.data?.data?.item) setActiveItem(r.data.data.item); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Popular This Week must appear after at least one row of regular
  // content, never at the very top — mobile shows 1 card/row (spec:
  // show it after 1-2 rows), desktop shows 4 cards/row (after 1 row).
  const popularLeadCount = isMobile ? 2 : 4;
  const leadItems = items.slice(0, popularLeadCount);
  const restItems = items.slice(popularLeadCount);

  function openItem(item) {
    setActiveItem(item);
    setSearchParams({ item: item.slug }, { replace: true });
  }

  function closeItem() {
    setActiveItem(null);
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="min-h-screen bg-surface">
    {/* Hero band */}
<section className="relative overflow-hidden bg-gradient-to-br from-secondary via-[#6B3FE0] to-primary h-auto pb-10 lg:h-[350px] lg:pb-0">
  <div className="absolute inset-0 opacity-20 mix-blend-soft-light" style={{ backgroundImage: `url(${contentBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />

  <motion.img
    src={heroGirl}
    alt=""
    initial={{ opacity: 0, x: 30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay: 0.15 }}
    className="hidden lg:block absolute -bottom-3 right-6 h-[340px] xl:h-[400px] w-auto pointer-events-none z-0"
  />

  <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10 sm:pt-12 lg:h-full">
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="max-w-lg">
      <div className="flex items-center gap-3 sm:gap-4 mb-3">
        <span className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 shadow-glass">
          <PlayCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-white leading-none tracking-tight">
          Media{' '}
          <span className="bg-gradient-to-r from-accent via-pink-300 to-white bg-clip-text text-transparent">
            Library
          </span>
        </h1>
      </div>

      <p className="font-display italic text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-white/95 mb-3">
        Inspiring Content for Everyone
      </p>

      <p className="font-body text-white/70 text-sm sm:text-base md:text-lg leading-relaxed max-w-sm">
        Explore our collection of cartoons, movies, and other creative content designed to
        <span className="text-accent font-semibold"> educate</span>,
        <span className="text-white font-semibold"> inspire</span>, and
        <span className="bg-gradient-to-r from-accent to-white bg-clip-text text-transparent font-semibold"> uplift</span>.
      </p>
    </motion.div>
  </div>

  {/* Search: desktop keeps the field visible/usable at all times.
      Mobile shows just an icon that expands into the same field, with
      a way to collapse it again, rather than forcing the full-width bar
      onto small screens. */}
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.25, duration: 0.5 }}
    className="relative mt-6 px-6 max-w-7xl mx-auto lg:mt-0 lg:px-0 lg:max-w-none lg:mx-0 lg:absolute lg:z-20 lg:left-10 lg:right-52 lg:bottom-0"
  >
    <form onSubmit={(e) => e.preventDefault()} className="hidden lg:block relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search for cartoons, movies, or other content..."
        className="w-full pl-11 pr-24 sm:pr-28 py-3 sm:py-3.5 rounded-full border-0 bg-white shadow-glass focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1.5 bottom-1.5 px-4 sm:px-5 rounded-full bg-brand-gradient text-white text-sm font-semibold flex items-center gap-1.5"
      >
        <Search className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Search</span>
      </button>
    </form>

    <div className="lg:hidden flex justify-end">
      <AnimatePresence mode="wait" initial={false}>
        {mobileSearchOpen ? (
          <motion.form
            key="expanded"
            onSubmit={(e) => e.preventDefault()}
            initial={{ width: 44, opacity: 0 }}
            animate={{ width: '100%', opacity: 1 }}
            exit={{ width: 44, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full overflow-hidden"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => { if (!search) setMobileSearchOpen(false); }}
              placeholder="Search content..."
              className="w-full pl-11 pr-11 py-3 rounded-full border-0 bg-white shadow-glass focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
            />
            <button
              type="button"
              onClick={() => { setSearch(''); setMobileSearchOpen(false); }}
              aria-label="Close search"
              className="absolute right-1.5 top-1.5 bottom-1.5 w-8 rounded-full bg-surface flex items-center justify-center text-ink/50"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.form>
        ) : (
          <motion.button
            key="icon"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSearchOpen(true)}
            aria-label="Open search"
            className="w-11 h-11 rounded-full bg-white shadow-glass flex items-center justify-center text-secondary shrink-0"
          >
            <Search className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  </motion.div>
</section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <LiveNowStrip endpoint="/content" onItemClick={openItem} />

        {/* Language filter — small, unobtrusive */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex justify-end mb-2">
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/40 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none pl-8 pr-7 py-1.5 rounded-full border border-ink/10 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-secondary cursor-pointer"
            >
              <option value="">All Languages</option>
              {languageOptions.map((lang) => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
            </select>
          </div>
        </motion.div>

        {/* Browse navigation area — on desktop, Video/Poster/Audio and
            Browse by Category sit together in one horizontal area
            (spec). On small screens, only category browsing shows here
            (the type row is hidden entirely, not squeezed in above it),
            keeping the mobile nav area to one simple row of chips. */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="hidden lg:block">
              <h2 className="text-lg font-display font-bold text-ink mb-4">Browse by Type</h2>
              <div className="flex gap-2.5 flex-wrap">
                {TYPE_FILTERS.map((t) => {
                  const active = mediaType === t.value;
                  return (
                    <button
                      key={t.label}
                      onClick={() => setMediaType(active ? '' : t.value)}
                      className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                        active ? 'bg-brand-gradient text-white shadow-glass' : 'bg-white text-ink/70 border border-ink/10 hover:border-secondary/40'
                      }`}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 lg:max-w-md">
              <h2 className="text-lg font-display font-bold text-ink mb-4">Browse by Category</h2>
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none lg:flex-wrap lg:overflow-visible">
                {categories.map((cat) => {
                  const meta = CATEGORY_META[cat.name] || fallbackMetaFor(cat);
                  const Icon = meta.icon;
                  const active = categoryId === String(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(active ? '' : String(cat.id))}
                      className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                        active ? 'bg-brand-gradient text-white shadow-glass' : `${meta.bg} ${meta.text} hover:shadow-glass`
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : ''}`} />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Type filters shown separately on mobile too — spec keeps them
            usable for filtering everywhere, just not sharing the mobile
            category nav's row - here below it, out of the way. */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="lg:hidden mb-8">
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {TYPE_FILTERS.map((t) => {
              const active = mediaType === t.value;
              return (
                <button
                  key={t.label}
                  onClick={() => setMediaType(active ? '' : t.value)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                    active ? 'bg-brand-gradient text-white shadow-glass' : 'bg-white text-ink/70 border border-ink/10 hover:border-secondary/40'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        <SeriesStrip series={series} />

        {loading ? (
          <LogoSpinner label="Loading content..." />
        ) : items.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col items-center text-center py-20">
            <div className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">No content found</h3>
            <p className="text-ink/50 text-sm mb-5 max-w-xs">Try a different search, category, type, or language.</p>
            <button
              onClick={() => { setSearch(''); setCategoryId(''); setLanguage(''); setMediaType(''); }}
              className="px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass"
            >
              Reset filters
            </button>
          </motion.div>
        ) : (
          <>
            {/* Featured Content — only ever items an admin explicitly marked
                Featured; the whole section is omitted (not filled in with
                non-featured items) when none match. */}
            {!featuredLoading && featuredItems.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-display font-bold text-ink">Featured Content</h2>
                </div>
                <motion.div
                  key={`featured-${search}-${categoryId}-${language}-${mediaType}`}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5"
                  initial="hidden" animate="visible" variants={staggerContainer}
                >
                  {featuredItems.map((item) => (
                    <FeaturedCard key={item.id} item={item} onClick={() => openItem(item)} />
                  ))}
                </motion.div>
              </div>
            )}

            {/* Latest Content — the actual browsable, paginated feed: latest
                published first, every filter/search combination narrows this
                same list, and Load More fetches the next real page from the
                server rather than ever re-deriving/duplicating what's shown
                above. Split into a lead row + the rest so Popular This Week
                (below) never appears at the very top of the page. */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-bold text-ink">Latest Content</h2>
              </div>
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5"
                initial="hidden" animate="visible" variants={staggerContainer}
              >
                {leadItems.map((item) => (
                  <FeaturedCard key={item.id} item={item} onClick={() => openItem(item)} />
                ))}
              </motion.div>
            </div>

            {/* Popular This Week — only real qualifying items (>=10
                genuine views in the last 7 days, see popular() on the
                backend); the section is simply omitted when nothing
                qualifies yet, never shown empty or backfilled. */}
            {popularItems.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-display font-bold text-ink">Popular This Week</h2>
                    <p className="text-xs text-ink/45">See what others are watching and enjoying.</p>
                  </div>
                </div>
                <motion.div
                  className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
                  initial="hidden" animate="visible" variants={staggerContainer}
                >
                  {popularItems.map((item, i) => (
                    <PopularItem key={item.id} item={item} rank={i + 1} onClick={() => openItem(item)} />
                  ))}
                </motion.div>
              </div>
            )}

            {restItems.length > 0 && (
              <div className="mb-10">
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5"
                  initial="hidden" animate="visible" variants={staggerContainer}
                >
                  {restItems.map((item) => (
                    <FeaturedCard key={item.id} item={item} onClick={() => openItem(item)} />
                  ))}
                </motion.div>
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center mt-2 mb-10">
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

        {/* Bottom CTA banner */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-brand-gradient-soft rounded-2xl p-6"
        >
          <div className="flex items-start gap-3">
            <ScrollText className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <p className="text-sm text-ink/70 italic max-w-lg">
              "Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth."
              <span className="block not-italic font-semibold text-ink/60 mt-1">2 Timothy 2:15</span>
            </p>
          </div>
          <div className="text-center sm:text-right shrink-0">
            <p className="text-xs text-ink/50 mb-2">Find more encouragement in our Bible Studies and Devotions.</p>
            <Link
              to="/devotions"
              className="inline-block px-6 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition"
            >
              Go to Devotions
            </Link>
          </div>
        </motion.div>
      </div>

      <ContentViewerModal item={activeItem} onClose={closeItem} />
    </div>
  );
}