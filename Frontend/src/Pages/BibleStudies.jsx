import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';

export default function BibleStudies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/content', { params: { type: 'bible_study', limit: 24 } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Bible Studies</h1>
      <p className="text-ink/60 mb-10">Go deeper into God's Word with structured, verse-by-verse study guides.</p>

      {loading ? (
        <p className="text-ink/50">Loading studies...</p>
      ) : items.length === 0 ? (
        <p className="text-ink/50">No Bible studies published yet. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => <ContentCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
