import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Eye, EyeOff, Trash2, Pencil, Plus, ArrowUp, ArrowDown, X } from 'lucide-react';
import api from '../../api/axios.js';
import MediaField from '../Components/children/MediaField.jsx';

const emptyForm = { title: '', description: '', cover_image: null, status: 'draft', order_index: 0 };

function emptyDay() {
  return { title: '', bible_references: '', body: '' };
}

/**
 * The real Bible Reading Plan feature (redesign spec) - one or more
 * admin-created daily-reading schedules, deliberately separate from the
 * Series/episode machinery everything else on the Bible Studies page
 * uses, since a plan has no audio/PDF to upload at all. Mirrors
 * Children's Ministry's LessonsTab.jsx: one form holds both the plan's
 * own fields and its whole day-by-day schedule, saved together.
 */
export default function ManageReadingPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [days, setDays] = useState([emptyDay()]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/reading-plans', { params: { status: 'all' } })
      .then((r) => setPlans(r.data?.data?.items || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateDay(i, field, value) {
    setDays((ds) => ds.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  }

  function moveDay(i, dir) {
    setDays((ds) => {
      const next = [...ds];
      const j = i + dir;
      if (j < 0 || j >= next.length) return ds;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function startEdit(plan) {
    const r = await api.get(`/reading-plans/${plan.id}`);
    const full = r.data.data.item;
    const planDays = r.data.data.days || [];
    setEditingId(plan.id);
    setForm({
      title: full.title, description: full.description || '', cover_image: full.cover_image || null,
      status: full.status, order_index: full.order_index || 0,
    });
    setDays(planDays.length ? planDays.map((d) => ({ title: d.title || '', bible_references: d.bible_references || '', body: d.body || '' })) : [emptyDay()]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setDays([emptyDay()]);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) { setMessage('A title is required.'); return; }

    setSaving(true);
    setMessage('');
    const body = { ...form, days: days.filter((d) => d.title.trim() || d.bible_references.trim() || d.body.trim()) };
    if (body.days.length === 0) { setMessage('Add at least one day to the schedule.'); setSaving(false); return; }

    try {
      if (editingId) {
        await api.put(`/reading-plans/${editingId}`, body);
        setMessage('Reading plan updated.');
      } else {
        await api.post('/reading-plans', body);
        setMessage('Reading plan created.');
      }
      cancelEdit();
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save this reading plan.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(plan) {
    const next = plan.status === 'published' ? 'draft' : 'published';
    await api.put(`/reading-plans/${plan.id}`, { status: next });
    load();
  }

  async function remove(plan) {
    if (!confirm(`Delete "${plan.title}"? This can't be undone.`)) return;
    await api.delete(`/reading-plans/${plan.id}`);
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-semibold text-lg">Bible Reading Plans</h2>
        <p className="text-sm text-ink/50 mt-1">
          A flexible daily-reading schedule - not tied to any audio or PDF upload. Create as many plans as you like; each day can carry its own Bible references and a short note.
        </p>
      </div>

      <form onSubmit={save} className="glass-card p-6 space-y-5">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-secondary" /> {editingId ? 'Edit Reading Plan' : 'Add a Reading Plan'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Title</span>
            <input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. 7 Days Through Philippians"
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Description</span>
            <textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <MediaField label="Cover Image" kind="image" folder="reading_plans" value={form.cover_image} onChange={(url) => update('cover_image', url)} />

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Status</span>
              <select value={form.status} onChange={(e) => update('status', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Display Order</span>
              <input type="number" min="0" value={form.order_index} onChange={(e) => update('order_index', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>
          </div>
        </div>

        <div className="border-t border-ink/10 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-ink">Daily Schedule</h4>
              <p className="text-[11px] text-ink/40">Duration is simply the number of days below - day 1 is first.</p>
            </div>
            <button type="button" onClick={() => setDays((d) => [...d, emptyDay()])}
              className="flex items-center gap-1 text-xs font-semibold text-secondary shrink-0">
              <Plus className="w-3.5 h-3.5" /> Add Day
            </button>
          </div>
          <div className="space-y-3">
            {days.map((day, i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink/40">Day {i + 1}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => moveDay(i, -1)} disabled={i === 0} className="text-ink/40 hover:text-secondary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => moveDay(i, 1)} disabled={i === days.length - 1} className="text-ink/40 hover:text-secondary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    {days.length > 1 && (
                      <button type="button" onClick={() => setDays((d) => d.filter((_, idx) => idx !== i))} className="text-ink/40 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
                <input value={day.title} onChange={(e) => updateDay(i, 'title', e.target.value)} placeholder="Day title (optional), e.g. Joy in Christ"
                  className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-secondary" />
                <input value={day.bible_references} onChange={(e) => updateDay(i, 'bible_references', e.target.value)} placeholder="Bible references, e.g. Philippians 1:1-11"
                  className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                <textarea rows={2} value={day.body} onChange={(e) => updateDay(i, 'body', e.target.value)} placeholder="A short note or reflection for this day (optional)"
                  className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
              </div>
            ))}
          </div>
        </div>

        {message && <p className="text-sm text-secondary">{message}</p>}

        <div className="flex items-center gap-3">
          <button disabled={saving} className="px-6 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-50">
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Reading Plan'}
          </button>
          {editingId && <button type="button" onClick={cancelEdit} className="text-sm font-semibold text-ink/50">Cancel</button>}
        </div>
      </form>

      {loading ? (
        <p className="text-ink/50">Loading reading plans...</p>
      ) : plans.length === 0 ? (
        <p className="text-ink/40 text-sm">No reading plans yet - add the first one above.</p>
      ) : (
        <div className="space-y-2">
          {plans.map((p) => (
            <div key={p.id} className="glass-card p-4 flex items-center gap-4">
              {p.cover_image ? (
                <img src={p.cover_image} alt="" className="w-14 h-14 rounded-xl2 object-cover shrink-0 bg-surface" />
              ) : (
                <div className="w-14 h-14 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center shrink-0 text-secondary">
                  <CalendarDays className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{p.title}</p>
                <p className="text-xs text-ink/50 capitalize">{p.status} · {p.day_count} {p.day_count === 1 ? 'day' : 'days'}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => toggleStatus(p)} title={p.status === 'published' ? 'Unpublish' : 'Publish'} className="text-ink/50 hover:text-secondary">
                  {p.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => startEdit(p)} title="Edit" className="text-ink/50 hover:text-secondary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(p)} title="Delete" className="text-ink/50 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
