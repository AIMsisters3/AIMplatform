import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, ChevronLeft, CheckCircle2, XCircle, RotateCcw,
  Trophy, PartyPopper,
} from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';

function emptyAnswerFor(question) {
  switch (question.type) {
    case 'fill_blank': return { text: '' };
    case 'matching': return { pairs: question.options.map((o) => ({ option_id: o.id, matched_value: '' })) };
    case 'ordering': return { ordered_option_ids: question.options.map((o) => o.id) };
    default: return { selected_option_ids: [] };
  }
}

function QuestionCard({ question, answer, onChange }) {
  if (question.type === 'fill_blank') {
    return (
      <input
        autoFocus value={answer.text} onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Type your answer..."
        className="w-full px-5 py-4 rounded-2xl border-2 border-ink/10 text-lg font-medium focus:outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/20"
      />
    );
  }

  if (question.type === 'matching') {
    return (
      <div className="space-y-3">
        {question.options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-3 bg-surface rounded-2xl p-3">
            <span className="font-bold text-ink flex-1">{o.label}</span>
            <ArrowRight className="w-4 h-4 text-ink/30 shrink-0" />
            <select
              value={answer.pairs[i]?.matched_value || ''}
              onChange={(e) => {
                const pairs = answer.pairs.map((p, idx) => (idx === i ? { ...p, matched_value: e.target.value } : p));
                onChange({ pairs });
              }}
              className="flex-1 px-3 py-2.5 rounded-xl border-2 border-ink/10 font-medium focus:outline-none focus:border-secondary"
            >
              <option value="">Choose...</option>
              {question.match_pool.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === 'ordering') {
    function move(i, dir) {
      const ids = [...answer.ordered_option_ids];
      const j = i + dir;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      onChange({ ordered_option_ids: ids });
    }
    const byId = Object.fromEntries(question.options.map((o) => [o.id, o]));
    return (
      <div className="space-y-2">
        {answer.ordered_option_ids.map((id, i) => (
          <div key={id} className="flex items-center gap-3 bg-surface rounded-2xl p-3">
            <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs font-bold text-ink/50 shrink-0">{i + 1}</span>
            <span className="font-medium text-ink flex-1">{byId[id]?.label}</span>
            <div className="flex gap-1 shrink-0">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-30">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === answer.ordered_option_ids.length - 1} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-30">↓</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // multiple_choice / true_false / picture_choice - tap to select, single-answer exclusive.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {question.options.map((o) => {
        const selected = answer.selected_option_ids.includes(o.id);
        return (
          <button
            key={o.id} type="button" onClick={() => onChange({ selected_option_ids: [o.id] })}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left font-bold transition-all ${
              selected ? 'border-secondary bg-secondary/10 text-secondary' : 'border-ink/10 bg-white text-ink hover:border-secondary/30'
            }`}
          >
            {o.image_url && <img src={o.image_url} alt="" className="w-12 h-12 rounded-xl object-contain shrink-0" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ResultScreen({ result, lessonId, lessonSlug, onRetry }) {
  const celebrate = result.score_percent >= 80;
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-[2rem] bg-white shadow-xl p-8 text-center mb-6 relative overflow-hidden">
        {celebrate && [...Array(10)].map((_, i) => (
          <motion.span
            key={i} className="absolute text-2xl" style={{ left: `${10 + i * 9}%`, top: '-10%' }}
            animate={{ y: [0, 260], rotate: [0, 360], opacity: [1, 1, 0] }}
            transition={{ duration: 1.8 + (i % 3) * 0.3, delay: i * 0.05, ease: 'easeIn' }}
          >
            {['🎉', '⭐', '🎊', '✨'][i % 4]}
          </motion.span>
        ))}
        <span className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${celebrate ? 'bg-gradient-to-br from-amber-300 to-orange-400' : 'bg-gradient-to-br from-sky-300 to-blue-400'}`}>
          {celebrate ? <Trophy className="w-11 h-11 text-white" /> : <PartyPopper className="w-11 h-11 text-white" />}
        </span>
        <p className="font-display font-extrabold text-4xl text-ink mb-1">{result.score_percent}%</p>
        <p className="text-lg font-bold text-ink/70 mb-1">{result.message}</p>
        <p className="text-sm text-ink/40">{result.correct_count} of {result.total_questions} correct{result.is_best ? ' · New best score!' : ''}</p>
      </motion.div>

      <div className="space-y-3 mb-8">
        {result.questions.map((q, i) => (
          <div key={q.question_id} className={`rounded-2xl p-4 ${q.is_correct ? 'bg-emerald-50' : 'bg-rose-50'}`}>
            <div className="flex items-start gap-2">
              {q.is_correct ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm">{i + 1}. {q.prompt}</p>
                {!q.is_correct && q.correct_answer?.length > 0 && (
                  <p className="text-xs text-emerald-700 font-medium mt-1">Correct answer: {q.correct_answer.join(', ')}</p>
                )}
                {q.explanation && <p className="text-xs text-ink/50 mt-1 italic">{q.explanation}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button onClick={onRetry} className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold shadow-lg">
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
        <Link to={lessonId ? `/kids/lessons/${lessonSlug}` : '/kids/activities'} className="px-6 py-3 rounded-full bg-white border-2 border-ink/10 text-ink font-bold">
          {lessonId ? 'Back to Lesson' : 'Back to Activities'}
        </Link>
      </div>
    </div>
  );
}

export default function ActivityPlayer() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setResult(null);
    setIndex(0);
    setError('');
    api.get(`/activities/${slug}`)
      .then((r) => {
        const item = r.data.data.item;
        setActivity(item);
        setAnswers(Object.fromEntries(item.questions.map((q) => [q.id, emptyAnswerFor(q)])));
      })
      .catch(() => setActivity(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8EC' }}><div className="w-10 h-10 rounded-full border-4 border-emerald-300 border-t-emerald-500 animate-spin" /></div>;
  }
  if (!activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#FFF8EC' }}>
        <p className="text-ink/50 font-medium">We couldn't find that activity.</p>
        <Link to="/kids/activities" className="px-5 py-2.5 rounded-full bg-emerald-500 text-white font-bold text-sm">Back to Activities</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6" style={{ backgroundColor: '#FFF8EC' }}>
        <p className="font-display font-bold text-xl text-ink">Sign in to play "{activity.title}"!</p>
        <p className="text-ink/50 max-w-xs">Signing in lets us save your score so you can see how you improve.</p>
        <Link to="/login" className="px-6 py-3 rounded-full bg-emerald-500 text-white font-bold shadow-lg">Sign In</Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FFF8EC' }}>
        <ResultScreen result={result} lessonId={activity.lesson_id} lessonSlug={activity.lesson_slug} onRetry={load} />
      </div>
    );
  }

  const question = activity.questions[index];
  const isLast = index === activity.questions.length - 1;

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const r = await api.post(`/activities/${activity.id}/submit`, {
        submission_token: activity.submission_token,
        answers,
      });
      setResult(r.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit your answers. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8EC' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link to="/kids/activities" className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Activities
        </Link>

        <div className="flex items-center justify-between mb-2">
          <p className="font-display font-bold text-ink">{activity.title}</p>
          <p className="text-xs font-bold text-ink/40">{index + 1} / {activity.questions.length}</p>
        </div>
        <div className="h-2 rounded-full bg-ink/10 overflow-hidden mb-8">
          <motion.div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500" animate={{ width: `${((index + 1) / activity.questions.length) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
            className="rounded-[1.75rem] bg-white shadow-lg p-6 sm:p-8"
          >
            {question.image_url && <img src={question.image_url} alt="" className="w-full max-h-56 object-contain rounded-2xl mb-5" />}
            <h2 className="font-display font-bold text-xl text-ink mb-6">{question.prompt}</h2>
            <QuestionCard question={question} answer={answers[question.id]} onChange={(next) => setAnswers((a) => ({ ...a, [question.id]: next }))} />
          </motion.div>
        </AnimatePresence>

        {error && <p className="text-sm text-rose-500 font-medium mt-4 text-center">{error}</p>}

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}
            className="flex items-center gap-1 px-5 py-3 rounded-full bg-white border-2 border-ink/10 text-ink font-bold disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {isLast ? (
            <button onClick={submit} disabled={submitting} className="flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold shadow-lg disabled:opacity-60">
              {submitting ? 'Checking...' : 'Submit'} <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setIndex((i) => i + 1)} className="flex items-center gap-1 px-7 py-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold shadow-lg">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
