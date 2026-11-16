import React, { useCallback, useEffect, useState } from 'react';
import { BookHeart, Eye, EyeOff, Trash2, Pencil } from 'lucide-react';
import api from '../../../api/axios.js';
import MediaField from '../../Components/children/MediaField.jsx';

const emptyForm = {
  title: '', description: '', bible_references: '', tags: '',
  thumbnail: null, media_url: null, status: 'draft', publish_date: '',
  is_downloadable: false, allow_comments: false,
};

// Bible Stories are ordinary `content` rows (section='kids',
// media_type='bible_story') - see migration 042's own comment for why -
// so this form talks to the existing generic /content endpoints rather
// than a parallel Story-specific API. What makes this a genuinely
// separate admin area is that it's its own page/form (no category
// picker, no section switcher, no other content type mixed in) and its
// own tab here, not a new backend surface.
export default function StoriesTab() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/kids', { params: { media_type: 'bible_story', status: 'all', limit: 100 } })
      .then((r) => setStories(r.data?.data?.items || []))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(story) {
    setEditingId(story.id);
    setForm({
      title: story.title, description: story.description || '', bible_references: story.bible_references || '',
      tags: story.tags || '', thumbnail: story.thumbnail || null, media_url: story.media_url || null,
      status: story.status, publish_date: story.publish_date ? story.publish_date.slice(0, 16) : '',
      is_downloadable: !!story.is_downloadable, allow_comments: !!story.allow_comments,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) { setMessage('A title is required.'); return; }
    if (!form.media_url) { setMessage('Please upload the story video.'); return; }
    if (!form.thumbnail) { setMessage('Please upload a thumbnail.'); return; }

    setSaving(true);
    setMessage('');
    const body = {
      ...form,
      section: 'kids',
      media_type: 'bible_story',
      publish_date: form.status === 'scheduled' && form.publish_date ? form.publish_date : null,
    };

    try {
      if (editingId) {
        await api.put(`/content/${editingId}`, body);
        setMessage('Story updated.');
      } else {
        await api.post('/content', body);
        setMessage('Story created.');
      }
      cancelEdit();
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save this story.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(story) {
    const next = story.status === 'published' ? 'draft' : 'published';
    await api.put(`/content/${story.id}`, { status: next });
    load();
  }

  async function remove(story) {
    if (!confirm(`Delete "${story.title}"? This can't be undone.`)) return;
    await api.delete(`/content/${story.id}`);
    load();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="glass-card p-6 space-y-5">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <BookHeart className="w-4 h-4 text-secondary" /> {editingId ? 'Edit Bible Story' : 'Add a Bible Story'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Title</span>
            <input required value={form.title} onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Noah's Ark"
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Short Description</span>
            <textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)}
              placeholder="A short, friendly summary children will see on the story card."
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Bible Reference</span>
            <input value={form.bible_references} onChange={(e) => update('bible_references', e.target.value)}
              placeholder="e.g. Genesis 6-9"
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Collection (optional)</span>
            <input value={form.tags} onChange={(e) => update('tags', e.target.value)}
              placeholder="e.g. Old Testament Heroes"
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <MediaField label="Thumbnail" kind="image" folder="children/stories" value={form.thumbnail} onChange={(url) => update('thumbnail', url)} />
          <MediaField label="Story Video" kind="video" folder="children/stories" value={form.media_url} onChange={(url) => update('media_url', url)} />

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

          <div className="flex items-center justify-between gap-4 md:col-span-2 bg-surface rounded-xl2 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Allow Download</p>
              <p className="text-xs text-ink/50">Only turn this on if the video may be downloaded, not just streamed.</p>
            </div>
            <button type="button" role="switch" aria-checked={form.is_downloadable}
              onClick={() => update('is_downloadable', !form.is_downloadable)}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.is_downloadable ? 'bg-brand-gradient' : 'bg-ink/15'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_downloadable ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {message && <p className="text-sm text-secondary">{message}</p>}

        <div className="flex items-center gap-3">
          <button disabled={saving} className="px-6 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-50">
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Story'}
          </button>
          {editingId && <button type="button" onClick={cancelEdit} className="text-sm font-semibold text-ink/50">Cancel</button>}
        </div>
      </form>

      {loading ? (
        <p className="text-ink/50">Loading stories...</p>
      ) : stories.length === 0 ? (
        <p className="text-ink/40 text-sm">No Bible Stories yet - add the first one above.</p>
      ) : (
        <div className="space-y-2">
          {stories.map((s) => (
            <div key={s.id} className="glass-card p-4 flex items-center gap-4">
              {s.thumbnail ? (
                <img src={s.thumbnail} alt="" className="w-14 h-14 rounded-xl2 object-cover shrink-0 bg-surface" />
              ) : (
                <div className="w-14 h-14 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center shrink-0 text-secondary">
                  <BookHeart className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{s.title}</p>
                <p className="text-xs text-ink/50 capitalize">{s.status} · {s.views ?? 0} views · {s.bible_references || 'No reference set'}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => toggleStatus(s)} title={s.status === 'published' ? 'Unpublish' : 'Publish'} className="text-ink/50 hover:text-secondary">
                  {s.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => startEdit(s)} title="Edit" className="text-ink/50 hover:text-secondary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(s)} title="Delete" className="text-ink/50 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
