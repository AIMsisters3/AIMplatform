import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Puzzle, ArrowLeft, Inbox } from 'lucide-react';
import api from '../../api/axios.js';

export default function ActivitiesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/activities', { params: { limit: 100 } })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8EC' }}>
      <section className="bg-gradient-to-br from-emerald-400 to-teal-500 pt-10 pb-14 px-6">
        <div className="max-w-5xl mx-auto">
          <Link to="/kids" className="inline-flex items-center gap-1.5 text-white/90 font-bold text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Little Lights
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center shrink-0">
              <Puzzle className="w-6 h-6 text-white" />
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">Bible Activities</h1>
          </div>
          <p className="text-white/90 font-medium">Play a quiz and see how much you know!</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-[1.75rem] bg-white/70 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <Inbox className="w-10 h-10 text-ink/25 mb-3" />
            <p className="text-ink/50 font-medium">No activities yet - check back soon!</p>
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {items.map((a) => (
              <motion.div key={a.id} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
                <Link to={`/kids/activities/${a.slug}`} className="group block rounded-[1.75rem] overflow-hidden bg-white shadow-lg hover:-translate-y-1.5 hover:shadow-xl transition-all p-6">
                  <span className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4">
                    <Puzzle className="w-7 h-7 text-white" />
                  </span>
                  <h3 className="font-display font-bold text-lg text-ink leading-snug mb-1">{a.title}</h3>
                  {a.description && <p className="text-xs text-ink/50 line-clamp-2 mb-2">{a.description}</p>}
                  <p className="text-[11px] font-bold text-emerald-600">{a.question_count} {a.question_count === 1 ? 'question' : 'questions'}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
