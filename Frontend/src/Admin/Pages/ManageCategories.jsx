import React, { useCallback, useEffect, useState } from 'react';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import api from '../../api/axios.js';

export default function ManageCategories() {
  const [type, setType] = useState('content');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/categories', { params: { type } })
      .then((r) => setCategories(r.data.data.items || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setParentId(''); }, [type]);

  const topLevel = categories.filter((c) => !c.parent_id);
  const childrenOf = (id) => categories.filter((c) => String(c.parent_id) === String(id));

  async function addCategory(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      await api.post('/categories', { name: name.trim(), type, description: description.trim() || null, parent_id: parentId || null });
      setName('');
      setDescription('');
      setParentId('');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not create category.');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeCategory(cat) {
    if (!window.confirm(`Delete "${cat.name}"? Content already using this category will keep showing but lose its category tag.`)) return;
    try {
      await api.delete(`/categories/${cat.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not delete category.');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display font-semibold text-lg">Manage Categories</h2>
        <p className="text-sm text-ink/50 mt-1">
          These are the categories shown in "Browse by Category" and offered when uploading content or products.
        </p>
      </div>

      <div className="inline-flex rounded-xl2 border border-ink/10 p-1 bg-surface/60">
        {[
          { value: 'content', label: 'Content Categories' },
          { value: 'product', label: 'Product Categories' },
        ].map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`px-4 py-1.5 rounded-xl2 text-xs font-semibold transition ${
              type === t.value ? 'bg-brand-gradient text-white shadow-glass' : 'text-ink/60 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && <p className="text-sm text-red-500">{message}</p>}

      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Add a Category</h3>
        <form onSubmit={addCategory} className="flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="flex-1 px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short tagline (optional)"
            className="flex-1 px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
          />
          {type === 'product' && (
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary bg-white shrink-0"
            >
              <option value="">Top-level category</option>
              {topLevel.map((c) => <option key={c.id} value={c.id}>Subcategory of {c.name}</option>)}
            </select>
          )}
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass disabled:opacity-60 flex items-center justify-center gap-1.5 shrink-0"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Existing Categories</h3>
        {loading ? (
          <p className="text-sm text-ink/40">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-ink/60">No categories yet — add one above.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {topLevel.map((c) => (
              <React.Fragment key={c.id}>
                <li className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{c.name}</p>
                    {c.description && <p className="text-xs text-ink/40">{c.description}</p>}
                  </div>
                  <button
                    onClick={() => removeCategory(c)}
                    className="text-ink/40 hover:text-red-500 transition shrink-0"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
                {childrenOf(c.id).map((sub) => (
                  <li key={sub.id} className="flex items-center justify-between gap-4 py-3 pl-6 border-l-2 border-ink/5 ml-2">
                    <div>
                      <p className="text-sm text-ink/80">{sub.name}</p>
                      {sub.description && <p className="text-xs text-ink/40">{sub.description}</p>}
                    </div>
                    <button
                      onClick={() => removeCategory(sub)}
                      className="text-ink/40 hover:text-red-500 transition shrink-0"
                      aria-label={`Delete ${sub.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </React.Fragment>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
