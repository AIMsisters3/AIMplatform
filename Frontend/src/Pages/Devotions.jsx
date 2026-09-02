import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';

export default function Devotions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    api.get('/devotions', { params: { limit: 24 } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Devotions</h1>
      <p className="text-ink/60 mb-10">Daily moments of reflection to nourish your walk with God.</p>

      {loading ? (
        <p className="text-ink/50">Loading devotions...</p>
      ) : items.length === 0 ? (
        <p className="text-ink/50">No devotions published yet. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => <ContentCard key={item.id} item={item} onClick={() => setActiveItem(item)} />)}
        </div>
      )}

      <ContentViewerModal item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
