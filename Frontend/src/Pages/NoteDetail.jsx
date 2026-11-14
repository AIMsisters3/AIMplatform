import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, AlertCircle, Pencil, Check, Loader2, Trash2, BookOpen } from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import logo from '../assets/lg.png';

function autoGrow(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function fmtDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function NoteDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const autosaveTimerRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get(`/notes/${id}`)
      .then((r) => {
        if (cancelled) return;
        const item = r.data?.data?.item;
        setNote(item);
        setTitle(item?.title || '');
        setBody(item?.body || '');
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'This note could not be loaded.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (editing && bodyRef.current) autoGrow(bodyRef.current);
  }, [editing]);

  function persist(nextTitle, nextBody) {
    if (!nextBody.trim()) return;
    setSaveStatus('saving');
    api.put(`/notes/${id}`, { title: nextTitle.trim() || '', body: nextBody })
      .then(() => {
        setNote((n) => ({ ...n, title: nextTitle.trim() || null, body: nextBody, updated_at: new Date().toISOString() }));
        setSaveStatus('saved');
      })
      .catch(() => setSaveStatus('idle'));
  }

  function queueAutosave(nextTitle, nextBody) {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => persist(nextTitle, nextBody), 1500);
  }

  function finishEditing() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    persist(title, body);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this note? This cannot be undone.')) return;
    await api.delete(`/notes/${id}`);
    window.location.href = '/notes';
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-6 py-16 text-center text-ink/50">Loading note...</div>;
  }
  if (error || !note) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
        <p className="text-ink/60">{error || 'Note not found.'}</p>
        <Link to="/notes" className="text-secondary text-sm font-semibold mt-4 inline-block">Back to My Notes</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink/5 print:bg-white">
      <div className="max-w-3xl mx-auto px-4 py-6 print:hidden flex items-center justify-between flex-wrap gap-3">
        <Link to="/notes" className="text-sm text-ink/50 hover:text-ink">&larr; Back to My Notes</Link>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <span className="flex items-center gap-1.5 text-xs text-ink/40 mr-1">
                {saveStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>}
                {saveStatus === 'saved' && <><Check className="w-3 h-3 text-emerald-500" /> Saved</>}
              </span>
              <button
                onClick={finishEditing}
                className="px-4 py-2 rounded-xl2 bg-brand-gradient text-white text-sm font-semibold shadow-glass"
              >
                Done Editing
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl2 glass-card text-sm font-semibold"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl2 bg-brand-gradient text-white text-sm font-semibold shadow-glass"
              >
                <Printer className="w-4 h-4" /> Print / Save as PDF
              </button>
              <button
                onClick={handleDelete}
                aria-label="Delete note"
                className="w-10 h-10 rounded-xl2 glass-card flex items-center justify-center text-ink/40 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-glass print:shadow-none print:rounded-none p-8 sm:p-14 mb-10 print:mb-0 print:max-w-full">
        <div className="flex items-center gap-3 border-b border-ink/10 pb-6 mb-8">
          <img src={logo} alt="AIMsisters logo" className="h-10 w-auto" />
          <div>
            <p className="font-display font-bold text-ink">AIMsisters</p>
            <p className="text-xs text-ink/40">Bible Study Notes</p>
          </div>
        </div>

        {editing ? (
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); queueAutosave(e.target.value, body); }}
            placeholder="Note title"
            className="w-full text-2xl md:text-3xl font-display font-bold text-ink mb-3 border-b border-ink/10 focus:outline-none focus:border-secondary pb-2"
          />
        ) : (
          <h1 className="text-2xl md:text-3xl font-display font-bold text-ink mb-3">
            {note.title || 'Untitled Note'}
          </h1>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink/50 mb-6">
          {note.study_title && (
            <Link to={`/bible-studies/${note.study_slug}`} className="flex items-center gap-1.5 hover:text-secondary print:pointer-events-none">
              <BookOpen className="w-4 h-4 text-secondary" /> {note.study_title}
            </Link>
          )}
          <span>Created {fmtDate(note.created_at)}</span>
          {note.updated_at && note.updated_at !== note.created_at && <span>Updated {fmtDate(note.updated_at)}</span>}
        </div>

        {editing ? (
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => { setBody(e.target.value); autoGrow(e.target); queueAutosave(title, e.target.value); }}
            rows={6}
            className="w-full px-4 py-3 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary resize-none overflow-hidden text-ink/80 leading-relaxed"
          />
        ) : (
          <div className="prose prose-sm sm:prose-base max-w-none text-ink/80 leading-relaxed whitespace-pre-line">
            {note.body}
          </div>
        )}

        <p className="text-sm text-ink/50 italic mt-10 pt-6 border-t border-ink/10">
          Notes by {user?.name || 'you'}
        </p>
      </div>

      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          nav, footer { display: none !important; }
        }
      `}</style>
    </div>
  );
}
