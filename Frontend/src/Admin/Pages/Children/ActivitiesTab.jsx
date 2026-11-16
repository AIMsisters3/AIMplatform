import React, { useCallback, useEffect, useState } from 'react';
import { Puzzle, Eye, EyeOff, Trash2, Pencil, Plus } from 'lucide-react';
import api from '../../../api/axios.js';
import ActivityBuilder from './ActivityBuilder.jsx';
import { QUESTION_TYPES } from './QuestionEditor.jsx';

const TYPE_LABEL = Object.fromEntries(QUESTION_TYPES.map((t) => [t.value, t.label]));

export default function ActivitiesTab() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/activities', { params: { status: 'all', limit: 100 } })
      .then((r) => setActivities(r.data?.data?.items || []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(activity) {
    const next = activity.status === 'published' ? 'draft' : 'published';
    await api.put(`/activities/${activity.id}`, { status: next });
    load();
  }

  async function remove(activity) {
    if (!confirm(`Delete "${activity.title}"? This can't be undone - attempt history will be lost too.`)) return;
    await api.delete(`/activities/${activity.id}`);
    load();
  }

  function handleDone() {
    setEditingId(null);
    setCreating(false);
    load();
  }

  if (creating || editingId) {
    return <ActivityBuilder activityId={editingId} onDone={handleDone} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Puzzle className="w-4 h-4 text-secondary" /> Bible Activities
        </h3>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition">
          <Plus className="w-4 h-4" /> New Activity
        </button>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading activities...</p>
      ) : activities.length === 0 ? (
        <p className="text-ink/40 text-sm">No activities yet - create the first one above.</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="glass-card p-4 flex items-center gap-4">
              {a.cover_image ? (
                <img src={a.cover_image} alt="" className="w-14 h-14 rounded-xl2 object-cover shrink-0 bg-surface" />
              ) : (
                <div className="w-14 h-14 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center shrink-0 text-secondary">
                  <Puzzle className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{a.title}</p>
                <p className="text-xs text-ink/50 capitalize">
                  {a.status} · {TYPE_LABEL[a.type] || a.type} · {a.question_count} questions
                  {a.lesson_title ? ` · ${a.lesson_title}` : ''} · {a.attempt_count} attempts{a.average_score ? ` · avg ${a.average_score}%` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => toggleStatus(a)} title={a.status === 'published' ? 'Unpublish' : 'Publish'} className="text-ink/50 hover:text-secondary">
                  {a.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditingId(a.id)} title="Edit" className="text-ink/50 hover:text-secondary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(a)} title="Delete" className="text-ink/50 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
