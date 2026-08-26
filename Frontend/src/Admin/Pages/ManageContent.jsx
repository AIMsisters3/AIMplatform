import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios.js';

const SECTIONS = [
  { value: '', label: 'All Sections' },
  { value: 'media_library', label: 'Content / Media Library' },
  { value: 'news', label: 'News' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'bible_study', label: 'Bible Study' },
  { value: 'devotions', label: 'Devotions' },
];

const STATUS_BADGE = {
  draft: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-sky-100 text-sky-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-ink/10 text-ink/50',
};

function sectionLabel(value) {
  return SECTIONS.find((s) => s.value === value)?.label || value;
}

export default function ManageContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table'); // table | grid
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/content', { params: { search: search || undefined, section: section || undefined, status: 'all', page, limit: 12 } })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [search, section, page]);

  useEffect(() => { load(); }, [load]);

  function toggleSelect(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function bulkAction(action) {
    if (selected.length === 0) return;
    try {
      await api.post('/content/bulk', { action, ids: selected });
      setMessage(`Bulk ${action} applied to ${selected.length} item(s).`);
      setSelected([]);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Bulk action failed.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this content item? This cannot be undone.')) return;
    await api.delete(`/content/${id}`);
    load();
  }

  async function handleDuplicate(id) {
    await api.post(`/content/${id}/duplicate`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Manage Content</h2>
        <div className="flex gap-2">
          <button onClick={() => setView('table')} className={`px-4 py-2 rounded-xl2 text-xs font-semibold ${view === 'table' ? 'bg-brand-gradient text-white' : 'glass-card'}`}>Table View</button>
          <button onClick={() => setView('grid')} className={`px-4 py-2 rounded-xl2 text-xs font-semibold ${view === 'grid' ? 'bg-brand-gradient text-white' : 'glass-card'}`}>Grid View</button>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col md:flex-row gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search content..."
          className="flex-1 px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
        <select value={section} onChange={(e) => setSection(e.target.value)}
          className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
          {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {selected.length > 0 && (
        <div className="glass-card p-4 flex items-center gap-3 text-sm">
          <span className="font-semibold">{selected.length} selected</span>
          <button onClick={() => bulkAction('publish')} className="px-4 py-2 rounded-xl2 bg-emerald-500 text-white text-xs font-semibold">Bulk Publish</button>
          <button onClick={() => bulkAction('archive')} className="px-4 py-2 rounded-xl2 bg-ink/70 text-white text-xs font-semibold">Bulk Archive</button>
          <button onClick={() => bulkAction('delete')} className="px-4 py-2 rounded-xl2 bg-red-500 text-white text-xs font-semibold">Bulk Delete</button>
        </div>
      )}

      {message && <p className="text-sm text-secondary">{message}</p>}

      {loading ? (
        <p className="text-ink/50">Loading content...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">No content matches your filters yet.</div>
      ) : view === 'table' ? (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-ink/10">
                <th className="p-4"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? items.map((i) => i.id) : [])} /></th>
                <th className="p-4">Title</th>
                <th className="p-4">Section</th>
                <th className="p-4">Media Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Views</th>
                <th className="p-4">Updated</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-ink/5 hover:bg-white/50">
                  <td className="p-4"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                  <td className="p-4 font-medium">{item.title}</td>
                  <td className="p-4 capitalize text-ink/60">{sectionLabel(item.section)}</td>
                  <td className="p-4 capitalize text-ink/60">{item.media_type?.replace('_', ' ')}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[item.status] || 'bg-ink/10'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-ink/60">{item.views ?? 0}</td>
                  <td className="p-4 text-ink/40 text-xs">{item.updated_at?.slice(0, 10)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2 text-xs font-semibold">
                      <button onClick={() => handleDuplicate(item.id)} className="text-secondary">Duplicate</button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-500">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="glass-card p-5">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[item.status] || 'bg-ink/10'}`}>{item.status}</span>
                <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} />
              </div>
              <h4 className="font-semibold mb-1">{item.title}</h4>
              <p className="text-xs text-ink/50 capitalize mb-3">{sectionLabel(item.section)} &middot; {item.media_type?.replace('_', ' ')}</p>
              <div className="flex gap-3 text-xs font-semibold">
                <button onClick={() => handleDuplicate(item.id)} className="text-secondary">Duplicate</button>
                <button onClick={() => handleDelete(item.id)} className="text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-2">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-4 py-2 rounded-xl2 glass-card text-sm font-semibold">Previous</button>
        <span className="px-4 py-2 text-sm">Page {page}</span>
        <button onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-xl2 glass-card text-sm font-semibold">Next</button>
      </div>
    </div>
  );
}
