import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, FileText, User, Calendar, CheckCircle2, Trash2, Pencil, NotebookText, Check, Loader2 } from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getItemKind, getYouTubeEmbed, isLive } from '../utils/mediaKind.js';
import CommentsSection from '../Components/CommentsSection.jsx';
import ShareButton from '../Components/ShareButton.jsx';
import DownloadButton from '../Components/DownloadButton.jsx';
import ErrorBoundary from '../Components/ErrorBoundary.jsx';

// Grows a textarea to fit its content as the user types, instead of a
// fixed-height box that forces scrolling inside itself.
function autoGrow(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

const FORMAT_LABELS = {
  short_film: 'Short Film', video: 'Video', sermon: 'Sermon', panel: 'Panel Discussion',
  audio: 'Audio', podcast: 'Podcast', animated: 'Animated', documentary: 'Documentary', pdf_notes: 'PDF / Notes',
};

export default function BibleStudyDetail() {
  const { slugOrId } = useParams();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingText, setEditingText] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const savedPositionRef = useRef(0);
  const autosaveTimerRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/bible-studies/${slugOrId}`)
      .then((r) => {
        setItem(r.data.data.item);
        setProgress(r.data.data.progress);
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [slugOrId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!item || !user) return;
    api.get(`/bookmarks`).then((r) => {
      setBookmarked((r.data.data.items || []).some((i) => i.id === item.id));
    }).catch(() => {});
    api.get(`/bible-studies/${item.id}/notes`)
      .then((r) => setNotes(r.data.data.items))
      .catch(() => setNotes([]));
  }, [item, user]);

  async function toggleBookmark() {
    if (!item) return;
    const { data } = await api.post(`/bookmarks/${item.id}`);
    setBookmarked(data.data.bookmarked);
  }

  async function saveProgress(status, percent) {
    if (!item || !user) return;
    const { data } = await api.post(`/bible-studies/${item.id}/progress`, {
      status,
      progress_percent: percent,
      last_position_seconds: savedPositionRef.current,
    });
    setProgress(data.data.progress);
  }

  async function markComplete() {
    await saveProgress('completed', 100);
  }

  async function addNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    const { data } = await api.post(`/bible-studies/${item.id}/notes`, { body: noteText, title: noteTitle.trim() || undefined });
    setNotes((prev) => [{ id: data.data.id, title: noteTitle.trim() || null, body: noteText, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev]);
    setNoteTitle('');
    setNoteText('');
    if (!progress || progress.status === 'not_started') saveProgress('in_progress', progress?.progress_percent || 10);
  }

  function startEditingNote(n) {
    setEditingNoteId(n.id);
    setEditingTitle(n.title || '');
    setEditingText(n.body);
    setSaveStatus('idle');
  }

  async function persistNoteEdit(id, title, body) {
    if (!body.trim()) return;
    setSaveStatus('saving');
    try {
      await api.put(`/notes/${id}`, { body, title: title.trim() || '' });
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title: title.trim() || null, body } : n)));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('idle');
    }
  }

  // Debounced autosave while editing — waits for a pause in typing, so an
  // accidental tab-close or navigation mid-edit doesn't lose recent
  // changes; the explicit Save button (below) still exists for an
  // immediate, deliberate save with the same status feedback.
  function queueAutosave(id, title, body) {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => persistNoteEdit(id, title, body), 1500);
  }

  function finishEditingNote() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setEditingNoteId(null);
    setSaveStatus('idle');
  }

  async function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    await api.delete(`/notes/${id}`);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-24 text-ink/50">Loading study...</div>;
  if (!item) return <div className="max-w-4xl mx-auto px-6 py-24 text-ink/50">Bible study not found. <Link to="/bible-studies" className="text-secondary font-semibold">Back to Bible Studies</Link></div>;

  const kind = getItemKind(item);
  const youtubeSrc = kind === 'video' ? getYouTubeEmbed(item.media_url) : null;
  const live = isLive(item);
  const commentsAllowed = item.allow_comments === 1 || item.allow_comments === '1' || item.allow_comments === true;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link to="/bible-studies" className="text-sm text-secondary font-semibold mb-6 inline-block">← Back to Bible Studies</Link>

      <div className="glass-card overflow-hidden mb-8">
        {kind === 'video' && youtubeSrc && (
          <div className="relative aspect-video w-full bg-ink">
            {live && (
              <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE NOW
              </span>
            )}
            <iframe src={youtubeSrc} title={item.title} className="w-full h-full" allow="accelerate-compute; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}
        {kind === 'video' && !youtubeSrc && live && item.media_url && (
          <div className="w-full bg-ink py-10 flex flex-col items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE NOW
            </span>
            <a href={item.media_url} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition">
              Watch the Live Stream
            </a>
          </div>
        )}
        {kind === 'video' && !youtubeSrc && !live && item.media_url && (
          <video
            controls
            className="w-full max-h-[50vh] bg-ink"
            src={item.media_url}
            onTimeUpdate={(e) => { savedPositionRef.current = Math.floor(e.target.currentTime); }}
            onPause={(e) => {
              if (!user || !e.target.duration) return;
              const pct = Math.min(100, Math.round((e.target.currentTime / e.target.duration) * 100));
              saveProgress(pct >= 95 ? 'completed' : 'in_progress', pct);
            }}
          />
        )}
        {kind === 'audio' && item.media_url && <audio controls className="w-full p-6" src={item.media_url} />}
        {kind === 'pdf' && item.media_url && <iframe src={item.media_url} title={item.title} className="w-full h-[60vh]" />}

        <div className="p-8">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <span className="inline-block text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                {FORMAT_LABELS[item.format] || item.format}
              </span>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-ink">{item.title}</h1>
            </div>
            {user && (
              <button
                onClick={toggleBookmark}
                className="w-11 h-11 rounded-full glass-card flex items-center justify-center shrink-0 hover:bg-white transition"
                aria-label={bookmarked ? 'Remove bookmark' : 'Save for later'}
              >
                {bookmarked ? <BookmarkCheck className="w-5 h-5 text-secondary" /> : <Bookmark className="w-5 h-5 text-ink/50" />}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/50 mb-4">
            {item.speaker && <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-secondary" />{item.speaker}</span>}
            {item.publish_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-secondary" />
                {new Date(item.publish_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <ShareButton item={item} />
            <DownloadButton item={item} />
          </div>

          {item.description && <p className="text-ink/70 mb-5">{item.description}</p>}
          {item.body && (
            <div
              className="prose prose-sm max-w-none text-ink/80 leading-relaxed mb-5"
              dangerouslySetInnerHTML={{ __html: item.body }}
            />
          )}
          {item.bible_references && (
            <div className="flex items-start gap-2 bg-surface rounded-2xl px-4 py-3 mb-5">
              <span className="text-sm text-ink/70 italic">📖 {item.bible_references}</span>
            </div>
          )}
          {item.study_guide_url && (
            <a href={item.study_guide_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition">
              <FileText className="w-4 h-4" />Download Study Guide
            </a>
          )}
        </div>
      </div>

      {user && (
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Your Progress</h3>
            {progress?.status === 'completed' ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </span>
            ) : (
              <button onClick={markComplete} className="text-sm font-semibold text-secondary">Mark as Complete</button>
            )}
          </div>
          <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
            <div
              className="h-full bg-brand-gradient rounded-full transition-all"
              style={{ width: `${progress?.progress_percent ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-ink/40 mt-2">{progress?.progress_percent ?? 0}% complete</p>
        </div>
      )}

      {user && (
        <div className="glass-card p-6 mb-8">
          <h3 className="font-display font-semibold mb-4">My Notes <span className="text-ink/40 font-normal">(private — only you can see these)</span></h3>
          <form onSubmit={addNote} className="space-y-2 mb-5">
            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title (optional)"
              className="w-full px-4 py-2 rounded-full border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <textarea
              value={noteText}
              onChange={(e) => { setNoteText(e.target.value); autoGrow(e.target); }}
              placeholder="Write a note on this study..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary resize-none overflow-hidden"
            />
            <div className="flex justify-end">
              <button className="px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition">
                Add Note
              </button>
            </div>
          </form>

          {notes.length === 0 ? (
            <p className="text-sm text-ink/40">No notes yet — jot down what stands out to you as you study.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="bg-surface rounded-2xl px-4 py-3">
                  {editingNoteId === n.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingTitle}
                        onChange={(e) => { setEditingTitle(e.target.value); queueAutosave(n.id, e.target.value, editingText); }}
                        placeholder="Note title (optional)"
                        className="w-full px-3 py-1.5 rounded-full border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                      />
                      <textarea
                        value={editingText}
                        onChange={(e) => { setEditingText(e.target.value); autoGrow(e.target); queueAutosave(n.id, editingTitle, e.target.value); }}
                        rows={2}
                        autoFocus
                        className="w-full px-3 py-1.5 rounded-2xl border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary resize-none overflow-hidden"
                      />
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs text-ink/40">
                          {saveStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>}
                          {saveStatus === 'saved' && <><Check className="w-3 h-3 text-emerald-500" /> Saved</>}
                        </span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => persistNoteEdit(n.id, editingTitle, editingText)} className="text-xs font-semibold text-secondary">Save</button>
                          <button onClick={finishEditingNote} className="text-xs font-semibold text-ink/40">Done</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/notes/${n.id}`} className="min-w-0 group">
                        {n.title && <p className="text-sm font-semibold text-ink group-hover:text-secondary transition-colors mb-0.5">{n.title}</p>}
                        <p className="text-sm text-ink/80 line-clamp-3">{n.body}</p>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link to={`/notes/${n.id}`} aria-label="Open notebook view">
                          <NotebookText className="w-3.5 h-3.5 text-ink/40 hover:text-secondary" />
                        </Link>
                        <button onClick={() => startEditingNote(n)} aria-label="Edit note">
                          <Pencil className="w-3.5 h-3.5 text-ink/40 hover:text-secondary" />
                        </button>
                        <button onClick={() => deleteNote(n.id)} aria-label="Delete note">
                          <Trash2 className="w-3.5 h-3.5 text-ink/40 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ErrorBoundary>
        <CommentsSection contentId={item.id} allowComments={commentsAllowed} />
      </ErrorBoundary>
    </div>
  );
}
