import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Baby, BookHeart, BookOpen, Sparkles, Music2, Palette, Star, Search,
  Inbox, PlayCircle,
} from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

// Kids' own vocabulary (mirrors ContentController::SECTION_MEDIA_TYPES['kids'])
// — deliberately bright/distinct colors per type, not the site's usual
// purple/blue brand palette, so this area visually reads as "made for
// kids" the moment it loads, per the spec's "not just another category".
// Simplified by migration 025: Cartoons/"More Fun" removed as their own
// choices (existing items of either kind now live under Activities).
// Songs use media_type 'kids_song', not the general Songs section's
// 'song' — a Kids song can be Video OR Audio, unlike general Songs.
const KIDS_TYPE_GROUPS = [
  { value: 'bible_story', label: 'Bible Stories', icon: BookHeart, color: 'from-amber-400 to-orange-500' },
  { value: 'bible_lesson', label: 'Bible Lessons', icon: BookOpen, color: 'from-sky-400 to-blue-500' },
  { value: 'kids_song', label: 'Songs', icon: Music2, color: 'from-emerald-400 to-teal-500' },
  { value: 'activity', label: 'Activities', icon: Palette, color: 'from-violet-400 to-purple-500' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// A handful of soft floating shapes drifting behind the hero — purely
// decorative "cartoon" polish (spec: "distinctly playful... cartoon
// decorations, bright colors, rounded UI, animations") with no semantic
// content, so it's safe to render before anything has loaded.
const FLOATING_SHAPES = [
  { size: 16, top: '12%', left: '8%', delay: 0 },
  { size: 10, top: '68%', left: '14%', delay: 0.6 },
  { size: 20, top: '20%', left: '88%', delay: 0.3 },
  { size: 12, top: '72%', left: '90%', delay: 0.9 },
  { size: 8, top: '40%', left: '48%', delay: 1.2 },
];

export default function Kids() {
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);

  const isFiltering = Boolean(search || mediaType);

  useEffect(() => {
    setLoading(true);
    api.get('/kids', {
      params: {
        search: search || undefined,
        language,
        media_type: mediaType || undefined,
        // Unfiltered: pull enough to populate every type group below.
        limit: isFiltering ? 24 : 100,
      },
    })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search, language, mediaType, isFiltering]);

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
        {FLOATING_SHAPES.map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/25 pointer-events-none"
            style={{ width: s.size, height: s.size, top: s.top, left: s.left }}
            animate={{ y: [0, -14, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
          />
        ))}
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <motion.span
              className="inline-flex w-16 h-16 rounded-full bg-white/20 items-center justify-center mb-4"
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
            >
              <Baby className="w-8 h-8 text-white" />
            </motion.span>
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white mb-3">
              AIMsisters Children's Zone
            </h1>
            <p className="text-white/90 text-base sm:text-lg max-w-xl mx-auto">
              Bible stories, lessons, songs, and fun activities made just for children.
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
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition hover:scale-105 active:scale-95 ${
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
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap text-white bg-gradient-to-r hover:scale-105 active:scale-95 ${g.color} ${
                  active ? 'ring-2 ring-offset-2 ring-ink/20' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <g.icon className="w-3.5 h-3.5" /> {g.label}
              </button>
            );
          })}
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
            <p className="text-ink/50 text-sm max-w-xs">New stories, songs, and activities for children are on the way — check back soon!</p>
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
