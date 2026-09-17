import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Loader2, ChevronUp, ChevronDown, Trash2, ImagePlus, Package,
  AlertCircle, ArrowLeft, Boxes,
} from 'lucide-react';
import api from '../../api/axios.js';
import TagInput from '../Components/upload/TagInput.jsx';

// Mirrors Backend/models/Product.php's CATEGORY_ATTRIBUTE_HINTS exactly —
// keyed by the TOP-LEVEL product category's slug (migration 015 seeds
// these six). A subcategory inherits its parent's hint set (see
// topLevelSlugFor below) rather than needing its own entry. `attributes`
// itself is a flexible JSON column, so a category not listed here still
// just gets no extra fields rather than an error.
const CATEGORY_ATTRIBUTE_FIELDS = {
  clothing: [
    { key: 'size', label: 'Sizes available', hint: 'Comma-separated, e.g. S, M, L, XL', type: 'tags' },
    { key: 'color', label: 'Colors available', hint: 'Comma-separated', type: 'tags' },
    { key: 'fit', label: 'Fit', type: 'text' },
    { key: 'material', label: 'Material', type: 'text' },
  ],
  books: [
    { key: 'author', label: 'Author', type: 'text' },
    { key: 'isbn', label: 'ISBN', type: 'text' },
    { key: 'format', label: 'Format', hint: 'e.g. Paperback, Hardcover', type: 'text' },
    { key: 'pages', label: 'Pages', type: 'text' },
  ],
  food: [
    { key: 'ingredients', label: 'Ingredients', type: 'textarea' },
    { key: 'allergens', label: 'Allergens', hint: 'Comma-separated', type: 'tags' },
    { key: 'weight_volume', label: 'Weight / Volume', hint: 'e.g. 500g, 1L', type: 'text' },
    { key: 'best_before', label: 'Best-before / expiry', type: 'date' },
    { key: 'storage_instructions', label: 'Storage instructions', type: 'textarea' },
    { key: 'batch_number', label: 'Batch number', type: 'text' },
  ],
  natural_wellness: [
    { key: 'ingredients', label: 'Ingredients', type: 'textarea' },
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'usage_instructions', label: 'Usage instructions', type: 'textarea' },
    { key: 'warnings', label: 'Warnings', type: 'textarea' },
    { key: 'expiry_date', label: 'Expiry date', type: 'date' },
    { key: 'batch_number', label: 'Batch number', type: 'text' },
  ],
  accessories: [
    { key: 'color', label: 'Colors available', hint: 'Comma-separated', type: 'tags' },
    { key: 'material', label: 'Material', type: 'text' },
  ],
  home_lifestyle: [
    { key: 'material', label: 'Material', type: 'text' },
    { key: 'dimensions', label: 'Dimensions', type: 'text' },
  ],
};

const STATUS_BADGE = {
  draft: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  out_of_stock: 'bg-red-100 text-red-700',
  archived: 'bg-ink/10 text-ink/50',
};

const AVAILABILITY_BADGE = {
  in_stock: { label: 'In Stock', className: 'bg-emerald-100 text-emerald-700' },
  on_order: { label: 'On Order', className: 'bg-sky-100 text-sky-700' },
  out_of_stock: { label: 'Out of Stock', className: 'bg-red-100 text-red-700' },
};

const emptyForm = {
  name: '', slug: '', description: '', seo_keywords: '', category_id: '', brand: '',
  price: '', sale_price: '', sale_starts_at: '', sale_ends_at: '',
  sku: '', barcode: '', stock_quantity: '', weight_kg: '',
  sourcing_type: 'in_stock', is_featured: false, is_new: false, status: 'draft',
  attributes: {},
};

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function topLevelSlugFor(categoryId, categories) {
  let cat = categories.find((c) => String(c.id) === String(categoryId));
  const seen = new Set();
  while (cat?.parent_id && !seen.has(cat.id)) {
    seen.add(cat.id);
    cat = categories.find((c) => String(c.id) === String(cat.parent_id));
  }
  return cat?.slug || null;
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-brand-gradient' : 'bg-ink/15'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink/50">{label} {required && <span className="text-accent">*</span>}</span>
      {hint && <span className="block text-[11px] text-ink/40 -mt-0.5 mb-1">{hint}</span>}
      <div className={hint ? '' : 'mt-1'}>{children}</div>
    </label>
  );
}

const inputClass = 'w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary bg-white';

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list'); // list | form
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]); // [{id?, url, alt_text}]
  const [variants, setVariants] = useState([]); // [{id?, attributesText, sku, price_override, stock_quantity}]
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/products', { params: { search: search || undefined, status: 'all', limit: 50 } })
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

  const topCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const childrenOf = useCallback((parentId) => categories.filter((c) => String(c.parent_id) === String(parentId)), [categories]);
  const attributeFields = useMemo(() => {
    const topSlug = topLevelSlugFor(form.category_id, categories);
    return topSlug ? (CATEGORY_ATTRIBUTE_FIELDS[topSlug] || []) : [];
  }, [form.category_id, categories]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function updateAttribute(key, value) {
    setForm((f) => ({ ...f, attributes: { ...f.attributes, [key]: value } }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setImages([]);
    setVariants([]);
    setError('');
    setView('form');
  }

  async function startEdit(product) {
    setEditingId(product.id);
    setError('');
    setForm({
      name: product.name || '', slug: product.slug || '', description: product.description || '',
      seo_keywords: product.seo_keywords || '', category_id: product.category_id || '', brand: product.brand || '',
      price: product.price ?? '', sale_price: product.sale_price ?? '',
      sale_starts_at: product.sale_starts_at ? product.sale_starts_at.slice(0, 16) : '',
      sale_ends_at: product.sale_ends_at ? product.sale_ends_at.slice(0, 16) : '',
      sku: product.sku || '', barcode: product.barcode || '', stock_quantity: product.stock_quantity ?? '',
      weight_kg: product.weight_kg ?? '', sourcing_type: product.sourcing_type || 'in_stock',
      is_featured: !!product.is_featured, is_new: !!product.is_new, status: product.status || 'draft',
      attributes: product.attributes || {},
    });
    setView('form');
    try {
      const { data } = await api.get(`/products/${product.id}`);
      const item = data?.data?.item;
      setImages((item?.images || []).map((img) => ({ id: img.id, url: img.url, alt_text: img.alt_text || '' })));
      setVariants((item?.variants || []).map((v) => ({
        id: v.id,
        attributesText: Object.entries(v.attributes || {}).map(([k, val]) => `${k}:${val}`).join(', '),
        sku: v.sku || '', price_override: v.price_override ?? '', stock_quantity: v.stock_quantity ?? '',
      })));
    } catch {
      setImages([]);
      setVariants([]);
    }
  }

  async function handleImageUpload(file) {
    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('folder', 'products');
      const res = await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImages((prev) => [...prev, { url: res.data.data.url, alt_text: '' }]);
    } catch (err) {
      setError(err.response?.data?.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  }

  function moveImage(index, dir) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }
  function updateImageAlt(index, alt) {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, alt_text: alt } : img)));
  }

  function addVariantRow() {
    setVariants((prev) => [...prev, { attributesText: '', sku: '', price_override: '', stock_quantity: '' }]);
  }
  function updateVariantRow(index, field, value) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  }
  function removeVariantRow(index) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function parseVariantAttributes(text) {
    const attrs = {};
    text.split(',').forEach((pair) => {
      const [k, ...rest] = pair.split(':');
      const key = k?.trim();
      const val = rest.join(':').trim();
      if (key && val) attrs[key] = val;
    });
    return attrs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Please enter a product name.'); return; }
    if (!form.price || Number(form.price) <= 0) { setError('Please enter a valid price.'); return; }
    for (const v of variants) {
      if (!v.attributesText.trim() || Object.keys(parseVariantAttributes(v.attributesText)).length === 0) {
        setError('Each variant needs at least one attribute, e.g. "size:M, color:Red".');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug.trim() || undefined,
        category_id: form.category_id || null,
        price: Number(form.price) || 0,
        sale_price: form.sale_price !== '' ? Number(form.sale_price) : null,
        sale_starts_at: form.sale_starts_at || null,
        sale_ends_at: form.sale_ends_at || null,
        stock_quantity: form.sourcing_type === 'in_stock' ? (Number(form.stock_quantity) || 0) : 0,
        weight_kg: form.weight_kg !== '' ? Number(form.weight_kg) : null,
        thumbnail: images[0]?.url || null,
        attributes: Object.keys(form.attributes || {}).length ? form.attributes : null,
      };

      let productId = editingId;
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        const { data } = await api.post('/products', payload);
        productId = data.data.id;
      }

      // Images: diff against what's already saved rather than blindly
      // re-posting everything, so re-saving an unchanged product doesn't
      // create duplicate image rows.
      const existingIds = new Set(images.filter((i) => i.id).map((i) => i.id));
      if (editingId) {
        const { data } = await api.get(`/products/${editingId}`);
        for (const old of data?.data?.item?.images || []) {
          if (!existingIds.has(old.id)) {
            await api.delete(`/products/${editingId}/images/${old.id}`);
          }
        }
      }
      for (const img of images) {
        if (!img.id) {
          await api.post(`/products/${productId}/images`, { url: img.url, alt_text: img.alt_text || null });
        }
      }
      if (images.length) {
        await api.post(`/products/${productId}/images/reorder`, {
          image_ids: images.filter((i) => i.id).map((i) => i.id),
        }).catch(() => {});
      }

      // Variants: same diff approach.
      if (editingId) {
        const { data } = await api.get(`/products/${editingId}`);
        const keptIds = new Set(variants.filter((v) => v.id).map((v) => v.id));
        for (const old of data?.data?.item?.variants || []) {
          if (!keptIds.has(old.id)) {
            await api.delete(`/products/${editingId}/variants/${old.id}`);
          }
        }
      }
      for (const v of variants) {
        const body = {
          attributes: parseVariantAttributes(v.attributesText),
          sku: v.sku || null,
          price_override: v.price_override !== '' ? Number(v.price_override) : null,
          stock_quantity: Number(v.stock_quantity) || 0,
        };
        if (v.id) {
          await api.put(`/products/${productId}/variants/${v.id}`, body);
        } else {
          await api.post(`/products/${productId}/variants`, body);
        }
      }

      setMessage(editingId ? 'Product updated.' : 'Product created.');
      setView('list');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await api.delete(`/products/${id}`);
    load();
  }

  // ---------------------------------------------------------------------
  if (view === 'form') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm font-semibold text-ink/60 hover:text-ink">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>
        <h2 className="font-display font-semibold text-lg">{editingId ? 'Edit Product' : 'New Product'}</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink">Basic Info</h3>
            <Field label="Name" required>
              <input required value={form.name}
                onChange={(e) => { update('name', e.target.value); if (!editingId) update('slug', slugify(e.target.value)); }}
                className={inputClass} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Slug" hint="Used in the product URL.">
                <input value={form.slug} onChange={(e) => update('slug', slugify(e.target.value))} className={inputClass} />
              </Field>
              <Field label="Brand (optional)">
                <input value={form.brand} onChange={(e) => update('brand', e.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label="Description">
              <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} className={inputClass + ' rounded-2xl'} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Category">
                <select value={form.category_id} onChange={(e) => update('category_id', e.target.value)} className={inputClass}>
                  <option value="">No category</option>
                  {topCategories.map((c) => (
                    <optgroup key={c.id} label={c.name}>
                      <option value={c.id}>{c.name} (general)</option>
                      {childrenOf(c.id).map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="SEO Keywords" hint="Comma-separated, used for search.">
                <input value={form.seo_keywords} onChange={(e) => update('seo_keywords', e.target.value)} className={inputClass} />
              </Field>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink">Sourcing &amp; Pricing</h3>
            <Field label="Sourcing" hint="In Stock: ready to ship now. On Order: procured from a supplier after purchase (enables the deposit workflow, not Pay Later).">
              <div className="inline-flex rounded-xl2 border border-ink/10 p-1 bg-surface/60">
                {[{ value: 'in_stock', label: 'In Stock' }, { value: 'on_order', label: 'On Order' }].map((s) => (
                  <button key={s.value} type="button" onClick={() => update('sourcing_type', s.value)}
                    className={`px-4 py-1.5 rounded-xl2 text-xs font-semibold transition ${form.sourcing_type === s.value ? 'bg-brand-gradient text-white shadow-glass' : 'text-ink/60'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Price (NAD)" required>
                <input required type="number" step="0.01" min="0" value={form.price} onChange={(e) => update('price', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Sale Price (optional)">
                <input type="number" step="0.01" min="0" value={form.sale_price} onChange={(e) => update('sale_price', e.target.value)} className={inputClass} />
              </Field>
              {form.sourcing_type === 'in_stock' && (
                <Field label="Stock Quantity">
                  <input type="number" min="0" value={form.stock_quantity} onChange={(e) => update('stock_quantity', e.target.value)} className={inputClass} />
                </Field>
              )}
            </div>
            {form.sale_price !== '' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Sale starts (optional)" hint="Leave blank to start immediately.">
                  <input type="datetime-local" value={form.sale_starts_at} onChange={(e) => update('sale_starts_at', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Sale ends (optional)" hint="Leave blank for no end date.">
                  <input type="datetime-local" value={form.sale_ends_at} onChange={(e) => update('sale_ends_at', e.target.value)} className={inputClass} />
                </Field>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="SKU">
                <input value={form.sku} onChange={(e) => update('sku', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Barcode / ISBN">
                <input value={form.barcode} onChange={(e) => update('barcode', e.target.value)} className={inputClass} />
              </Field>
              <Field label="Weight (kg, optional)">
                <input type="number" step="0.001" min="0" value={form.weight_kg} onChange={(e) => update('weight_kg', e.target.value)} className={inputClass} />
              </Field>
            </div>
          </div>

          {attributeFields.length > 0 && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-ink">Category Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attributeFields.map((f) => (
                  <Field key={f.key} label={f.label} hint={f.hint}>
                    {f.type === 'textarea' ? (
                      <textarea rows={2} value={form.attributes[f.key] || ''} onChange={(e) => updateAttribute(f.key, e.target.value)} className={inputClass + ' rounded-2xl'} />
                    ) : f.type === 'tags' ? (
                      <TagInput value={form.attributes[f.key] || ''} onChange={(v) => updateAttribute(f.key, v)} />
                    ) : (
                      <input type={f.type === 'date' ? 'date' : 'text'} value={form.attributes[f.key] || ''} onChange={(e) => updateAttribute(f.key, e.target.value)} className={inputClass} />
                    )}
                  </Field>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Images</h3>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-secondary cursor-pointer">
                {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                Add Image
                <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                  onChange={(e) => { if (e.target.files[0]) handleImageUpload(e.target.files[0]); e.target.value = ''; }} />
              </label>
            </div>
            {images.length === 0 ? (
              <p className="text-xs text-ink/40">No images yet. The first image becomes the cover/thumbnail.</p>
            ) : (
              <div className="space-y-2">
                {images.map((img, i) => (
                  <div key={img.id || img.url} className="flex items-center gap-3 p-2 rounded-xl2 border border-ink/10 bg-white">
                    <img src={img.url} alt="" className="w-14 h-14 rounded-xl2 object-cover shrink-0 bg-surface" />
                    <input
                      value={img.alt_text}
                      onChange={(e) => updateImageAlt(i, e.target.value)}
                      placeholder="Alt text (for accessibility/SEO)"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                    {i === 0 && <span className="text-[10px] font-semibold text-secondary shrink-0">COVER</span>}
                    <div className="flex flex-col shrink-0">
                      <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                      <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                    <button type="button" onClick={() => removeImage(i)} className="shrink-0 text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink">Variants (optional)</h3>
                <p className="text-[11px] text-ink/40">e.g. size/color/flavor combinations. Leave empty to sell this product as a single item.</p>
              </div>
              <button type="button" onClick={addVariantRow} className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
                <Plus className="w-3.5 h-3.5" /> Add Variant
              </button>
            </div>
            {variants.map((v, i) => (
              <div key={v.id || i} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-start p-3 rounded-xl2 border border-ink/10 bg-white">
                <input value={v.attributesText} onChange={(e) => updateVariantRow(i, 'attributesText', e.target.value)}
                  placeholder="size:M, color:Red" className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                <input value={v.sku} onChange={(e) => updateVariantRow(i, 'sku', e.target.value)}
                  placeholder="SKU" className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                <input type="number" step="0.01" value={v.price_override} onChange={(e) => updateVariantRow(i, 'price_override', e.target.value)}
                  placeholder="Price override" className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                <input type="number" min="0" value={v.stock_quantity} onChange={(e) => updateVariantRow(i, 'stock_quantity', e.target.value)}
                  placeholder="Stock" className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                <button type="button" onClick={() => removeVariantRow(i)} className="text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-ink">Publishing</h3>
            <Field label="Status">
              <select value={form.status} onChange={(e) => update('status', e.target.value)} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-ink">Featured</p>
                <Toggle checked={form.is_featured} onChange={(v) => update('is_featured', v)} label="Featured" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-ink">New arrival</p>
                <Toggle checked={form.is_new} onChange={(v) => update('is_new', v)} label="New" />
              </div>
            </div>
          </div>

          {error && (
            <div className="glass-card p-4 border border-red-200 bg-red-50/60 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /> <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setView('list')} className="px-6 py-3 rounded-full text-sm font-semibold text-ink/60">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold text-sm shadow-glass disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Manage Products</h2>
        <button onClick={startCreate} className="px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Product
        </button>
      </div>

      {message && <p className="text-sm text-secondary">{message}</p>}

      <div className="glass-card p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      {loading ? (
        <div className="glass-card overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-ink/5 animate-pulse">
              <div className="w-12 h-12 rounded-xl2 bg-ink/10 shrink-0" />
              <div className="flex-1 space-y-1.5"><div className="h-3 w-1/3 bg-ink/10 rounded-full" /><div className="h-2.5 w-1/5 bg-ink/10 rounded-full" /></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">
          <Boxes className="w-8 h-8 mx-auto mb-3 text-ink/25" />
          No products yet. Create your first one above.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-ink/10">
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Availability</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const avail = AVAILABILITY_BADGE[p.availability] || AVAILABILITY_BADGE.out_of_stock;
                return (
                  <tr key={p.id} className="border-b border-ink/5 hover:bg-white/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl2 bg-brand-gradient-soft overflow-hidden shrink-0 flex items-center justify-center">
                          {p.thumbnail ? <img src={p.thumbnail} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-secondary" />}
                        </div>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-ink/60">{p.category_name || '—'}</td>
                    <td className="p-4 text-ink/60">
                      N$ {Number(p.sale_price ?? p.price).toFixed(2)}
                      {p.sale_price && Number(p.sale_price) < Number(p.price) && (
                        <span className="ml-1.5 text-xs text-ink/35 line-through">N$ {Number(p.price).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${avail.className}`}>{avail.label}</span></td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[p.status] || 'bg-ink/10'}`}>{p.status}</span></td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-3 text-xs font-semibold">
                        <button onClick={() => startEdit(p)} className="text-secondary">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-500">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
