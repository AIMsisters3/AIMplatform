import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/gallery', { params: { limit: 40 } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Gallery</h1>
      <p className="text-ink/60 mb-10">Moments captured from ministry events, services, and outreach.</p>

      {loading ? (
        <p className="text-ink/50">Loading gallery...</p>
      ) : items.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl2 bg-brand-gradient-soft" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="aspect-square rounded-xl2 overflow-hidden bg-brand-gradient-soft">
              {item.thumbnail && <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
