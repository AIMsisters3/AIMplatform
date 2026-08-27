import React, { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, List, ListOrdered, Link2, Quote, Heading2, Undo2, Redo2 } from 'lucide-react';

/**
 * A small, dependency-free rich text editor for Article / News Article /
 * Devotional bodies. Deliberately not TipTap/Quill/etc. — the project has
 * no editor library installed, and pulling one in is a bigger call than
 * this redesign warrants. Uses contentEditable + document.execCommand,
 * which covers exactly the formatting set the CMS needs (headings, bold,
 * italic, links, lists, quotes) and outputs plain HTML into `body`
 * (already a LONGTEXT column documented as supporting rich text/HTML).
 */
const TOOLBAR = [
  { command: 'formatBlock', value: 'h2', icon: Heading2, label: 'Heading' },
  { command: 'bold', icon: Bold, label: 'Bold' },
  { command: 'italic', icon: Italic, label: 'Italic' },
  { command: 'insertUnorderedList', icon: List, label: 'Bullet list' },
  { command: 'insertOrderedList', icon: ListOrdered, label: 'Numbered list' },
  { command: 'formatBlock', value: 'blockquote', icon: Quote, label: 'Quote' },
  { command: 'createLink', icon: Link2, label: 'Link', prompt: true },
];

export default function RichTextEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const isFirstRender = useRef(true);

  // Only sync external value -> DOM when it actually differs (e.g. loading
  // a draft), never on every keystroke — that would fight the browser's
  // own cursor position mid-edit.
  useEffect(() => {
    if (!ref.current) return;
    if (isFirstRender.current) {
      ref.current.innerHTML = value || '';
      isFirstRender.current = false;
      return;
    }
    if (document.activeElement !== ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const emitChange = useCallback(() => {
    onChange(ref.current?.innerHTML || '');
  }, [onChange]);

  function runCommand(item) {
    ref.current?.focus();
    if (item.prompt) {
      const url = window.prompt('Link URL');
      if (!url) return;
      document.execCommand(item.command, false, url);
    } else {
      document.execCommand(item.command, false, item.value);
    }
    emitChange();
  }

  const isEmpty = !value || value === '<br>' || value === '<p><br></p>';

  return (
    <div className="rounded-2xl border border-ink/10 focus-within:ring-2 focus-within:ring-secondary overflow-hidden bg-white">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-ink/10 bg-surface/60">
        {TOOLBAR.map((item) => (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            title={item.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand(item)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary hover:shadow-sm transition"
          >
            <item.icon className="w-4 h-4" />
          </button>
        ))}
        <span className="w-px h-5 bg-ink/10 mx-1" />
        <button
          type="button"
          aria-label="Undo"
          title="Undo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { document.execCommand('undo'); emitChange(); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary transition"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Redo"
          title="Redo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { document.execCommand('redo'); emitChange(); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary transition"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        {isEmpty && placeholder && (
          <p className="absolute top-4 left-4 text-sm text-ink/35 pointer-events-none select-none">{placeholder}</p>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          role="textbox"
          aria-multiline="true"
          aria-label="Article body"
          className="prose prose-sm max-w-none min-h-[220px] max-h-[480px] overflow-y-auto px-4 py-4 text-sm text-ink focus:outline-none [&_h2]:text-lg [&_h2]:font-display [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-secondary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-ink/60 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-secondary [&_a]:underline"
        />
      </div>
    </div>
  );
}
