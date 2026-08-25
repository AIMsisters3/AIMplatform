import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, PlayCircle } from 'lucide-react';
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
      <h1 className="text-3xl font-bold mb-2">Series</h1>
      <p className="text-ink/60 mb-8">Multi-part video series and animations, organized by season and episode.</p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search series..."
        className="w-full sm:w-96 px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary mb-10"
      />

      {loading ? (
        <p className="text-ink/50">Loading series...</p>
      ) : items.length === 0 ? (
        <p className="text-ink/50">No series published yet. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((s) => (
            <Link key={s.id} to={`/series/${s.slug}`} className="glass-card overflow-hidden group hover:-translate-y-1 transition-transform">
              <div className="relative h-44 bg-brand-gradient-soft flex items-center justify-center overflow-hidden">
                {s.cover_image ? (
                  <img src={s.cover_image} alt={s.title} className="w-full h-full object-cover" />
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
