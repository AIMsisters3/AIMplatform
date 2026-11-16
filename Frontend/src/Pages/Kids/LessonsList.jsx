import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, Inbox, Puzzle } from 'lucide-react';
import api from '../../api/axios.js';

export default function LessonsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/lessons', { params: { limit: 100 } })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const topics = useMemo(() => [...new Set(items.map((i) => i.topic).filter(Boolean))], [items]);
  const filtered = topic ? items.filter((i) => i.topic === topic) : items;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8EC' }}>
      <section className="bg-gradient-to-br from-sky-400 to-blue-500 pt-10 pb-14 px-6">
        <div className="max-w-5xl mx-auto">
          <Link to="/kids" className="inline-flex items-center gap-1.5 text-white/90 font-bold text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Little Lights
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">Bible Lessons</h1>
          </div>
          <p className="text-white/90 font-medium">Learn something new about God today!</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button onClick={() => setTopic('')} className={`px-4 py-2 rounded-full text-sm font-bold ${!topic ? 'bg-sky-500 text-white' : 'bg-white text-ink/60 shadow-sm'}`}>All</button>
            {topics.map((t) => (
              <button key={t} onClick={() => setTopic(t)} className={`px-4 py-2 rounded-full text-sm font-bold ${topic === t ? 'bg-sky-500 text-white' : 'bg-white text-ink/60 shadow-sm'}`}>{t}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 rounded-[1.75rem] bg-white/70 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <Inbox className="w-10 h-10 text-ink/25 mb-3" />
            <p className="text-ink/50 font-medium">No lessons yet - check back soon!</p>
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {filtered.map((l) => (
              <motion.div key={l.id} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
                <Link to={`/kids/lessons/${l.slug}`} className="group block rounded-[1.75rem] overflow-hidden bg-white shadow-lg hover:-translate-y-1.5 hover:shadow-xl transition-all">
                  <div className="relative h-32 bg-gradient-to-br from-sky-200 to-blue-300">
                    {l.cover_image ? (
                      <img src={l.cover_image} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-9 h-9 text-white/70" /></div>
                    )}
                  </div>
                  <div className="p-4">
                    {l.topic && <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wide">{l.topic}</span>}
                    <h3 className="font-display font-bold text-ink leading-snug line-clamp-1 mt-0.5">{l.title}</h3>
                    {l.activities_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 mt-2">
                        <Puzzle className="w-3 h-3" /> {l.activities_count} {l.activities_count === 1 ? 'activity' : 'activities'}
                      </span>
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
