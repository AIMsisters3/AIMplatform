import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronDown, Circle, Lock } from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ReadingPlanDetail() {
  const { slugOrId } = useParams();
  const { user } = useAuth();

  const [plan, setPlan] = useState(null);
  const [days, setDays] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDay, setOpenDay] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/reading-plans/${slugOrId}`)
      .then((r) => {
        setPlan(r.data.data.item);
        setDays(r.data.data.days);
        setProgress(r.data.data.progress);
      })
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, [slugOrId]);

  useEffect(() => { load(); }, [load]);

  const currentDay = progress ? progress.current_day : 1;
  const completed = !!progress?.completed_at;

  async function markDayComplete(dayNumber) {
    if (!plan || saving) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/reading-plans/${plan.id}/progress`, { day_number: dayNumber });
      setProgress(data.data.progress);
    } catch {
      // Silently ignored - a stale/out-of-order click simply has no
      // effect server-side (ReadingPlan::completeDay), nothing to recover.
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="h-56 rounded-xl3 bg-white/70 shadow-glass animate-pulse mb-10" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl2 bg-white/70 shadow-glass animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-ink/50">
        Reading plan not found. <Link to="/bible-studies" className="text-secondary font-semibold">Back to Bible Studies</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/bible-studies" className="inline-flex items-center gap-1.5 text-sm text-secondary font-semibold mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Bible Studies
      </Link>

      <div className="relative rounded-xl3 overflow-hidden mb-10 shadow-glass">
        {/* aspect-video + object-contain shows the whole cover, never cropped. */}
        <div className="aspect-video bg-ink flex items-center justify-center overflow-hidden">
          {plan.cover_image ? (
            <img src={plan.cover_image} alt={plan.title} className="w-full h-full object-contain" />
          ) : (
            <CalendarDays className="w-14 h-14 text-secondary" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
          <span className="inline-flex px-3 py-1 rounded-full bg-brand-gradient text-white text-[11px] font-semibold mb-2">
            {days.length} {days.length === 1 ? 'Day' : 'Days'}
          </span>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 break-words">{plan.title}</h1>
          {plan.description && <p className="text-white/80 text-sm md:text-base max-w-2xl line-clamp-2">{plan.description}</p>}
        </div>
      </div>

      {user ? (
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Your Progress</h3>
            {completed ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Plan Completed
              </span>
            ) : (
              <span className="text-sm text-ink/50">Day {Math.min(currentDay, days.length)} of {days.length}</span>
            )}
          </div>
          <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
            <div
              className="h-full bg-brand-gradient rounded-full transition-all"
              style={{ width: `${Math.round((Math.min(currentDay - 1, days.length) / Math.max(days.length, 1)) * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink/50 mb-8">
          <Link to="/login" className="text-secondary font-semibold">Sign in</Link> to track your progress through this plan day by day.
        </p>
      )}

      <div className="space-y-3">
        {days.map((day, idx) => {
          const dayNumber = idx + 1;
          const isOpen = openDay === dayNumber;
          const isDone = user && dayNumber < currentDay;
          const isCurrent = user && dayNumber === currentDay && !completed;
          const isLocked = user && dayNumber > currentDay;

          return (
            <div key={day.id} className="glass-card overflow-hidden">
              <button
                onClick={() => setOpenDay(isOpen ? null : dayNumber)}
                className="w-full p-4 flex items-center gap-4 text-left"
              >
                <span className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : isLocked ? (
                    <Lock className="w-5 h-5 text-ink/25" />
                  ) : (
                    <Circle className={`w-6 h-6 ${isCurrent ? 'text-secondary' : 'text-ink/20'}`} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-secondary mb-0.5">Day {dayNumber}</p>
                  <h4 className="font-semibold truncate">{day.title || `Day ${dayNumber}`}</h4>
                  {day.bible_references && <p className="text-xs text-ink/50 mt-0.5">📖 {day.bible_references}</p>}
                </div>
                <ChevronDown className={`w-4 h-4 text-ink/40 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pl-14 space-y-3">
                  {day.body && <p className="text-sm text-ink/70 whitespace-pre-line">{day.body}</p>}
                  {isCurrent && (
                    <button
                      onClick={() => markDayComplete(dayNumber)}
                      disabled={saving}
                      className="px-5 py-2 rounded-full bg-brand-gradient text-white text-xs font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Mark Day Complete'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
