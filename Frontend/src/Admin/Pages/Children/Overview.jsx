import React, { useEffect, useState } from 'react';
import { BookHeart, BookOpen, Puzzle, Trophy } from 'lucide-react';
import api from '../../../api/axios.js';
import StatCard from '../../Components/StatCard.jsx';

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/children/stats')
      .then((r) => setStats(r.data?.data || null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-ink/50">Loading overview...</p>;
  if (!stats) return <p className="text-ink/50">Could not load statistics.</p>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={<BookHeart className="w-5 h-5 text-secondary" />} label="Bible Stories" value={stats.stories.total} trend={`${stats.stories.published} published`} />
        <StatCard icon={<BookOpen className="w-5 h-5 text-secondary" />} label="Bible Lessons" value={stats.lessons.total} trend={`${stats.lessons.published} published`} />
        <StatCard icon={<Puzzle className="w-5 h-5 text-secondary" />} label="Bible Activities" value={stats.activities.total} trend={`${stats.activities.published} published`} />
        <StatCard icon={<Trophy className="w-5 h-5 text-secondary" />} label="Activity Attempts" value={stats.attempts.total} trend={`avg ${stats.attempts.average_score}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold mb-4">Most Completed Activities</h3>
          {stats.most_completed_activities.length === 0 ? (
            <p className="text-sm text-ink/40">No attempts recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.most_completed_activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate pr-3">{a.title}</span>
                  <span className="text-ink/50 shrink-0">{a.attempt_count} attempts · avg {a.average_score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-display font-semibold mb-4">Most Viewed Stories</h3>
          {stats.most_viewed_stories.length === 0 ? (
            <p className="text-sm text-ink/40">No stories published yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.most_viewed_stories.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate pr-3">{s.title}</span>
                  <span className="text-ink/50 shrink-0">{s.views} views</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
