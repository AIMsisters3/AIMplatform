import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Film, Video, Mic, Users, Headphones, Podcast, MessageSquare,
  Wand2, Camera, FileType, ArrowRight, BookOpen,
} from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import LiveNowStrip from '../Components/LiveNowStrip.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const FORMATS = [
  { value: '', label: 'All Formats' },
  { value: 'short_film', label: 'Short Film' },
  { value: 'video', label: 'Video' },
  { value: 'sermon', label: 'Sermon' },
  { value: 'panel', label: 'Panel Discussion' },
  { value: 'audio', label: 'Audio' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'interview', label: 'Interview' },
  { value: 'animated', label: 'Animated' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'pdf_notes', label: 'PDF / Notes' },
];

// Order + icon for the "browse by format" groups shown when nothing is
// filtered yet — gives the admin's flat, one-list-of-everything data a
// structure a visitor can actually scan, instead of dumping every format
// into one undifferentiated grid.
const FORMAT_GROUPS = [
  { value: 'sermon', label: 'Sermons', icon: Mic },
  { value: 'panel', label: 'Panel Discussions', icon: Users },
  { value: 'podcast', label: 'Podcasts', icon: Podcast },
  { value: 'interview', label: 'Interviews', icon: MessageSquare },
  { value: 'video', label: 'Videos', icon: Video },
  { value: 'audio', label: 'Audio', icon: Headphones },
  { value: 'documentary', label: 'Documentaries', icon: Camera },
  { value: 'short_film', label: 'Short Films', icon: Film },
  { value: 'animated', label: 'Animated', icon: Wand2 },
  { value: 'pdf_notes', label: 'PDF & Notes', icon: FileType },
];

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

export default function BibleStudies() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [continuing, setContinuing] = useState([]);
  const [categories, setCategories] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [format, setFormat] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const isFiltering = Boolean(format || categoryId || language || search);

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(r.data?.data?.items || []))
      .catch(() => setCategories([]));
    api.get('/languages')
      .then((r) => setLanguageOptions(r.data?.data?.items || []))
      .catch(() => setLanguageOptions([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/bible-studies', {
      params: {
        format: format || undefined,
        category_id: categoryId || undefined,
        language: language || undefined,
        search: search || undefined,
        // When browsing unfiltered, pull enough to populate every format
        // group below; once the admin narrows down, a normal page of
        // results is enough.
        limit: isFiltering ? 24 : 100,
      },
    })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [format, categoryId, language, search, isFiltering]);

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

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Bible Studies</h1>
      <p className="text-ink/60 mb-8">Go deeper into God's Word with structured, verse-by-verse study guides.</p>

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

      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Bible studies..."
          className="flex-1 px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <option value="">All Languages</option>
          {languageOptions.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading studies...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <BookOpen className="w-8 h-8 text-ink/25 mx-auto mb-3" />
          <p className="text-ink/50">No Bible studies published yet. Check back soon.</p>
        </div>
      ) : isFiltering ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link key={item.id} to={`/bible-studies/${item.slug}`}>
              <ContentCard item={item} />
            </Link>
          ))}
        </div>
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
  );
}
