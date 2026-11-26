import React from 'react';
import { CheckCircle2 } from 'lucide-react';

/**
 * Read-only "how will this look to a child" preview - admin-only (spec:
 * "Preview the activity before publishing"), so correct answers are
 * shown openly here, unlike the real public player which never reveals
 * them before submission (see Activity::questionsForPlayer()).
 */
export default function ActivityPlayerPreview({ title, questions }) {
  if (questions.length === 0) {
    return <div className="glass-card p-8 text-center text-ink/40">Add at least one question to preview this activity.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="glass-card p-6 bg-gradient-to-br from-secondary/10 to-accent/10">
        <h3 className="font-display font-bold text-lg">{title || 'Untitled Activity'}</h3>
        <p className="text-xs text-ink/50 mt-1">{questions.length} {questions.length === 1 ? 'question' : 'questions'} · preview mode (correct answers shown)</p>
      </div>

      {questions.map((q, i) => (
        <div key={i} className="glass-card p-5">
          <p className="text-xs font-bold text-secondary mb-2">Question {i + 1}</p>
          <p className="font-medium mb-3">{q.prompt}</p>
          {q.image_url && <img src={q.image_url} alt="" className="w-full max-w-xs rounded-xl2 mb-3" />}

          {q.type === 'matching' ? (
            <div className="space-y-1.5">
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2 text-sm bg-surface rounded-xl2 px-3 py-2">
                  <span className="font-medium">{o.label}</span>
                  <span className="text-ink/30">→</span>
                  <span className="text-emerald-600 font-medium">{o.match_value}</span>
                </div>
              ))}
            </div>
          ) : q.type === 'ordering' ? (
            <ol className="space-y-1.5 list-decimal list-inside">
              {q.options.map((o, oi) => <li key={oi} className="text-sm bg-surface rounded-xl2 px-3 py-2">{o.label}</li>)}
            </ol>
          ) : q.type === 'fill_blank' ? (
            <p className="text-sm text-emerald-600 font-medium bg-surface rounded-xl2 px-3 py-2 inline-block">
              Accepted: {q.options.map((o) => o.label).filter(Boolean).join(', ') || '(none set)'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {q.options.map((o, oi) => (
                <div key={oi} className={`flex items-center gap-2 text-sm rounded-xl2 px-3 py-2 ${o.is_correct ? 'bg-emerald-50 text-emerald-700 font-medium' : 'bg-surface'}`}>
                  {o.is_correct && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  {o.image_url && <img src={o.image_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                  {o.label}
                </div>
              ))}
            </div>
          )}

          {q.explanation && <p className="text-xs text-ink/40 mt-3 italic">Explanation: {q.explanation}</p>}
        </div>
      ))}
    </div>
  );
}
