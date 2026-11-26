import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotebookText, BookOpen } from 'lucide-react';
import api from '../api/axios.js';

function fmtDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function MyNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notes')
      .then((r) => setNotes(r.data?.data?.items || []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold mb-2">My Notes</h1>
      <p className="text-ink/60 mb-8">Your private Bible Study notes — only you can see these.</p>

      {loading ? (
        <p className="text-ink/50">Loading notes...</p>
      ) : notes.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <NotebookText className="w-10 h-10 mx-auto text-ink/20 mb-3" />
          <p className="text-ink/50 mb-4">You haven't written any notes yet.</p>
          <Link to="/bible-studies" className="text-secondary font-semibold text-sm">Browse Bible Studies →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {notes.map((n) => (
            <Link key={n.id} to={`/notes/${n.id}`} className="glass-card p-5 hover:-translate-y-1 transition-transform">
              <h3 className="font-display font-semibold text-ink mb-1.5 line-clamp-1">{n.title || 'Untitled Note'}</h3>
              <p className="text-sm text-ink/60 line-clamp-3 mb-3">{n.body}</p>
              <div className="flex items-center justify-between text-xs text-ink/40">
                {n.study_title ? (
                  <span className="flex items-center gap-1 truncate">
                    <BookOpen className="w-3.5 h-3.5 text-secondary shrink-0" /> <span className="truncate">{n.study_title}</span>
                  </span>
                ) : <span />}
                <span className="shrink-0">{fmtDate(n.updated_at || n.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
