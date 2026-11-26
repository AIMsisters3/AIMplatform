import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, BookOpen, Puzzle, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function KidsProgress() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get('/children/progress').then((r) => setData(r.data?.data || null)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6" style={{ backgroundColor: '#FFF8EC' }}>
        <p className="font-display font-bold text-xl text-ink">Sign in to see your progress!</p>
        <Link to="/login" className="px-6 py-3 rounded-full bg-violet-500 text-white font-bold shadow-lg">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#FFF8EC' }}>
      <section className="bg-gradient-to-br from-violet-500 to-fuchsia-500 pt-10 pb-14 px-6">
        <div className="max-w-3xl mx-auto">
          <Link to="/kids" className="inline-flex items-center gap-1.5 text-white/90 font-bold text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Little Lights
          </Link>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-white" />
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">My Progress</h1>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {loading ? (
          <p className="text-ink/50 text-center">Loading...</p>
        ) : !data || (data.lessons.length === 0 && data.activities.length === 0) ? (
          <div className="flex flex-col items-center text-center py-16">
            <p className="text-ink/50 font-medium mb-4">You haven't started any lessons or activities yet - let's go!</p>
            <Link to="/kids" className="px-6 py-3 rounded-full bg-violet-500 text-white font-bold shadow-lg">Explore Little Lights</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[1.75rem] bg-white shadow-lg p-6 text-center">
                <BookOpen className="w-7 h-7 text-sky-500 mx-auto mb-2" />
                <p className="font-display font-extrabold text-3xl text-ink">{data.lessons_completed}</p>
                <p className="text-ink/50 text-sm font-medium">Lessons Completed</p>
              </div>
              <div className="rounded-[1.75rem] bg-white shadow-lg p-6 text-center">
                <Puzzle className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                <p className="font-display font-extrabold text-3xl text-ink">{data.activities_completed}</p>
                <p className="text-ink/50 text-sm font-medium">Activities Tried</p>
              </div>
            </div>

            {data.activities.length > 0 && (
              <div>
                <h2 className="font-display font-bold text-lg text-ink mb-4">My Activity Scores</h2>
                <div className="space-y-2">
                  {data.activities.map((a) => (
                    <Link key={a.id} to={`/kids/activities/${a.slug}`} className="flex items-center justify-between rounded-2xl bg-white shadow-md p-4 hover:-translate-y-0.5 transition-transform">
                      <span className="font-bold text-ink">{a.title}</span>
                      <span className="flex items-center gap-3 text-sm font-bold shrink-0">
                        <span className="text-ink/40">Latest {a.latest_score}%</span>
                        <span className="text-emerald-600">Best {a.best_score}%</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.lessons.length > 0 && (
              <div>
                <h2 className="font-display font-bold text-lg text-ink mb-4">My Lessons</h2>
                <div className="space-y-2">
                  {data.lessons.map((l) => (
                    <Link key={l.id} to={`/kids/lessons/${l.slug}`} className="flex items-center justify-between rounded-2xl bg-white shadow-md p-4 hover:-translate-y-0.5 transition-transform">
                      <span className="font-bold text-ink">{l.title}</span>
                      {l.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm font-bold shrink-0"><CheckCircle2 className="w-4 h-4" /> Done</span>
                      ) : (
                        <span className="text-ink/40 text-sm font-bold shrink-0">In Progress</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
