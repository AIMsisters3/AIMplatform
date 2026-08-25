import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';

const STATUS_BADGE = {
  draft: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  out_of_stock: 'bg-red-100 text-red-700',
  archived: 'bg-ink/10 text-ink/50',
};

const emptyForm = {
  name: '', description: '', category_id: '', price: '', sale_price: '',
  sku: '', stock_quantity: '', product_type: 'physical', status: 'draft',
};

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/products', { params: { search: search || undefined, limit: 50 } })
      .then((r) => setProducts(r.data?.data?.items || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/categories', { params: { type: 'product' } })
      .then((r) => setCategories(r.data?.data?.items || []))
      .catch(() => setCategories([]));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        price: Number(form.price) || 0,
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        stock_quantity: Number(form.stock_quantity) || 0,
      };

      if (thumbnailFile) {
        const data = new FormData();
        data.append('file', thumbnailFile);
        data.append('folder', 'thumbnails');
        const res = await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        payload.thumbnail = res.data.data.url;
      }

      await api.post('/products', payload);
      setMessage('Product created successfully.');
      setForm(emptyForm);
      setThumbnailFile(null);
      setShowForm(false);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not create product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await api.delete(`/products/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Manage Products</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass"
        >
          {showForm ? 'Cancel' : '+ New Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Name</span>
            <input required value={form.name} onChange={(e) => update('name', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Description</span>
            <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Category</span>
            <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Type</span>
            <select value={form.product_type} onChange={(e) => update('product_type', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Price</span>
            <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => update('price', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Sale Price (optional)</span>
            <input type="number" step="0.01" min="0" value={form.sale_price} onChange={(e) => update('sale_price', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">SKU</span>
            <input value={form.sku} onChange={(e) => update('sku', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Stock Quantity</span>
            <input type="number" min="0" value={form.stock_quantity} onChange={(e) => update('stock_quantity', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Status</span>
            <select value={form.status} onChange={(e) => update('status', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Thumbnail</span>
            <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files[0])}
              className="mt-1 w-full text-sm" />
          </label>

          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold text-sm shadow-glass disabled:opacity-60">
              {saving ? 'Saving...' : 'Create Product'}
            </button>
            {message && <p className="text-sm text-secondary">{message}</p>}
          </div>
        </form>
      )}

      <div className="glass-card p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      {loading ? (
        <p className="text-ink/50">Loading products...</p>
      ) : products.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">No products yet. Create your first one above.</div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-ink/10">
                <th className="p-4">Name</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-ink/5 hover:bg-white/50">
                  <td className="p-4 font-medium">{p.name}</td>
                  <td className="p-4 text-ink/60">${Number(p.sale_price ?? p.price).toFixed(2)}</td>
                  <td className="p-4 text-ink/60">{p.stock_quantity}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[p.status] || 'bg-ink/10'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 text-xs font-semibold">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
