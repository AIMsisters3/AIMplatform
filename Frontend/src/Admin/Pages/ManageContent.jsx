import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Image as ImageIcon, Eye, Loader2 } from 'lucide-react';
import api from '../../api/axios.js';
import { isLive } from '../../utils/mediaKind.js';
import { useAuth } from '../../context/AuthContext.jsx';

const SECTIONS = [
  { value: '', label: 'All Sections' },
  { value: 'media_library', label: 'Content / Media Library' },
  { value: 'news', label: 'News' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'bible_study', label: 'Bible Study' },
  { value: 'devotions', label: 'Devotions' },
  { value: 'kids', label: 'Children' },
  { value: 'songs', label: 'Songs' },
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

// Mirrors UploadContent.jsx's own viewHrefFor() - same public destination
// per section, kept here rather than shared since it's a small, stable,
// self-contained mapping.
function viewHrefFor(section, slug) {
  switch (section) {
    case 'bible_study': return `/bible-studies/${slug}`;
    case 'media_library': return `/content?item=${slug}`;
    case 'news': return '/news';
    case 'gallery': return '/gallery';
    case 'devotions': return '/devotions';
    case 'kids': return `/kids?item=${slug}`;
    case 'songs': return `/songs?item=${slug}`;
    default: return '/content';
  }
}

function formatDate(value) {
  if (!value) return '—';
  return value.slice(0, 10);
}

export default function ManageContent() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table'); // table | grid
  const [scope, setScope] = useState('all'); // all | mine
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  // A search/section/scope change must always start back at page 1 -
  // otherwise changing filters while on page 2+ would silently re-request
  // that same page number against the new, narrower result set, which can
  // show an empty or skipped page until the admin manually navigates back.
  // Tracked via a ref (rather than a second effect keyed on the filters)
  // so the corrected page=1 request fires immediately, in the same effect
  // run that detects the filter change, instead of one render late.
  const prevFiltersRef = useRef({ search, section, scope });

  const load = useCallback((pageToLoad) => {
    setLoading(true);
    api
      .get('/content', {
        params: {
          search: search || undefined,
          section: section || undefined,
          status: 'all',
          mine: scope === 'mine' ? 1 : undefined,
          page: pageToLoad,
          limit: 12,
        },
      })
      .then((r) => setItems(r.data.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, section, scope]);

  useEffect(() => {
    const filtersChanged = prevFiltersRef.current.search !== search
      || prevFiltersRef.current.section !== section
      || prevFiltersRef.current.scope !== scope;
    prevFiltersRef.current = { search, section, scope };
    const effectivePage = filtersChanged ? 1 : page;
    if (filtersChanged && page !== 1) {
      setPage(1);
    }
    load(effectivePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, section, scope, page, load]);

  function toggleSelect(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function bulkAction(action) {
    if (selected.length === 0) return;
    try {
      await api.post('/content/bulk', { action, ids: selected });
      setMessage(`Bulk ${action} applied to ${selected.length} item(s).`);
      setSelected([]);
      load(page);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Bulk action failed.');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this content item? This cannot be undone.')) return;
    await api.delete(`/content/${id}`);
    load(page);
  }

  async function handleDuplicate(id) {
    await api.post(`/content/${id}/duplicate`);
    load(page);
  }

  async function toggleStatus(item) {
    const nextStatus = item.status === 'published' ? 'draft' : 'published';
    setBusyId(item.id);
    try {
      await api.put(`/content/${item.id}`, { status: nextStatus });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i)));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not change status.');
    } finally {
      setBusyId(null);
    }
  }

  async function archiveItem(id) {
    setBusyId(id);
    try {
      await api.put(`/content/${id}`, { status: 'archived' });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'archived' } : i)));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not archive.');
    } finally {
      setBusyId(null);
    }
  }

  function ThumbCell({ item }) {
    return item.thumbnail ? (
      <img src={item.thumbnail} alt="" loading="lazy" decoding="async" className="w-12 h-12 rounded-lg object-cover bg-surface shrink-0" />
    ) : (
      <div className="w-12 h-12 rounded-lg bg-brand-gradient-soft flex items-center justify-center shrink-0 text-secondary">
        <ImageIcon className="w-5 h-5" />
      </div>
    );
  }

  function RowActions({ item }) {
    const busy = busyId === item.id;
    return (
      <div className="flex flex-wrap justify-end gap-2 text-xs font-semibold">
        {item.status === 'published' && (
          <a
            href={viewHrefFor(item.section, item.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-ink/50 hover:text-ink"
          >
            <Eye className="w-3.5 h-3.5" /> View
          </a>
        )}
        <button disabled={busy} onClick={() => toggleStatus(item)} className="text-secondary disabled:opacity-50">
          {item.status === 'published' ? 'Unpublish' : 'Publish'}
        </button>
        {item.status !== 'archived' && (
          <button disabled={busy} onClick={() => archiveItem(item.id)} className="text-amber-600 disabled:opacity-50">Archive</button>
        )}
        <button onClick={() => handleDuplicate(item.id)} className="text-secondary">Duplicate</button>
        <button onClick={() => handleDelete(item.id)} className="text-red-500">Delete</button>
      </div>
    );
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

      {/* All Content / My Posted Content — a real ownership filter (see
          ContentController::index()'s mine=1 handling, resolved server-side
          from the logged-in admin's own JWT, never a frontend name match).
          The existing section/search filters below still apply inside
          whichever scope is selected. */}
      <div className="flex gap-2">
        <button
          onClick={() => setScope('all')}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition ${
            scope === 'all' ? 'bg-brand-gradient text-white shadow-glass' : 'bg-white/70 text-ink/60 border border-ink/10 hover:text-ink'
          }`}
        >
          All Content
        </button>
        <button
          onClick={() => setScope('mine')}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition ${
            scope === 'mine' ? 'bg-brand-gradient text-white shadow-glass' : 'bg-white/70 text-ink/60 border border-ink/10 hover:text-ink'
          }`}
        >
          My Posted Content{user?.name ? ` (${user.name.split(' ')[0]})` : ''}
        </button>
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
        <div className="glass-card overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-ink/5 animate-pulse">
              <div className="w-4 h-4 rounded bg-ink/10 shrink-0" />
              <div className="w-12 h-12 rounded-lg bg-ink/10 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/3 bg-ink/10 rounded-full" />
                <div className="h-2.5 w-1/5 bg-ink/10 rounded-full" />
              </div>
              <div className="h-6 w-16 bg-ink/10 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">
          {scope === 'mine'
            ? "You haven't posted any content matching these filters yet."
            : 'No content matches your filters yet.'}
        </div>
      ) : view === 'table' ? (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-ink/10">
                <th className="p-4"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? items.map((i) => i.id) : [])} /></th>
                <th className="p-4">Thumbnail</th>
                <th className="p-4">Title</th>
                <th className="p-4">Section</th>
                <th className="p-4">Type</th>
                <th className="p-4">Category</th>
                <th className="p-4">Language</th>
                <th className="p-4">Status</th>
                <th className="p-4">Views</th>
                <th className="p-4">Posted</th>
                <th className="p-4">Updated</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-ink/5 hover:bg-white/50">
                  <td className="p-4"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                  <td className="p-4"><ThumbCell item={item} /></td>
                  <td className="p-4 font-medium">
                    {item.title}
                    {isLive(item) && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold align-middle">LIVE</span>
                    )}
                  </td>
                  <td className="p-4 capitalize text-ink/60">{sectionLabel(item.section)}</td>
                  <td className="p-4 capitalize text-ink/60">{item.media_type?.replace('_', ' ')}</td>
                  <td className="p-4 text-ink/60">{item.category_name || '—'}</td>
                  <td className="p-4 text-ink/60 uppercase text-xs">{item.language || '—'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[item.status] || 'bg-ink/10'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-ink/60">{item.views ?? 0}</td>
                  <td className="p-4 text-ink/40 text-xs">{formatDate(item.publish_date || item.created_at)}</td>
                  <td className="p-4 text-ink/40 text-xs">{formatDate(item.updated_at)}</td>
                  <td className="p-4"><RowActions item={item} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="glass-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <ThumbCell item={item} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[item.status] || 'bg-ink/10'}`}>{item.status}</span>
                    <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                  </div>
                  <h4 className="font-semibold truncate">
                    {item.title}
                    {isLive(item) && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold align-middle">LIVE</span>
                    )}
                  </h4>
                </div>
              </div>
              <p className="text-xs text-ink/50 capitalize mb-1">
                {sectionLabel(item.section)} &middot; {item.media_type?.replace('_', ' ')} &middot; {item.category_name || 'No category'} &middot; {(item.language || '').toUpperCase() || 'No language'}
              </p>
              <p className="text-xs text-ink/40 mb-3">{item.views ?? 0} views &middot; Posted {formatDate(item.publish_date || item.created_at)} &middot; Updated {formatDate(item.updated_at)}</p>
              <RowActions item={item} />
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
