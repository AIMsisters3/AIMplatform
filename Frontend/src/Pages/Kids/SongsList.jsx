import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Music2, Inbox } from 'lucide-react';
import api from '../../api/axios.js';
import ContentCard from '../../Components/ContentCard.jsx';
import ContentViewerModal from '../../Components/ContentViewerModal.jsx';

// Unchanged legacy area (not part of this redesign) - same generic
// /kids?media_type=kids_song listing the old Kids.jsx page used, just
// given its own small page so it's still reachable from the new hub.
export default function SongsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    api.get('/kids', { params: { media_type: 'kids_song', limit: 100 } })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#FFF8EC' }}>
      <section className="bg-gradient-to-br from-pink-400 to-rose-500 pt-10 pb-14 px-6">
        <div className="max-w-5xl mx-auto">
          <Link to="/kids" className="inline-flex items-center gap-1.5 text-white/90 font-bold text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Little Lights
          </Link>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center shrink-0">
              <Music2 className="w-6 h-6 text-white" />
            </span>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">Kids Songs</h1>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 rounded-2xl bg-white/70 animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <Inbox className="w-10 h-10 text-ink/25 mb-3" />
            <p className="text-ink/50 font-medium">No songs yet - check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => <ContentCard key={item.id} item={item} onClick={() => setActive(item)} />)}
          </div>
        )}
      </div>

      <ContentViewerModal item={active} onClose={() => setActive(null)} />
    </div>
  );
}
