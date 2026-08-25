import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const FORMATS = [
  { value: '', label: 'All Formats' },
  { value: 'short_film', label: 'Short Film' },
  { value: 'video', label: 'Video' },
  { value: 'sermon', label: 'Sermon' },
  { value: 'panel', label: 'Panel Discussion' },
  { value: 'audio', label: 'Audio' },
  { value: 'animated', label: 'Animated' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'pdf_notes', label: 'PDF / Notes' },
];

export default function BibleStudies() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [continuing, setContinuing] = useState([]);
  const [format, setFormat] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/bible-studies', { params: { format: format || undefined, search: search || undefined, limit: 24 } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [format, search]);

  useEffect(() => {
    if (!user) { setContinuing([]); return; }
    api.get('/bible-studies/continue').then((r) => setContinuing(r.data.data.items)).catch(() => setContinuing([]));
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Bible Studies</h1>
      <p className="text-ink/60 mb-8">Go deeper into God's Word with structured, verse-by-verse study guides.</p>

      {continuing.length > 0 && (
        <div className="mb-12">
          <h2 className="font-display font-semibold text-lg mb-4">Continue Studying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {continuing.map((item) => (
              <Link key={item.id} to={`/bible-studies/${item.slug}`} className="glass-card p-5 hover:-translate-y-1 transition-transform">
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden mb-1">
                  <div className="h-full bg-brand-gradient rounded-full" style={{ width: `${item.progress_percent}%` }} />
                </div>
                <p className="text-xs text-ink/40">{item.progress_percent}% complete</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Bible studies..."
          className="flex-1 px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading studies...</p>
      ) : items.length === 0 ? (
        <p className="text-ink/50">No Bible studies published yet. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link key={item.id} to={`/bible-studies/${item.slug}`}>
              <ContentCard item={item} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
