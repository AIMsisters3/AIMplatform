import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Film, Video, Mic, Users, Headphones, Podcast, MessageSquare,
  Wand2, Camera, FileType, FileText, ArrowRight, BookOpen, Search,
  HeartPulse, Sparkles, Shirt, Layers, Loader2, Inbox,
} from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import LiveNowStrip from '../Components/LiveNowStrip.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePaginatedList } from '../hooks/usePaginatedList.js';

const FORMATS = [
  { value: '', label: 'All Formats' },
  { value: 'video', label: 'Video' },
  { value: 'short_film', label: 'Short Film' },
  { value: 'sermon', label: 'Sermon' },
  { value: 'panel', label: 'Panel Discussion' },
  { value: 'audio', label: 'Audio' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'interview', label: 'Interview' },
  { value: 'animated', label: 'Animated' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'article', label: 'Article' },
  { value: 'pdf_notes', label: 'PDF / Notes' },
];

// Order + icon for the "browse by format" groups shown when nothing is
// filtered yet — gives the admin's flat, one-list-of-everything data a
// structure a visitor can actually scan, instead of dumping every format
// into one undifferentiated grid.
const FORMAT_GROUPS = [
  { value: 'sermon', label: 'Sermons', icon: Mic },
  { value: 'documentary', label: 'Documentaries', icon: Camera },
  { value: 'panel', label: 'Panel Discussions', icon: Users },
  { value: 'podcast', label: 'Podcasts', icon: Podcast },
  { value: 'interview', label: 'Interviews', icon: MessageSquare },
  { value: 'video', label: 'Videos', icon: Video },
  { value: 'audio', label: 'Audio', icon: Headphones },
  { value: 'short_film', label: 'Short Films', icon: Film },
  { value: 'animated', label: 'Animated', icon: Wand2 },
  { value: 'article', label: 'Articles', icon: FileText },
  { value: 'pdf_notes', label: 'PDF & Notes', icon: FileType },
];

// Reforms categories (migration 018) get their own small icon set so they
// read as a distinct, recognizable group of filter chips rather than
// blending into the plain category dropdown.
const REFORM_META = {
  'Health Reform': { icon: HeartPulse, className: 'bg-emerald-100 text-emerald-700' },
  'Spiritual Reform': { icon: Sparkles, className: 'bg-purple-100 text-purple-700' },
  'Dress Reform': { icon: Shirt, className: 'bg-orange-100 text-orange-700' },
};

function RowCard({ item }) {
  return (
    <Link
      to={`/bible-studies/${item.slug}`}
      className="shrink-0 w-56 glass-card overflow-hidden group hover:-translate-y-1 transition-transform"
    >
      <div className="h-32 bg-brand-gradient-soft flex items-center justify-center overflow-hidden">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl brand-gradient-text font-display font-bold">AIM</span>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-ink leading-snug line-clamp-2 group-hover:text-secondary transition-colors">
          {item.title}
        </p>
        {item.speaker && <p className="text-xs text-ink/45 mt-1">{item.speaker}</p>}
      </div>
    </Link>
  );
}

function SeriesStrip({ series }) {
  if (series.length === 0) return null;
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Layers className="w-4 h-4 text-secondary" /> Bible Study Series
          </h2>
          <p className="text-xs text-ink/45">Multi-part studies, told across episodes.</p>
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
              <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-brand-gradient text-white text-[11px] font-semibold shadow-glass">
                {s.episode_count} episodes
              </span>
            </div>
            <div className="p-3.5">
              <h3 className="font-display font-semibold text-sm leading-snug line-clamp-1 group-hover:text-secondary transition-colors">
                {s.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function BibleStudies() {
  const { user } = useAuth();
  const [continuing, setContinuing] = useState([]);
  const [categories, setCategories] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [series, setSeries] = useState([]);
  const [format, setFormat] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('');
  const [search, setSearch] = useState('');

  const isFiltering = Boolean(format || categoryId || language || search);

  const bsParams = useMemo(() => ({
    format: format || undefined,
    category_id: categoryId || undefined,
    language: language || undefined,
    search: search || undefined,
  }), [format, categoryId, language, search]);

  // When browsing unfiltered, pull a wide sample so every format group
  // below has enough to show; once anything is filtered, switch to a real
  // paginated page of matching results (Load More), so a filter change
  // never leaves a stale/duplicated page on screen.
  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList('/bible-studies', bsParams, isFiltering ? 24 : 100);

  const reformCategories = useMemo(
    () => categories.filter((c) => Object.prototype.hasOwnProperty.call(REFORM_META, c.name)),
    [categories]
  );

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(r.data?.data?.items || []))
      .catch(() => setCategories([]));
    api.get('/languages')
      .then((r) => setLanguageOptions(r.data?.data?.items || []))
      .catch(() => setLanguageOptions([]));
    api.get('/series', { params: { section: 'bible_study', limit: 8 } })
      .then((r) => setSeries(r.data?.data?.items || []))
      .catch(() => setSeries([]));
  }, []);

  useEffect(() => {
    if (!user) { setContinuing([]); return; }
    api.get('/bible-studies/continue').then((r) => setContinuing(r.data.data.items)).catch(() => setContinuing([]));
  }, [user]);

  const groups = useMemo(() => {
    if (isFiltering) return [];
    return FORMAT_GROUPS
      .map((g) => ({ ...g, items: items.filter((i) => i.format === g.value) }))
      .filter((g) => g.items.length > 0);
  }, [items, isFiltering]);

  function toggleCategory(id) {
    setCategoryId((current) => (current === String(id) ? '' : String(id)));
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-[#6B3FE0] to-primary py-12 sm:py-16">
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            <span className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 shadow-glass">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-white leading-none tracking-tight">
              Bible{' '}
              <span className="bg-gradient-to-r from-accent via-pink-300 to-white bg-clip-text text-transparent">
                Studies
              </span>
            </h1>
          </div>
          <p className="font-body text-white/70 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl mb-6">
            Go deeper into God's Word with structured, verse-by-verse study guides — videos, sermons, audio, articles, and more.
          </p>

          <form onSubmit={(e) => e.preventDefault()} className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Bible studies by title..."
              className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-full border-0 bg-white shadow-glass focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
            />
          </form>
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

        {/* Reforms filter chips */}
        {reformCategories.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-ink/40 uppercase mb-2.5">Reforms</p>
            <div className="flex flex-wrap gap-2.5">
              {reformCategories.map((c) => {
                const meta = REFORM_META[c.name];
                const Icon = meta.icon;
                const active = categoryId === String(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition ${
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

        {/* Format / Category / Language filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
          >
            {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
          >
            <option value="">All Languages</option>
            {languageOptions.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          {isFiltering && (
            <button
              onClick={() => { setFormat(''); setCategoryId(''); setLanguage(''); setSearch(''); }}
              className="px-5 py-3 rounded-full text-sm font-semibold text-ink/50 hover:text-ink"
            >
              Clear filters
            </button>
          )}
        </div>

        {!isFiltering && <SeriesStrip series={series} />}

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
        ) : isFiltering ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {items.map((item) => (
                <Link key={item.id} to={`/bible-studies/${item.slug}`}>
                  <ContentCard item={item} />
                </Link>
              ))}
            </div>
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
          </>
        ) : (
          <div className="space-y-10">
            {groups.map((g) => (
              <div key={g.value}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-semibold text-lg flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center">
                      <g.icon className="w-4 h-4 text-secondary" />
                    </span>
                    {g.label}
                  </h2>
                  {g.items.length > 4 && (
                    <button
                      onClick={() => setFormat(g.value)}
                      className="text-xs font-semibold text-secondary flex items-center gap-1 hover:gap-1.5 transition-all"
                    >
                      See all <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
                  {g.items.slice(0, 8).map((item) => <RowCard key={item.id} item={item} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
