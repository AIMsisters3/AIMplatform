import React, { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';

export default function MyBookmarks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    api.get('/bookmarks')
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">My Bookmarks</h1>
      <p className="text-ink/60 mb-10">Everything you've saved for later, in one place.</p>

      {loading ? (
        <p className="text-ink/50">Loading bookmarks...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Bookmark className="w-12 h-12 mx-auto text-ink/20 mb-3" />
          <p className="text-ink/50">Nothing saved yet — tap the bookmark icon on any content to save it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => <ContentCard key={item.id} item={item} onClick={() => setActive(item)} />)}
        </div>
      )}

      {active && <ContentViewerModal item={active} onClose={() => setActive(null)} />}
    </div>
  );
}
