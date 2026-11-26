import React from 'react';
import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import MediaField from '../../Components/children/MediaField.jsx';

export const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True or False' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'matching', label: 'Matching' },
  { value: 'ordering', label: 'Arrange in Order' },
  { value: 'picture_choice', label: 'Picture Question' },
];

export function blankQuestion(type = 'multiple_choice') {
  const base = { type, prompt: '', image_url: null, marks: 1, explanation: '' };
  switch (type) {
    case 'true_false':
      return { ...base, options: [{ label: 'True', is_correct: true }, { label: 'False', is_correct: false }] };
    case 'fill_blank':
      return { ...base, options: [{ label: '', is_correct: true }] };
    case 'matching':
      return { ...base, options: [{ label: '', match_value: '' }, { label: '', match_value: '' }] };
    case 'ordering':
      return { ...base, options: [{ label: '' }, { label: '' }] };
    default:
      return { ...base, options: [{ label: '', is_correct: true }, { label: '', is_correct: false }] };
  }
}

/** One admin-builder question card - its options editor adapts entirely to `question.type` (spec: "the interface should adapt to the selected activity type"). */
export default function QuestionEditor({ question, index, onChange, onRemove }) {
  function set(field, value) {
    onChange({ ...question, [field]: value });
  }
  function setOption(i, field, value) {
    const options = question.options.map((o, idx) => (idx === i ? { ...o, [field]: value } : o));
    onChange({ ...question, options });
  }
  function addOption() {
    const blank = question.type === 'matching' ? { label: '', match_value: '' } : question.type === 'ordering' ? { label: '' } : { label: '', is_correct: false };
    onChange({ ...question, options: [...question.options, blank] });
  }
  function removeOption(i) {
    onChange({ ...question, options: question.options.filter((_, idx) => idx !== i) });
  }
  function moveOption(i, dir) {
    const options = [...question.options];
    const j = i + dir;
    if (j < 0 || j >= options.length) return;
    [options[i], options[j]] = [options[j], options[i]];
    onChange({ ...question, options });
  }
  function setSingleCorrect(i) {
    onChange({ ...question, options: question.options.map((o, idx) => ({ ...o, is_correct: idx === i })) });
  }

  return (
    <div className="bg-surface rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold text-secondary bg-white rounded-full px-3 py-1 shrink-0">Question {index + 1}</span>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-ink/50">
            Marks
            <input type="number" min="1" value={question.marks} onChange={(e) => set('marks', Math.max(1, Number(e.target.value) || 1))}
              className="w-14 px-2 py-1 rounded-lg border border-ink/10 text-xs" />
          </label>
          <button type="button" onClick={onRemove} className="text-ink/40 hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <select value={question.type} onChange={(e) => set('type', e.target.value)}
        className="px-3 py-2 rounded-xl2 border border-ink/10 text-sm font-semibold">
        {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      <textarea rows={2} value={question.prompt} onChange={(e) => set('prompt', e.target.value)}
        placeholder={question.type === 'matching' ? 'Instructions, e.g. "Match each character to their story"' : question.type === 'ordering' ? 'Instructions, e.g. "Put these events in order"' : 'Question text'}
        className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />

      {question.type === 'picture_choice' && (
        <MediaField label="Question Image" kind="image" folder="children/activities" value={question.image_url} onChange={(url) => set('image_url', url)} />
      )}

      {/* ---- Options editor, one shape per type ---- */}
      {(question.type === 'multiple_choice' || question.type === 'true_false' || question.type === 'picture_choice') && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink/50">Answer options - tick the correct one(s)</p>
          {question.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="checkbox" checked={!!o.is_correct} onChange={(e) => setOption(i, 'is_correct', e.target.checked)}
                title="Correct answer" className="w-4 h-4 accent-secondary shrink-0" />
              <input value={o.label} onChange={(e) => setOption(i, 'label', e.target.value)} placeholder={`Option ${i + 1}`}
                className="flex-1 px-3 py-1.5 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
              {question.type === 'picture_choice' && (
                <MediaField kind="image" folder="children/activities" value={o.image_url} onChange={(url) => setOption(i, 'image_url', url)} />
              )}
              {question.type !== 'true_false' && question.options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="text-ink/30 hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          {question.type !== 'true_false' && (
            <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs font-semibold text-secondary">
              <Plus className="w-3.5 h-3.5" /> Add Option
            </button>
          )}
        </div>
      )}

      {question.type === 'fill_blank' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink/50">Accepted answer(s) - add a few spellings/variants if helpful</p>
          {question.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={o.label} onChange={(e) => setOption(i, 'label', e.target.value)} placeholder="Accepted answer"
                className="flex-1 px-3 py-1.5 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
              {question.options.length > 1 && (
                <button type="button" onClick={() => removeOption(i)} className="text-ink/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs font-semibold text-secondary">
            <Plus className="w-3.5 h-3.5" /> Add Alternate Spelling
          </button>
        </div>
      )}

      {question.type === 'matching' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink/50">Pairs - what matches with what</p>
          {question.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={o.label} onChange={(e) => setOption(i, 'label', e.target.value)} placeholder="e.g. David"
                className="flex-1 px-3 py-1.5 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
              <span className="text-ink/30 shrink-0">→</span>
              <input value={o.match_value} onChange={(e) => setOption(i, 'match_value', e.target.value)} placeholder="e.g. Defeated Goliath"
                className="flex-1 px-3 py-1.5 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
              {question.options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="text-ink/30 hover:text-red-500 shrink-0"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs font-semibold text-secondary">
            <Plus className="w-3.5 h-3.5" /> Add Pair
          </button>
        </div>
      )}

      {question.type === 'ordering' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink/50">Items, already arranged in the CORRECT order top to bottom</p>
          {question.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[11px] font-bold text-ink/40 shrink-0">{i + 1}</span>
              <input value={o.label} onChange={(e) => setOption(i, 'label', e.target.value)} placeholder={`Item ${i + 1}`}
                className="flex-1 px-3 py-1.5 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
              <button type="button" onClick={() => moveOption(i, -1)} disabled={i === 0} className="text-ink/30 hover:text-secondary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => moveOption(i, 1)} disabled={i === question.options.length - 1} className="text-ink/30 hover:text-secondary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
              {question.options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="text-ink/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs font-semibold text-secondary">
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>
      )}

      <label className="block">
        <span className="text-xs font-semibold text-ink/50">Explanation (shown after the child answers)</span>
        <input value={question.explanation} onChange={(e) => set('explanation', e.target.value)} placeholder="Optional - helps a child understand the right answer"
          className="mt-1 w-full px-3 py-1.5 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary" />
      </label>
    </div>
  );
}
