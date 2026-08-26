import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, ArrowRight, BookOpen, Baby, HeartPulse, Shirt, Music, Users,
  ScrollText, Eye, PlayCircle, FileText, Headphones, Inbox, Globe,
} from 'lucide-react';
import api from '../api/axios.js';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import { getItemKind } from '../utils/mediaKind.js';
import contentBg from '../assets/content_bg.png';
import heroGirl from '../assets/hero-girl.png';

// Display order + icon/color per category. Bible Studies deliberately
// excluded — it has its own dedicated page.
const CATEGORY_META = {
  'Children Ministry': { icon: Baby, tagline: 'Fun & Faith for Kids', bg: 'bg-violet-100', text: 'text-violet-600' },
  'Health Reform':     { icon: HeartPulse, tagline: 'Wellness & Godly Living', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  'Dress Reform':      { icon: Shirt, tagline: 'Modesty & Godly Life', bg: 'bg-orange-100', text: 'text-orange-600' },
  'Sabbath School':    { icon: BookOpen, tagline: 'A Better Life Through Christ', bg: 'bg-pink-100', text: 'text-pink-600' },
  'Music':             { icon: Music, tagline: 'Uplifting Gospel Sounds', bg: 'bg-blue-100', text: 'text-blue-600' },
  'Prophecy':          { icon: ScrollText, tagline: 'Bible Wisdom for Today', bg: 'bg-rose-100', text: 'text-rose-600' },
  'Youth Ministry':    { icon: Users, tagline: 'Growing Strong in Christ', bg: 'bg-sky-100', text: 'text-sky-600' },
};

const CATEGORY_ORDER = ['Children Ministry', 'Health Reform', 'Dress Reform', 'Sabbath School', 'Music', 'Prophecy', 'Youth Ministry'];
const EXCLUDED_CATEGORIES = ['bible studies', 'bible study', 'devotions', 'gallery', 'news', 'testimonies'];

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
  const meta = CATEGORY_META[item.category_name] || { bg: 'bg-surface', text: 'text-secondary' };

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6 }}
      onClick={onClick}
      className="glass-card overflow-hidden cursor-pointer group"
    >
      <div className="relative h-36 bg-brand-gradient-soft overflow-hidden">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl brand-gradient-text font-display font-bold">AIM</span>
          </div>
        )}
      </div>
      <div className="p-4">
        {item.category_name && (
          <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2 ${meta.bg} ${meta.text}`}>
            {item.category_name}
          </span>
        )}
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
          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xl brand-gradient-text font-display font-bold">AIM</span>
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-ink mt-2 line-clamp-1">{item.title}</p>
      {item.category_name && <p className="text-[11px] text-ink/45">{item.category_name}</p>}
    </motion.div>
  );
}

export default function Content() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(sortCategories(r.data?.data?.items || [])))
      .catch(() => setCategories([]));
    api.get('/languages')
      .then((r) => setLanguageOptions(r.data?.data?.items || []))
      .catch(() => setLanguageOptions([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/content', { params: { search: search || undefined, category_id: categoryId || undefined, limit: 24 } })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search, categoryId]);

  useEffect(() => {
    const slug = searchParams.get('item');
    if (!slug) return;
    api.get(`/content/${slug}`)
      .then((r) => { if (r.data?.data?.item) setActiveItem(r.data.data.item); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    let list = Array.isArray(items) ? items : [];
    if (language) list = list.filter((item) => item.language === language);
    return list;
  }, [items, language]);

  const featuredItems = useMemo(() => {
    const featured = filteredItems.filter((i) => Number(i.is_featured) === 1);
    return (featured.length > 0 ? featured : filteredItems).slice(0, 4);
  }, [filteredItems]);

  const popularItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
  }, [filteredItems]);

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

  {/* Search bar: normal full-width block on phones/tablets, absolute-positioned beside the girl on large screens */}
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.25, duration: 0.5 }}
    className="relative mt-6 px-6 max-w-7xl mx-auto lg:mt-0 lg:px-0 lg:max-w-none lg:mx-0 lg:absolute lg:z-20 lg:left-10 lg:right-52 lg:bottom-0"
  >
    <form onSubmit={(e) => e.preventDefault()} className="relative w-full">
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
  </motion.div>
</section>

      <div className="max-w-7xl mx-auto px-6 py-10">
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

        {/* Browse by Category */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.05 }} className="mb-10">
          <h2 className="text-lg font-display font-bold text-ink mb-4">Browse by Category</h2>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3"
            initial="hidden" animate="visible" variants={staggerContainer}
          >
           {categories.map((cat) => {
              const meta = CATEGORY_META[cat.name] || { icon: ScrollText, tagline: '', bg: 'bg-surface', text: 'text-secondary' };
              const Icon = meta.icon;
              const active = categoryId === String(cat.id);
              return (
                <motion.button
                  key={cat.id}
                  variants={fadeUp}
                  whileHover={{ y: -3 }}
                  onClick={() => setCategoryId(active ? '' : String(cat.id))}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl text-center transition ${
                    active ? 'bg-brand-gradient shadow-glass' : `${meta.bg} hover:shadow-glass`
                  }`}
                >
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${active ? 'bg-white/20' : 'bg-white'}`}>
                    <Icon className={`w-5 h-5 ${active ? 'text-white' : meta.text}`} />
                  </span>
                  <span className={`text-xs font-bold ${active ? 'text-white' : 'text-ink'}`}>
                    {cat.name}
                  </span>
                  {meta.tagline && (
                    <span className={`text-[10px] leading-tight ${active ? 'text-white/75' : 'text-ink/45'}`}>
                      {meta.tagline}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white/70 shadow-glass animate-pulse">
                <div className="h-36 bg-ink/10" />
                <div className="p-4 space-y-2">
                  <div className="h-3 w-1/2 bg-ink/10 rounded-full" />
                  <div className="h-4 w-4/5 bg-ink/10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col items-center text-center py-20">
            <div className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="font-display font-semibold text-lg text-ink mb-1">No content found</h3>
            <p className="text-ink/50 text-sm mb-5 max-w-xs">Try a different search, category, or language.</p>
            <button
              onClick={() => { setSearch(''); setCategoryId(''); setLanguage(''); }}
              className="px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass"
            >
              Reset filters
            </button>
          </motion.div>
        ) : (
          <>
            {/* Featured Content */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-bold text-ink">Featured Content</h2>
              </div>
              <motion.div
                key={`featured-${search}-${categoryId}-${language}`}
                className="grid grid-cols-2 md:grid-cols-4 gap-5"
                initial="hidden" animate="visible" variants={staggerContainer}
              >
                {featuredItems.map((item) => (
                  <FeaturedCard key={item.id} item={item} onClick={() => openItem(item)} />
                ))}
              </motion.div>
            </div>

            {/* Popular This Week */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-display font-bold text-ink">Popular This Week</h2>
                  <p className="text-xs text-ink/45">See what others are watching and enjoying.</p>
                </div>
                <button className="flex items-center gap-1 text-xs font-semibold text-secondary">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <motion.div
                key={`popular-${search}-${categoryId}-${language}`}
                className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
                initial="hidden" animate="visible" variants={staggerContainer}
              >
                {popularItems.map((item, i) => (
                  <PopularItem key={item.id} item={item} rank={i + 1} onClick={() => openItem(item)} />
                ))}
              </motion.div>
            </div>
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