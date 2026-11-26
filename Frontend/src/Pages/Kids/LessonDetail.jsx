import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Quote, Lightbulb, HelpCircle, BookHeart, Puzzle, CheckCircle2, PartyPopper } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LessonDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setCompleted(false);
    api.get(`/lessons/${slug}`)
      .then((r) => setItem(r.data.data.item))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [slug]);

  async function markComplete() {
    if (!user || !item) return;
    setSaving(true);
    try {
      await api.post(`/lessons/${item.id}/progress`, { status: 'completed', progress_percent: 100 });
      setCompleted(true);
    } catch {
      // Silently stays unmarked - the button remains clickable to retry.
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8EC' }}><div className="w-10 h-10 rounded-full border-4 border-sky-300 border-t-sky-500 animate-spin" /></div>;
  }
  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#FFF8EC' }}>
        <p className="text-ink/50 font-medium">We couldn't find that lesson.</p>
        <Link to="/kids/lessons" className="px-5 py-2.5 rounded-full bg-sky-500 text-white font-bold text-sm">Back to Lessons</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#FFF8EC' }}>
      <div className="relative h-56 sm:h-64 bg-gradient-to-br from-sky-400 to-blue-500 overflow-hidden">
        {item.cover_image && <img src={item.cover_image} alt="" className="absolute inset-0 w-full h-full object-contain opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFF8EC] via-transparent to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-6 h-full flex flex-col justify-between">
          <Link to="/kids/lessons" className="inline-flex items-center gap-1.5 text-white font-bold text-sm w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Lessons
          </Link>
          <div className="pb-6">
            {item.topic && <span className="text-xs font-bold text-white/90 uppercase tracking-wide">{item.topic}</span>}
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white leading-tight">{item.title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-4 relative z-10 space-y-6">
        {item.intro && (
          <div className="rounded-[1.75rem] bg-white shadow-lg p-6 sm:p-8">
            <p className="text-ink/70 leading-relaxed text-lg">{item.intro}</p>
          </div>
        )}

        {item.key_verse_text && (
          <div className="rounded-[1.75rem] bg-gradient-to-br from-violet-100 to-fuchsia-100 p-6 sm:p-8">
            <Quote className="w-6 h-6 text-violet-400 mb-2" />
            <p className="italic text-ink/80 text-lg leading-relaxed mb-2">"{item.key_verse_text}"</p>
            {item.key_verse_reference && <p className="font-bold text-violet-600 text-sm">{item.key_verse_reference}</p>}
          </div>
        )}

        {item.sections?.map((s, i) => (
          <div key={i} className="rounded-[1.75rem] bg-white shadow-lg p-6 sm:p-8">
            {s.heading && <h2 className="font-display font-bold text-xl text-ink mb-3">{s.heading}</h2>}
            {s.body && <p className="text-ink/70 leading-relaxed whitespace-pre-line mb-4">{s.body}</p>}
            {s.image_url && <img src={s.image_url} alt="" className="w-full rounded-2xl mb-4" />}
            {s.video_url && <video controls className="w-full rounded-2xl aspect-video bg-black" src={s.video_url} />}
          </div>
        ))}

        {item.key_points?.length > 0 && (
          <div className="rounded-[1.75rem] bg-amber-50 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h2 className="font-display font-bold text-lg text-ink">Things to Remember</h2>
            </div>
            <ul className="space-y-2">
              {item.key_points.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-ink/70">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" /> {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.reflection_questions?.length > 0 && (
          <div className="rounded-[1.75rem] bg-sky-50 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-sky-500" />
              <h2 className="font-display font-bold text-lg text-ink">Think About It</h2>
            </div>
            <ul className="space-y-2">
              {item.reflection_questions.map((q, i) => <li key={i} className="text-ink/70">{q}</li>)}
            </ul>
          </div>
        )}

        {item.related_stories?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookHeart className="w-5 h-5 text-orange-500" />
              <h2 className="font-display font-bold text-lg text-ink">Related Bible Stories</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {item.related_stories.map((s) => (
                <Link key={s.id} to={`/kids/stories/${s.slug}`} className="rounded-2xl bg-white shadow-md p-3 hover:-translate-y-1 transition-transform">
                  <p className="text-sm font-bold text-ink line-clamp-2">{s.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {item.activities?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Puzzle className="w-5 h-5 text-emerald-500" />
              <h2 className="font-display font-bold text-lg text-ink">Activities for This Lesson</h2>
            </div>
            <div className="space-y-3">
              {item.activities.map((a) => (
                <Link key={a.id} to={`/kids/activities/${a.slug}`} className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 p-5 shadow-md hover:-translate-y-0.5 transition-transform">
                  <div>
                    <p className="font-display font-bold text-white">{a.title}</p>
                    <p className="text-white/80 text-xs">{a.question_count} {a.question_count === 1 ? 'question' : 'questions'}</p>
                  </div>
                  <span className="px-4 py-2 rounded-full bg-white/25 text-white font-bold text-xs shrink-0">Play →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 text-center">
          {!user ? (
            <p className="text-ink/40 text-sm">Sign in to save your progress on this lesson.</p>
          ) : completed ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 text-white font-bold">
              <PartyPopper className="w-5 h-5" /> Lesson Complete! Great job!
            </div>
          ) : (
            <button onClick={markComplete} disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold shadow-lg disabled:opacity-60">
              <CheckCircle2 className="w-5 h-5" /> {saving ? 'Saving...' : "I've Finished This Lesson!"}
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
