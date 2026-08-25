import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, FileText, User, Calendar, CheckCircle2, Trash2, Pencil } from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getItemKind, getYouTubeEmbed } from '../utils/mediaKind.js';
import CommentsSection from '../Components/CommentsSection.jsx';
import ShareButton from '../Components/ShareButton.jsx';
import ErrorBoundary from '../Components/ErrorBoundary.jsx';

const FORMAT_LABELS = {
  short_film: 'Short Film', video: 'Video', sermon: 'Sermon', panel: 'Panel Discussion',
  audio: 'Audio', animated: 'Animated', documentary: 'Documentary', pdf_notes: 'PDF / Notes',
};

export default function BibleStudyDetail() {
  const { slugOrId } = useParams();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const savedPositionRef = useRef(0);

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
    const { data } = await api.post(`/bible-studies/${item.id}/notes`, { body: noteText });
    setNotes((prev) => [{ id: data.data.id, body: noteText, created_at: new Date().toISOString() }, ...prev]);
    setNoteText('');
    if (!progress || progress.status === 'not_started') saveProgress('in_progress', progress?.progress_percent || 10);
  }

  async function saveNoteEdit(id) {
    await api.put(`/notes/${id}`, { body: editingText });
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, body: editingText } : n)));
    setEditingNoteId(null);
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
  const commentsAllowed = item.allow_comments === 1 || item.allow_comments === '1' || item.allow_comments === true;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link to="/bible-studies" className="text-sm text-secondary font-semibold mb-6 inline-block">← Back to Bible Studies</Link>

      <div className="glass-card overflow-hidden mb-8">
        {kind === 'video' && youtubeSrc && (
          <div className="aspect-video w-full bg-ink">
            <iframe src={youtubeSrc} title={item.title} className="w-full h-full" allow="accelerate-compute; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}
        {kind === 'video' && !youtubeSrc && item.media_url && (
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

          <div className="mb-6"><ShareButton item={item} /></div>

          {item.description && <p className="text-ink/70 mb-5">{item.description}</p>}
          {item.body && <div className="prose prose-sm max-w-none text-ink/80 leading-relaxed whitespace-pre-line mb-5">{item.body}</div>}
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
          <form onSubmit={addNote} className="flex gap-3 mb-5">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a note on this study..."
              className="flex-1 px-4 py-2.5 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <button className="px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition">
              Add
            </button>
          </form>

          {notes.length === 0 ? (
            <p className="text-sm text-ink/40">No notes yet — jot down what stands out to you as you study.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="bg-surface rounded-2xl px-4 py-3">
                  {editingNoteId === n.id ? (
                    <div className="flex gap-2">
                      <input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-full border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                      />
                      <button onClick={() => saveNoteEdit(n.id)} className="text-xs font-semibold text-secondary">Save</button>
                      <button onClick={() => setEditingNoteId(null)} className="text-xs font-semibold text-ink/40">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-ink/80">{n.body}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => { setEditingNoteId(n.id); setEditingText(n.body); }} aria-label="Edit note">
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
