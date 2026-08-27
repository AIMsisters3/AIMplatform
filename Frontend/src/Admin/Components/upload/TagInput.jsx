import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Chip-style editor for the existing `content.tags` column, which stores
 * a plain comma-separated string (see Content.php / ContentController.php)
 * — this component only changes how it's edited, not what's stored.
 * `value` and `onChange` both deal in the same comma-separated string so
 * the parent form doesn't need to know this is chip UI under the hood.
 */
export default function TagInput({ value, onChange, placeholder = 'Add a tag and press Enter' }) {
  const [draft, setDraft] = useState('');
  const tags = (value || '').split(',').map((t) => t.trim()).filter(Boolean);

  function commitDraft() {
    const next = draft.trim();
    if (!next) return;
    if (!tags.includes(next)) {
      onChange([...tags, next].join(', '));
    }
    setDraft('');
  }

  function removeTag(tag) {
    onChange(tags.filter((t) => t !== tag).join(', '));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl2 border border-ink/10 focus-within:ring-2 focus-within:ring-secondary bg-white">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-brand-gradient-soft text-secondary text-xs font-medium">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`Remove tag ${tag}`}
            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/70"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={tags.length === 0 ? placeholder : 'Add another...'}
        className="flex-1 min-w-[120px] py-0.5 text-sm focus:outline-none placeholder:text-ink/35"
      />
    </div>
  );
}
