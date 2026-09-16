import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Baby, BookHeart, BookOpen, Sparkles, Music2, Palette, Star, Search,
  Globe, Inbox, PlayCircle,
} from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';

// Kids' own vocabulary (mirrors ContentController::SECTION_MEDIA_TYPES['kids'])
// — deliberately bright/distinct colors per type, not the site's usual
// purple/blue brand palette, so this area visually reads as "made for
// kids" the moment it loads, per the spec's "not just another category".
const KIDS_TYPE_GROUPS = [
  { value: 'bible_story', label: 'Bible Stories', icon: BookHeart, color: 'from-amber-400 to-orange-500' },
  { value: 'bible_lesson', label: 'Bible Lessons', icon: BookOpen, color: 'from-sky-400 to-blue-500' },
  { value: 'cartoon', label: 'Cartoons', icon: Sparkles, color: 'from-fuchsia-400 to-pink-500' },
  { value: 'song', label: 'Songs', icon: Music2, color: 'from-emerald-400 to-teal-500' },
  { value: 'activity', label: 'Activities', icon: Palette, color: 'from-violet-400 to-purple-500' },
  { value: 'other', label: 'More Fun', icon: Star, color: 'from-rose-400 to-red-500' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Kids() {
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);

  const isFiltering = Boolean(search || categoryId || language || mediaType);

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
    api.get('/kids', {
      params: {
        search: search || undefined,
        category_id: categoryId || undefined,
        language: language || undefined,
        media_type: mediaType || undefined,
        // Unfiltered: pull enough to populate every type group below.
        limit: isFiltering ? 24 : 100,
      },
    })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search, categoryId, language, mediaType, isFiltering]);

  useEffect(() => {
    const slug = searchParams.get('item');
    if (!slug) return;
    api.get(`/content/${slug}`)
      .then((r) => { if (r.data?.data?.item) setActiveItem(r.data.data.item); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    if (isFiltering) return [];
    return KIDS_TYPE_GROUPS
      .map((g) => ({ ...g, items: items.filter((i) => i.media_type === g.value) }))
      .filter((g) => g.items.length > 0);
  }, [items, isFiltering]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white">
      {/* Hero — deliberately warm/playful, not the brand purple gradient */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-pink-500 py-14">
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -right-10 w-56 h-56 rounded-full bg-white/10" />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <span className="inline-flex w-16 h-16 rounded-full bg-white/20 items-center justify-center mb-4">
              <Baby className="w-8 h-8 text-white" />
            </span>
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white mb-3">
              AIMsisters Kids Zone
            </h1>
            <p className="text-white/90 text-base sm:text-lg max-w-xl mx-auto">
              Bible stories, lessons, cartoons, songs, and fun activities made just for kids.
            </p>
          </motion.div>

          <motion.form
            initial="hidden" animate="visible" variants={fadeUp}
            onSubmit={(e) => e.preventDefault()}
            className="relative max-w-md mx-auto mt-8"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories, songs, activities..."
              className="w-full pl-11 pr-4 py-3.5 rounded-full border-0 shadow-glass focus:outline-none focus:ring-2 focus:ring-white text-sm"
            />
          </motion.form>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Type chips */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none mb-6">
          <button
            onClick={() => setMediaType('')}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${
              !mediaType ? 'bg-ink text-white shadow-glass' : 'bg-white text-ink/70 border border-ink/10'
            }`}
          >
            Everything
          </button>
          {KIDS_TYPE_GROUPS.map((g) => {
            const active = mediaType === g.value;
            return (
              <button
                key={g.value}
                onClick={() => setMediaType(active ? '' : g.value)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap text-white bg-gradient-to-r ${g.color} ${
                  active ? 'ring-2 ring-offset-2 ring-ink/20' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <g.icon className="w-3.5 h-3.5" /> {g.label}
              </button>
            );
          })}
        </div>

        {/* Category + language */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-5 py-2.5 rounded-full border border-ink/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/40 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2.5 rounded-full border border-ink/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary cursor-pointer"
            >
              <option value="">All Languages</option>
              {languageOptions.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white/70 shadow-glass animate-pulse">
                <div className="h-36 bg-ink/10" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-1/2 bg-ink/10 rounded-full" />
                  <div className="h-4 w-4/5 bg-ink/10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-orange-500" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">Nothing here yet</h3>
            <p className="text-ink/50 text-sm max-w-xs">New stories, songs, and activities for kids are on the way — check back soon!</p>
          </div>
        ) : isFiltering ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {items.map((item) => (
              <ContentCard key={item.id} item={item} onClick={() => setActiveItem(item)} />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map((g) => (
              <div key={g.value}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-lg flex items-center gap-2">
                    <span className={`w-9 h-9 rounded-2xl bg-gradient-to-r ${g.color} flex items-center justify-center shadow-glass`}>
                      <g.icon className="w-4 h-4 text-white" />
                    </span>
                    {g.label}
                  </h2>
                  {g.items.length > 4 && (
                    <button
                      onClick={() => setMediaType(g.value)}
                      className="text-xs font-bold text-secondary flex items-center gap-1"
                    >
                      See all <PlayCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
                  {g.items.slice(0, 8).map((item) => (
                    <div key={item.id} className="shrink-0 w-56">
                      <ContentCard item={item} onClick={() => setActiveItem(item)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ContentViewerModal item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
