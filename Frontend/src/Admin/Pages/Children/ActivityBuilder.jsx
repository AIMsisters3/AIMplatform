import React, { useEffect, useState } from 'react';
import { Plus, Eye, ArrowLeft } from 'lucide-react';
import api from '../../../api/axios.js';
import MediaField from '../../Components/children/MediaField.jsx';
import QuestionEditor, { QUESTION_TYPES, blankQuestion } from './QuestionEditor.jsx';
import ActivityPlayerPreview from './ActivityPlayerPreview.jsx';

const emptyForm = {
  title: '', description: '', lesson_id: '', cover_image: null, status: 'draft', publish_date: '',
};

/** Strips the builder's editing convenience fields down to exactly what the backend's replaceQuestions() expects, adding ordering's computed correct_order. */
function questionsForSave(questions) {
  return questions.map((q) => ({
    ...q,
    options: q.options.map((o, i) => (q.type === 'ordering' ? { ...o, correct_order: i + 1 } : o)),
  }));
}

export default function ActivityBuilder({ activityId, onDone }) {
  const [lessons, setLessons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [questions, setQuestions] = useState([blankQuestion()]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [loading, setLoading] = useState(!!activityId);

  useEffect(() => {
    api.get('/lessons', { params: { status: 'all', limit: 100 } })
      .then((r) => setLessons(r.data?.data?.items || []))
      .catch(() => setLessons([]));
  }, []);

  useEffect(() => {
    if (!activityId) return;
    api.get(`/activities/${activityId}/preview`)
      .then((r) => {
        const item = r.data.data.item;
        setForm({
          title: item.title, description: item.description || '', lesson_id: item.lesson_id || '',
          cover_image: item.cover_image || null, status: item.status, publish_date: item.publish_date ? item.publish_date.slice(0, 16) : '',
        });
        setQuestions(item.questions.length ? item.questions : [blankQuestion()]);
      })
      .finally(() => setLoading(false));
  }, [activityId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateQuestion(i, next) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? next : q)));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, blankQuestion(qs[0]?.type)]);
  }

  function removeQuestion(i) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) { setMessage('A title is required.'); return; }
    const cleanQuestions = questions.filter((q) => q.prompt.trim());
    if (cleanQuestions.length === 0) { setMessage('Add at least one question.'); return; }

    setSaving(true);
    setMessage('');
    const body = {
      ...form,
      lesson_id: form.lesson_id || null,
      type: cleanQuestions[0]?.type || 'multiple_choice',
      publish_date: form.status === 'scheduled' && form.publish_date ? form.publish_date : null,
      questions: questionsForSave(cleanQuestions),
    };

    try {
      if (activityId) {
        await api.put(`/activities/${activityId}`, body);
      } else {
        await api.post('/activities', body);
      }
      onDone();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save this activity.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-ink/50">Loading activity...</p>;

  if (previewing) {
    return (
      <div className="space-y-5">
        <button onClick={() => setPreviewing(false)} className="flex items-center gap-1.5 text-sm font-semibold text-secondary">
          <ArrowLeft className="w-4 h-4" /> Back to Editing
        </button>
        <ActivityPlayerPreview title={form.title} questions={questionsForSave(questions.filter((q) => q.prompt.trim()))} />
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <button type="button" onClick={onDone} className="flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-secondary">
        <ArrowLeft className="w-4 h-4" /> Back to Activities
      </button>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-display font-semibold">{activityId ? 'Edit Activity' : 'New Activity'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Title</span>
            <input required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Creation Quiz"
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold text-ink/50">Description</span>
            <textarea rows={2} value={form.description} onChange={(e) => update('description', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Belongs to Lesson (optional)</span>
            <select value={form.lesson_id} onChange={(e) => update('lesson_id', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
              <option value="">None - standalone activity</option>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </label>
          <MediaField label="Cover Image (optional)" kind="image" folder="children/activities" value={form.cover_image} onChange={(url) => update('cover_image', url)} />
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
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-semibold">Questions</h4>
          <span className="text-xs text-ink/40">{QUESTION_TYPES.length} types available</span>
        </div>
        {questions.map((q, i) => (
          <QuestionEditor key={i} question={q} index={i} onChange={(next) => updateQuestion(i, next)} onRemove={() => removeQuestion(i)} />
        ))}
        <button type="button" onClick={addQuestion} className="flex items-center gap-1.5 text-sm font-semibold text-secondary">
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>

      {message && <p className="text-sm text-secondary">{message}</p>}

      <div className="flex items-center gap-3">
        <button disabled={saving} className="px-6 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-50">
          {saving ? 'Saving...' : activityId ? 'Save Changes' : 'Create Activity'}
        </button>
        <button type="button" onClick={() => setPreviewing(true)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-ink/10 text-sm font-semibold text-secondary shadow-sm">
          <Eye className="w-4 h-4" /> Preview
        </button>
      </div>
    </form>
  );
}
