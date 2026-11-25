import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Heart, Pin, PinOff, EyeOff, ExternalLink, Inbox } from 'lucide-react';
import api from '../../../api/axios.js';

export default function FeaturedTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/bible-studies/featured-admin').then((r) => r.data?.data?.items || []),
      api.get('/settings/bible-study').then((r) => r.data?.data?.items || {}),
    ])
      .then(([list, s]) => { setItems(list); setSettings(s); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleExclude(item) {
    await api.post(`/bible-studies/${item.id}/featured-exclude`, { excluded: !item.featured_excluded });
    load();
  }

  async function pin(item) {
    const hours = prompt('Pin to Featured Studies for how many hours?', '24');
    if (!hours) return;
    await api.post(`/bible-studies/${item.id}/featured-pin`, { hours: Number(hours) });
    setMessage(`Pinned "${item.title}".`);
    load();
  }

  async function unpin(item) {
    await api.post(`/bible-studies/${item.id}/featured-pin`, { hours: null });
    load();
  }

  const minViews = settings ? (Number(settings['bible_study.featured_min_views']) || 10) : 10;
  const minLikes = settings ? (Number(settings['bible_study.featured_min_likes']) || 5) : 5;
  const limit = settings ? (Number(settings['bible_study.featured_limit']) || 8) : 8;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-semibold text-lg">Featured Studies</h3>
        <p className="text-sm text-ink/50 mt-1">
          Ranked automatically by views + likes. Eligible once a study reaches {minViews} views and {minLikes} likes (or is pinned) - showing up to {limit} at a time on the public page.
          Change these thresholds in the Settings tab.
        </p>
      </div>

      {message && <p className="text-sm text-secondary">{message}</p>}

      {loading ? (
        <p className="text-ink/50">Loading...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Inbox className="w-8 h-8 text-ink/25 mx-auto mb-3" />
          <p className="text-ink/50">No published Bible Studies yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const eligible = item.is_pinned || (item.views >= minViews && item.likes_count >= minLikes);
            const showing = !item.featured_excluded && eligible && i < limit;
            return (
              <div key={item.id} className="glass-card p-4 flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-bold text-ink/40 shrink-0">#{item.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate flex items-center gap-2">
                    {item.title}
                    {item.is_pinned && <span className="text-[10px] font-bold uppercase tracking-wide text-accent flex items-center gap-1"><Pin className="w-3 h-3" /> Pinned</span>}
                  </p>
                  <p className="text-xs text-ink/50 flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.views}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {item.likes_count}</span>
                    <span className={showing ? 'text-emerald-600 font-semibold' : 'text-ink/40'}>
                      {item.featured_excluded ? 'Excluded' : showing ? 'Showing in Featured' : eligible ? 'Eligible, not shown (limit reached)' : 'Below threshold'}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a href={`/bible-studies/${item.slug}`} target="_blank" rel="noopener noreferrer" title="Preview" className="text-ink/50 hover:text-secondary">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {item.is_pinned ? (
                    <button onClick={() => unpin(item)} title="Unpin" className="text-accent hover:text-ink/50"><PinOff className="w-4 h-4" /></button>
                  ) : (
                    <button onClick={() => pin(item)} title="Pin temporarily" className="text-ink/50 hover:text-accent"><Pin className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => toggleExclude(item)} title={item.featured_excluded ? 'Restore eligibility' : 'Exclude from Featured'} className="text-ink/50 hover:text-secondary">
                    {item.featured_excluded ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
