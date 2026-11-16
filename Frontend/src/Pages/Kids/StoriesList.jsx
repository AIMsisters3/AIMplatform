import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookHeart, ArrowLeft, Search, PlayCircle, Inbox } from 'lucide-react';
import api from '../../api/axios.js';

export default function StoriesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collection, setCollection] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/kids', { params: { media_type: 'bible_story', limit: 100 } })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const collections = useMemo(
    () => [...new Set(items.map((i) => i.tags).filter(Boolean))],
    [items]
  );
  const filtered = items.filter((i) => {
    if (collection && i.tags !== collection) return false;
    if (search.trim() && !i.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8EC' }}>
      <section className="bg-gradient-to-br from-orange-400 to-amber-500 pt-10 pb-14 px-6">
        <div className="max-w-5xl mx-auto">
          <Link to="/kids" className="inline-flex items-center gap-1.5 text-white/90 font-bold text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Little Lights
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center shrink-0">
              <BookHeart className="w-6 h-6 text-white" />
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">Bible Stories</h1>
          </div>
          <p className="text-white/90 font-medium">Pick a story to watch and learn!</p>

          <div className="relative mt-6 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stories..."
              className="w-full pl-11 pr-4 py-3 rounded-full border-0 shadow-md focus:outline-none focus:ring-4 focus:ring-white/40"
            />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {collections.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button onClick={() => setCollection('')} className={`px-4 py-2 rounded-full text-sm font-bold ${!collection ? 'bg-orange-500 text-white' : 'bg-white text-ink/60 shadow-sm'}`}>All</button>
            {collections.map((c) => (
              <button key={c} onClick={() => setCollection(c)} className={`px-4 py-2 rounded-full text-sm font-bold ${collection === c ? 'bg-orange-500 text-white' : 'bg-white text-ink/60 shadow-sm'}`}>{c}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 rounded-[1.75rem] bg-white/70 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <Inbox className="w-10 h-10 text-ink/25 mb-3" />
            <p className="text-ink/50 font-medium">{items.length === 0 ? 'No stories yet - check back soon!' : 'No stories match your search.'}</p>
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {filtered.map((s) => (
              <motion.div key={s.id} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
                <Link to={`/kids/stories/${s.slug}`} className="group block rounded-[1.75rem] overflow-hidden bg-white shadow-lg hover:-translate-y-1.5 hover:shadow-xl transition-all">
                  <div className="relative h-40 bg-gradient-to-br from-orange-200 to-amber-300 overflow-hidden">
                    {s.thumbnail ? (
                      <img src={s.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><BookHeart className="w-10 h-10 text-white/70" /></div>
                    )}
                    <span className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 flex items-center justify-center transition-colors">
                      <PlayCircle className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-bold text-ink leading-snug mb-1 line-clamp-1">{s.title}</h3>
                    {s.description && <p className="text-xs text-ink/50 line-clamp-2 mb-2">{s.description}</p>}
                    {s.bible_references && (
                      <span className="inline-block text-[11px] font-bold text-amber-600 bg-amber-50 rounded-full px-3 py-1">{s.bible_references}</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
