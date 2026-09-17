import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, PlayCircle, Search, Inbox } from 'lucide-react';
import api from '../api/axios.js';

export default function Series() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/series', { params: { search: search || undefined, limit: 24 } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-2xl bg-brand-gradient-soft flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5 text-secondary" />
        </span>
        <h1 className="text-3xl font-display font-bold text-ink">Series & Collections</h1>
      </div>
      <p className="text-ink/60 mb-8">Multi-part video series and animations, organized by season and episode.</p>

      <div className="relative w-full sm:w-96 mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search series..."
          className="w-full pl-11 pr-4 py-3 rounded-full border border-ink/10 bg-white shadow-glass focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl3 overflow-hidden bg-white/70 shadow-glass animate-pulse">
              <div className="h-44 bg-ink/10" />
              <div className="p-5 space-y-2">
                <div className="h-3 w-1/3 bg-ink/10 rounded-full" />
                <div className="h-4 w-4/5 bg-ink/10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center text-center py-20">
          <div className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center mb-4">
            <Inbox className="w-7 h-7 text-secondary" />
          </div>
          <h3 className="font-display font-semibold text-lg text-ink mb-1">No series published yet</h3>
          <p className="text-ink/50 text-sm max-w-xs">Check back soon for new multi-part stories and studies.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((s) => (
            <Link key={s.id} to={`/series/${s.slug}`} className="glass-card overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="relative h-44 bg-brand-gradient-soft flex items-center justify-center overflow-hidden">
                {s.cover_image ? (
                  <img src={s.cover_image} alt={s.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <Layers className="w-10 h-10 text-secondary" />
                )}
                <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-brand-gradient text-white text-xs font-semibold shadow-glass flex items-center gap-1">
                  <PlayCircle className="w-3.5 h-3.5" /> {s.episode_count} {Number(s.episode_count) === 1 ? 'Episode' : 'Episodes'}
                </span>
              </div>
              <div className="p-5">
                {s.category_name && (
                  <span className="inline-block text-xs font-semibold text-secondary uppercase tracking-wide mb-2">{s.category_name}</span>
                )}
                <h3 className="font-display font-semibold text-lg leading-snug mb-1 group-hover:text-secondary transition-colors">{s.title}</h3>
                {s.description && <p className="text-sm text-ink/60 line-clamp-2">{s.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
