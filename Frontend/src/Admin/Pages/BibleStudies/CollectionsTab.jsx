import React, { useCallback, useEffect, useState } from 'react';
import { BookMarked, Layers, Eye, EyeOff, Trash2, Pencil, Plus, ArrowUp, ArrowDown, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../api/axios.js';
import MediaField from '../../Components/children/MediaField.jsx';

const emptyForm = { title: '', description: '', intro: '', bible_references: '', cover_image: null, order_index: 0, status: 'draft' };

function emptyChapter(nextNumber) {
  return {
    chapter_number: nextNumber, title: '', description: '', bible_references: '', status: 'draft',
    audio_content_id: null, audio_url: null, pdf_content_id: null, pdf_url: null,
  };
}

/** Groups the flat content-row list GET /series/{id}/chapters returns into one row per chapter_number (up to one audio + one pdf row each). */
function groupChapters(rows) {
  const byNumber = {};
  rows.forEach((r) => {
    const n = r.episode_number || 1;
    if (!byNumber[n]) {
      byNumber[n] = {
        chapter_number: n, title: r.title, description: r.description || '', bible_references: r.bible_references || '',
        status: r.status, audio_content_id: null, audio_url: null, pdf_content_id: null, pdf_url: null,
      };
    }
    if (r.format === 'audio') { byNumber[n].audio_content_id = r.id; byNumber[n].audio_url = r.media_url; }
    if (r.format === 'pdf') { byNumber[n].pdf_content_id = r.id; byNumber[n].pdf_url = r.media_url; }
  });
  return Object.values(byNumber).sort((a, b) => a.chapter_number - b.chapter_number);
}

/**
 * Shared by both the Prophecy and Explore Bible Topics admin tabs
 * (redesign spec §3/§4 - identical management, different `isProphecy`
 * flag) - a collection CRUD form plus, per collection, its own chapter
 * builder: one form holding the whole chapter list (title/description/
 * references/status + an audio upload and a PDF upload each), saved in
 * one request to PUT /series/{id}/chapters. See SeriesController::
 * saveChapters()'s own docblock for how a "chapter" maps to up to two
 * underlying content rows.
 */
export default function CollectionsTab({ isProphecy, title, subtitle }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersSaving, setChaptersSaving] = useState(false);
  const [chaptersMessage, setChaptersMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/series', { params: { section: 'bible_study', status: 'all', limit: 100, sort: 'order_index' } })
      .then((r) => setCollections((r.data?.data?.items || []).filter((s) => !!s.is_prophecy === isProphecy)))
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, [isProphecy]);

  useEffect(() => { load(); }, [load]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      title: c.title, description: c.description || '', intro: c.intro || '', bible_references: c.bible_references || '',
      cover_image: c.cover_image || null, order_index: c.order_index || 0, status: c.status,
    });
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) { setMessage('A title is required.'); return; }
    setSaving(true);
    setMessage('');
    const body = { ...form, section: 'bible_study', is_prophecy: isProphecy };
    try {
      if (editingId) {
        await api.put(`/series/${editingId}`, body);
        setMessage('Collection updated.');
      } else {
        await api.post('/series', body);
        setMessage('Collection created.');
      }
      cancelEdit();
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save this collection.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(c) {
    const next = c.status === 'published' ? 'draft' : 'published';
    await api.put(`/series/${c.id}`, { status: next });
    load();
  }

  async function remove(c) {
    if (!confirm(`Delete "${c.title}"? Its chapters will be detached (not published anywhere) but not permanently destroyed. This can't be undone from here.`)) return;
    await api.delete(`/series/${c.id}`);
    load();
  }

  async function toggleExpand(c) {
    if (expandedId === c.id) { setExpandedId(null); return; }
    setExpandedId(c.id);
    setChaptersMessage('');
    setChaptersLoading(true);
    try {
      const r = await api.get(`/series/${c.id}/chapters`);
      const grouped = groupChapters(r.data?.data?.items || []);
      setChapters(grouped.length ? grouped : [emptyChapter(1)]);
    } catch {
      setChapters([emptyChapter(1)]);
    } finally {
      setChaptersLoading(false);
    }
  }

  function updateChapter(i, field, value) {
    setChapters((cs) => cs.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  function moveChapter(i, dir) {
    setChapters((cs) => {
      const next = [...cs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return cs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function addChapter() {
    const nextNumber = chapters.length ? Math.max(...chapters.map((c) => c.chapter_number)) + 1 : 1;
    setChapters((cs) => [...cs, emptyChapter(nextNumber)]);
  }

  async function saveChapters(seriesId) {
    setChaptersSaving(true);
    setChaptersMessage('');
    try {
      await api.put(`/series/${seriesId}/chapters`, { chapters });
      setChaptersMessage('Chapters saved.');
      load();
    } catch (err) {
      setChaptersMessage(err.response?.data?.message || 'Could not save chapters.');
    } finally {
      setChaptersSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display font-semibold text-lg">{title}</h3>
        {subtitle && <p className="text-sm text-ink/50 mt-1">{subtitle}</p>}
      </div>

      <form onSubmit={save} className="glass-card p-6 space-y-5">
        <h4 className="font-display font-semibold flex items-center gap-2">
          {isProphecy ? <BookMarked className="w-4 h-4 text-secondary" /> : <Layers className="w-4 h-4 text-secondary" />}
          {editingId ? 'Edit Collection' : 'Add a Collection'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Title</span>
            <input required value={form.title} onChange={(e) => update('title', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Short Description (shown on the card)</span>
            <textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Detailed Introduction (shown on the collection's own page)</span>
            <textarea rows={3} value={form.intro} onChange={(e) => update('intro', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Bible References</span>
            <input value={form.bible_references} onChange={(e) => update('bible_references', e.target.value)} placeholder="e.g. Daniel 1-12"
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Display Order</span>
            <input type="number" min="0" value={form.order_index} onChange={(e) => update('order_index', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>

          <MediaField label="Cover Image" kind="image" folder="bible_studies/covers" value={form.cover_image} onChange={(url) => update('cover_image', url)} />

          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Status</span>
            <select value={form.status} onChange={(e) => update('status', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        {message && <p className="text-sm text-secondary">{message}</p>}

        <div className="flex items-center gap-3">
          <button disabled={saving} className="px-6 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-50">
            {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Collection'}
          </button>
          {editingId && <button type="button" onClick={cancelEdit} className="text-sm font-semibold text-ink/50">Cancel</button>}
        </div>
      </form>

      {loading ? (
        <p className="text-ink/50">Loading...</p>
      ) : collections.length === 0 ? (
        <p className="text-ink/40 text-sm">No collections yet - add the first one above.</p>
      ) : (
        <div className="space-y-2">
          {collections.map((c) => (
            <div key={c.id} className="glass-card p-4">
              <div className="flex items-center gap-4">
                {c.cover_image ? (
                  <img src={c.cover_image} alt="" className="w-14 h-14 rounded-xl2 object-cover shrink-0 bg-surface" />
                ) : (
                  <div className="w-14 h-14 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center shrink-0 text-secondary">
                    <BookMarked className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{c.title}</p>
                  <p className="text-xs text-ink/50 capitalize">{c.status} · {c.episode_count} {Number(c.episode_count) === 1 ? 'chapter' : 'chapters'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => toggleStatus(c)} title={c.status === 'published' ? 'Unpublish' : 'Publish'} className="text-ink/50 hover:text-secondary">
                    {c.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => startEdit(c)} title="Edit details" className="text-ink/50 hover:text-secondary"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(c)} title="Delete" className="text-ink/50 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  <button onClick={() => toggleExpand(c)} title="Manage chapters" className="text-secondary font-semibold text-xs flex items-center gap-1">
                    Chapters {expandedId === c.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {expandedId === c.id && (
                <div className="mt-4 pt-4 border-t border-ink/10 space-y-4">
                  {chaptersLoading ? (
                    <p className="text-sm text-ink/50">Loading chapters...</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-ink/40">Only a chapter's uploaded formats (Audio/PDF) ever show on the public site - an empty one shows nothing broken.</p>
                        <button type="button" onClick={addChapter} className="flex items-center gap-1 text-xs font-semibold text-secondary shrink-0">
                          <Plus className="w-3.5 h-3.5" /> Add Chapter
                        </button>
                      </div>
                      <div className="space-y-3">
                        {chapters.map((ch, i) => (
                          <div key={i} className="bg-surface rounded-2xl p-4 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-ink/40 shrink-0">Chapter #</span>
                                <input type="number" min="1" value={ch.chapter_number}
                                  onChange={(e) => updateChapter(i, 'chapter_number', Number(e.target.value))}
                                  className="w-16 px-2 py-1 rounded-lg border border-ink/10 text-xs" />
                              </div>
                              <div className="flex items-center gap-2">
                                <select value={ch.status} onChange={(e) => updateChapter(i, 'status', e.target.value)}
                                  className="px-2 py-1 rounded-lg border border-ink/10 text-xs">
                                  <option value="draft">Draft</option>
                                  <option value="published">Published</option>
                                </select>
                                <button type="button" onClick={() => moveChapter(i, -1)} disabled={i === 0} className="text-ink/40 hover:text-secondary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={() => moveChapter(i, 1)} disabled={i === chapters.length - 1} className="text-ink/40 hover:text-secondary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                                {chapters.length > 1 && (
                                  <button type="button" onClick={() => setChapters((cs) => cs.filter((_, idx) => idx !== i))} className="text-ink/40 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                )}
                              </div>
                            </div>
                            <input value={ch.title} onChange={(e) => updateChapter(i, 'title', e.target.value)} placeholder="Chapter title"
                              className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-secondary" />
                            <textarea rows={2} value={ch.description} onChange={(e) => updateChapter(i, 'description', e.target.value)} placeholder="Short description"
                              className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                            <input value={ch.bible_references} onChange={(e) => updateChapter(i, 'bible_references', e.target.value)} placeholder="Bible references for this chapter"
                              className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                            <div className="grid grid-cols-2 gap-3">
                              <MediaField label="Audio file" kind="audio" value={ch.audio_url} onChange={(url) => updateChapter(i, 'audio_url', url)} />
                              <MediaField label="PDF file" kind="document" folder="bible_studies" value={ch.pdf_url} onChange={(url) => updateChapter(i, 'pdf_url', url)} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button" disabled={chaptersSaving} onClick={() => saveChapters(c.id)}
                          className="px-6 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-50">
                          {chaptersSaving ? 'Saving...' : 'Save Chapters'}
                        </button>
                        {chaptersMessage && <p className="text-sm text-secondary">{chaptersMessage}</p>}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
