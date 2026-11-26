import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Eye, EyeOff, Trash2, Pencil, Plus, ArrowUp, ArrowDown, X } from 'lucide-react';
import api from '../../../api/axios.js';
import MediaField from '../../Components/children/MediaField.jsx';

const emptyForm = {
  title: '', intro: '', bible_references: '', key_verse_text: '', key_verse_reference: '',
  key_points: '', reflection_questions: '', topic: '', order_index: 0,
  cover_image: null, status: 'draft', publish_date: '', story_ids: [],
};

function emptySection() {
  return { heading: '', body: '', image_url: null, video_url: null };
}

export default function LessonsTab() {
  const [lessons, setLessons] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [sections, setSections] = useState([emptySection()]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/lessons', { params: { status: 'all', limit: 100 } })
      .then((r) => setLessons(r.data?.data?.items || []))
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/kids', { params: { media_type: 'bible_story', status: 'published', limit: 100 } })
      .then((r) => setStories(r.data?.data?.items || []))
      .catch(() => setStories([]));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateSection(i, field, value) {
    setSections((secs) => secs.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function moveSection(i, dir) {
    setSections((secs) => {
      const next = [...secs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return secs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function startEdit(lesson) {
    const r = await api.get(`/lessons/${lesson.id}`);
    const full = r.data.data.item;
    setEditingId(lesson.id);
    setForm({
      title: full.title, intro: full.intro || '', bible_references: full.bible_references || '',
      key_verse_text: full.key_verse_text || '', key_verse_reference: full.key_verse_reference || '',
      key_points: (full.key_points || []).join('\n'), reflection_questions: (full.reflection_questions || []).join('\n'),
      topic: full.topic || '', order_index: full.order_index || 0, cover_image: full.cover_image || null,
      status: full.status, publish_date: full.publish_date ? full.publish_date.slice(0, 16) : '',
      story_ids: (full.related_stories || []).map((s) => s.id),
    });
    setSections(full.sections?.length ? full.sections.map((s) => ({ heading: s.heading || '', body: s.body || '', image_url: s.image_url, video_url: s.video_url })) : [emptySection()]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setSections([emptySection()]);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) { setMessage('A title is required.'); return; }

    setSaving(true);
    setMessage('');
    const body = {
      ...form,
      key_points: form.key_points.split('\n').map((s) => s.trim()).filter(Boolean),
      reflection_questions: form.reflection_questions.split('\n').map((s) => s.trim()).filter(Boolean),
      publish_date: form.status === 'scheduled' && form.publish_date ? form.publish_date : null,
      sections: sections.filter((s) => s.heading.trim() || s.body.trim()),
    };

    try {
      if (editingId) {
        await api.put(`/lessons/${editingId}`, body);
        setMessage('Lesson updated.');
      } else {
        await api.post('/lessons', body);
        setMessage('Lesson created.');
      }
      cancelEdit();
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save this lesson.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(lesson) {
    const next = lesson.status === 'published' ? 'draft' : 'published';
    await api.put(`/lessons/${lesson.id}`, { status: next });
    load();
  }

  async function remove(lesson) {
    if (!confirm(`Delete "${lesson.title}"? This can't be undone.`)) return;
    await api.delete(`/lessons/${lesson.id}`);
    load();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="glass-card p-6 space-y-5">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-secondary" /> {editingId ? 'Edit Bible Lesson' : 'Add a Bible Lesson'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Title</span>
            <input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. God Loves Us"
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Introduction</span>
            <textarea rows={2} value={form.intro} onChange={(e) => update('intro', e.target.value)}
              placeholder="A short, friendly opening paragraph for this lesson."
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <MediaField label="Cover Image" kind="image" folder="children/lessons" value={form.cover_image} onChange={(url) => update('cover_image', url)} />

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Topic / Series</span>
              <input value={form.topic} onChange={(e) => update('topic', e.target.value)} placeholder="e.g. Getting to Know God"
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Order Within Topic</span>
              <input type="number" min="0" value={form.order_index} onChange={(e) => update('order_index', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Bible References</span>
            <input value={form.bible_references} onChange={(e) => update('bible_references', e.target.value)} placeholder="e.g. John 3:16, Romans 5:8"
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Key Verse Reference</span>
            <input value={form.key_verse_reference} onChange={(e) => update('key_verse_reference', e.target.value)} placeholder="e.g. John 3:16"
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Key Verse Text</span>
            <textarea rows={2} value={form.key_verse_text} onChange={(e) => update('key_verse_text', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Key Points (one per line)</span>
            <textarea rows={4} value={form.key_points} onChange={(e) => update('key_points', e.target.value)}
              placeholder={'God made everything\nGod\'s creation was good'}
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Reflection Questions (one per line)</span>
            <textarea rows={4} value={form.reflection_questions} onChange={(e) => update('reflection_questions', e.target.value)}
              placeholder={'What is your favorite thing God created?'}
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Related Bible Stories</span>
            <select multiple value={form.story_ids} onChange={(e) => update('story_ids', Array.from(e.target.selectedOptions, (o) => Number(o.value)))}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary h-28">
              {stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <span className="text-[11px] text-ink/35">Hold Ctrl/Cmd to select more than one.</span>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Status</span>
            <select value={form.status} onChange={(e) => update('status', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          {form.status === 'scheduled' && (
            <label className="block">
              <span className="text-xs font-semibold text-ink/50">Publish Date</span>
              <input type="datetime-local" value={form.publish_date} onChange={(e) => update('publish_date', e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
            </label>
          )}
        </div>

        <div className="border-t border-ink/10 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-ink">Lesson Sections</h4>
            <button type="button" onClick={() => setSections((s) => [...s, emptySection()])}
              className="flex items-center gap-1 text-xs font-semibold text-secondary">
              <Plus className="w-3.5 h-3.5" /> Add Section
            </button>
          </div>
          <div className="space-y-4">
            {sections.map((section, i) => (
              <div key={i} className="bg-surface rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink/40">Section {i + 1}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0} className="text-ink/40 hover:text-secondary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1} className="text-ink/40 hover:text-secondary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    {sections.length > 1 && (
                      <button type="button" onClick={() => setSections((s) => s.filter((_, idx) => idx !== i))} className="text-ink/40 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
                <input value={section.heading} onChange={(e) => updateSection(i, 'heading', e.target.value)} placeholder="Section heading"
                  className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-secondary" />
                <textarea rows={3} value={section.body} onChange={(e) => updateSection(i, 'body', e.target.value)} placeholder="Section text"
                  className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                <div className="grid grid-cols-2 gap-3">
                  <MediaField label="Image (optional)" kind="image" folder="children/lessons" value={section.image_url} onChange={(url) => updateSection(i, 'image_url', url)} />
                  <MediaField label="Video (optional)" kind="video" folder="children/lessons" value={section.video_url} onChange={(url) => updateSection(i, 'video_url', url)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {message && <p className="text-sm text-secondary">{message}</p>}

        <div className="flex items-center gap-3">
          <button disabled={saving} className="px-6 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-50">
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Lesson'}
          </button>
          {editingId && <button type="button" onClick={cancelEdit} className="text-sm font-semibold text-ink/50">Cancel</button>}
        </div>
      </form>

      {loading ? (
        <p className="text-ink/50">Loading lessons...</p>
      ) : lessons.length === 0 ? (
        <p className="text-ink/40 text-sm">No Bible Lessons yet - add the first one above.</p>
      ) : (
        <div className="space-y-2">
          {lessons.map((l) => (
            <div key={l.id} className="glass-card p-4 flex items-center gap-4">
              {l.cover_image ? (
                <img src={l.cover_image} alt="" className="w-14 h-14 rounded-xl2 object-cover shrink-0 bg-surface" />
              ) : (
                <div className="w-14 h-14 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center shrink-0 text-secondary">
                  <BookOpen className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{l.title}</p>
                <p className="text-xs text-ink/50 capitalize">{l.status} · {l.topic || 'No topic'} · {l.activities_count} activities</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => toggleStatus(l)} title={l.status === 'published' ? 'Unpublish' : 'Publish'} className="text-ink/50 hover:text-secondary">
                  {l.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => startEdit(l)} title="Edit" className="text-ink/50 hover:text-secondary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(l)} title="Delete" className="text-ink/50 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
