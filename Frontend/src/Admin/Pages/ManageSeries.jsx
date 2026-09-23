import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';

const SECTIONS = [
  { value: 'media_library', label: 'Content / Media Library' },
  { value: 'bible_study', label: 'Bible Study' },
];

export default function ManageSeries() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ title: '', description: '', status: 'draft', section: 'media_library' });
  const [expanded, setExpanded] = useState(null);
  const [episodes, setEpisodes] = useState({});
  const [attachForm, setAttachForm] = useState({});
  const [content, setContent] = useState([]);
  const [editingSeriesId, setEditingSeriesId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [episodeEdits, setEpisodeEdits] = useState({}); // contentId -> {season_number, episode_number}

  const load = useCallback(() => {
    setLoading(true);
    api.get('/series', { params: { status: 'all', limit: 100 } })
      .then((r) => setSeries(r.data.data.items))
      .catch(() => setSeries([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/content', { params: { status: 'all', limit: 100 } })
      .then((r) => setContent(r.data.data.items))
      .catch(() => setContent([]));
  }, []);

  async function createSeries(e) {
    e.preventDefault();
    try {
      await api.post('/series', form);
      setMessage('Series created.');
      setForm({ title: '', description: '', status: 'draft', section: 'media_library' });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not create series.');
    }
  }

  async function deleteSeries(id) {
    if (!confirm('Delete this series? Episodes stay published, just detached.')) return;
    await api.delete(`/series/${id}`);
    load();
  }

  function startEditSeries(s) {
    setEditingSeriesId(s.id);
    setEditForm({ title: s.title, description: s.description || '', status: s.status, section: s.section || 'media_library' });
  }

  async function saveSeriesEdit(id) {
    try {
      await api.put(`/series/${id}`, editForm);
      setEditingSeriesId(null);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not update series.');
    }
  }

  async function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!episodes[id]) {
      const r = await api.get(`/series/${id}`);
      setEpisodes((e) => ({ ...e, [id]: r.data.data.episodes }));
    }
  }

  async function refreshEpisodes(seriesId) {
    const r = await api.get(`/series/${seriesId}`);
    setEpisodes((e) => ({ ...e, [seriesId]: r.data.data.episodes }));
  }

  async function attachEpisode(seriesId) {
    const f = attachForm[seriesId] || {};
    if (!f.content_id) return;
    await api.post(`/series/${seriesId}/episodes`, {
      content_id: Number(f.content_id),
      season_number: Number(f.season_number || 1),
      episode_number: Number(f.episode_number || 1),
    });
    refreshEpisodes(seriesId);
    setAttachForm((a) => ({ ...a, [seriesId]: { content_id: '', season_number: '', episode_number: '' } }));
  }

  function startEditEpisode(ep) {
    setEpisodeEdits((e) => ({ ...e, [ep.id]: { season_number: ep.season_number ?? 1, episode_number: ep.episode_number ?? 1 } }));
  }

  async function saveEpisodePosition(seriesId, ep) {
    const edit = episodeEdits[ep.id];
    if (!edit) return;
    await api.post(`/series/${seriesId}/episodes`, {
      content_id: ep.id,
      season_number: Number(edit.season_number || 1),
      episode_number: Number(edit.episode_number || 1),
    });
    setEpisodeEdits((e) => { const next = { ...e }; delete next[ep.id]; return next; });
    refreshEpisodes(seriesId);
  }

  async function detachEpisode(seriesId, contentId) {
    if (!confirm('Remove this episode from the series? The content item itself stays published.')) return;
    await api.delete(`/series/${seriesId}/episodes/${contentId}`);
    refreshEpisodes(seriesId);
  }

  return (
    <div className="space-y-8">
      <h2 className="font-display font-semibold text-lg">Manage Series</h2>

      <form onSubmit={createSeries} className="glass-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold text-ink/50">Title</span>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold text-ink/50">Description</span>
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink/50">Appears Under</span>
          <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}
            className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
            {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink/50">Status</span>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <button className="px-6 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition">
            Create Series
          </button>
        </div>
      </form>

      {message && <p className="text-sm text-secondary">{message}</p>}

      {loading ? (
        <p className="text-ink/50">Loading series...</p>
      ) : (
        <div className="space-y-3">
          {series.map((s) => (
            <div key={s.id} className="glass-card p-5">
              {editingSeriesId === s.id ? (
                <div className="space-y-3">
                  <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl2 border border-ink/10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-secondary" />
                  <textarea rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-2xl border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                  <div className="flex flex-wrap gap-2">
                    <select value={editForm.section} onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                      className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm">
                      {SECTIONS.map((sec) => <option key={sec.value} value={sec.value}>{sec.label}</option>)}
                    </select>
                    <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button onClick={() => saveSeriesEdit(s.id)} className="px-4 py-2 rounded-xl2 bg-brand-gradient text-white text-xs font-semibold shadow-glass">Save</button>
                    <button onClick={() => setEditingSeriesId(null)} className="px-4 py-2 text-xs font-semibold text-ink/50">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <button onClick={() => toggleExpand(s.id)} className="text-left flex-1">
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-xs text-ink/50 capitalize">
                      {s.status} · {s.episode_count} episodes · {SECTIONS.find((sec) => sec.value === s.section)?.label || 'Content / Media Library'}
                    </p>
                  </button>
                  <button onClick={() => startEditSeries(s)} className="text-xs font-semibold text-secondary">Edit</button>
                  <button onClick={() => deleteSeries(s.id)} className="text-xs font-semibold text-red-500">Delete</button>
                </div>
              )}

              {expanded === s.id && (
                <div className="mt-4 pt-4 border-t border-ink/10 space-y-4">
                  <div className="space-y-2">
                    {(episodes[s.id] || []).map((ep) => (
                      <div key={ep.id} className="flex items-center justify-between gap-3 text-sm text-ink/70 bg-surface rounded-xl2 px-4 py-2">
                        {episodeEdits[ep.id] ? (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="truncate">{ep.title}</span>
                            <input type="number" min="1" value={episodeEdits[ep.id].season_number}
                              onChange={(e) => setEpisodeEdits((ee) => ({ ...ee, [ep.id]: { ...ee[ep.id], season_number: e.target.value } }))}
                              className="w-16 px-2 py-1 rounded-lg border border-ink/10 text-xs" title="Season" />
                            <input type="number" min="1" value={episodeEdits[ep.id].episode_number}
                              onChange={(e) => setEpisodeEdits((ee) => ({ ...ee, [ep.id]: { ...ee[ep.id], episode_number: e.target.value } }))}
                              className="w-16 px-2 py-1 rounded-lg border border-ink/10 text-xs" title="Episode" />
                            <button onClick={() => saveEpisodePosition(s.id, ep)} className="text-xs font-semibold text-secondary shrink-0">Save</button>
                            <button onClick={() => setEpisodeEdits((ee) => { const n = { ...ee }; delete n[ep.id]; return n; })} className="text-xs font-semibold text-ink/40 shrink-0">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <span>S{ep.season_number}E{ep.episode_number} — {ep.title}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <button onClick={() => startEditEpisode(ep)} className="text-xs font-semibold text-secondary">Reorder</button>
                              <button onClick={() => detachEpisode(s.id, ep.id)} className="text-xs font-semibold text-red-500">Remove</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {(episodes[s.id] || []).length === 0 && <p className="text-xs text-ink/40">No episodes attached yet.</p>}
                  </div>

                  <div className="flex flex-wrap gap-2 items-end">
                    <label className="block">
                      <span className="text-xs font-semibold text-ink/50">Content item</span>
                      {/* Songs has no Series functionality (spec) - excluded
                          here so a song can never end up attached as an
                          episode even via this general-purpose picker. */}
                      <select
                        value={attachForm[s.id]?.content_id || ''}
                        onChange={(e) => setAttachForm((a) => ({ ...a, [s.id]: { ...a[s.id], content_id: e.target.value } }))}
                        className="mt-1 px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                      >
                        <option value="">Select content...</option>
                        {content.filter((c) => c.section !== 'songs').map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-ink/50">Season</span>
                      <input type="number" min="1" placeholder="1"
                        value={attachForm[s.id]?.season_number || ''}
                        onChange={(e) => setAttachForm((a) => ({ ...a, [s.id]: { ...a[s.id], season_number: e.target.value } }))}
                        className="mt-1 w-20 px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-ink/50">Episode</span>
                      <input type="number" min="1" placeholder="1"
                        value={attachForm[s.id]?.episode_number || ''}
                        onChange={(e) => setAttachForm((a) => ({ ...a, [s.id]: { ...a[s.id], episode_number: e.target.value } }))}
                        className="mt-1 w-20 px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
                    </label>
                    <button onClick={() => attachEpisode(s.id)} className="px-4 py-2 rounded-xl2 bg-brand-gradient text-white text-xs font-semibold shadow-glass">
                      Attach Episode
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
