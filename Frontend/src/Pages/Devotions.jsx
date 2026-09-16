import React, { useEffect, useState } from 'react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';

export default function Devotions() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => setCategories(r.data?.data?.items || []))
      .catch(() => setCategories([]));
    api.get('/languages')
      .then((r) => setLanguageOptions(r.data?.data?.items || []))
      .catch(() => setLanguageOptions([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/devotions', { params: { category_id: categoryId || undefined, language: language || undefined, limit: 24 } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [categoryId, language]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">Devotions</h1>
      <p className="text-ink/60 mb-8">Daily moments of reflection to nourish your walk with God.</p>

      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <option value="">All Languages</option>
          {languageOptions.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
      </div>

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
