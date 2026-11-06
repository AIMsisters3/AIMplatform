import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered, Link2, Quote, Undo2, Redo2,
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Trash2, Loader2, Palette,
} from 'lucide-react';
import api from '../../../api/axios.js';

/**
 * A dependency-free rich text editor for Article / News Article /
 * Devotional / Bible Study bodies. Deliberately not TipTap/Quill/etc. —
 * the project has no editor library installed, and pulling one in for a
 * shared-hosting deployment is a bigger call than this warrants. Uses
 * contentEditable + document.execCommand for text formatting, plus direct
 * DOM manipulation for image size/alignment (execCommand has no per-image
 * sizing story). Outputs plain HTML into `body` (a LONGTEXT column
 * documented as supporting rich text/HTML) — every image/color/alignment
 * choice is captured as an inline style on the saved HTML itself, so it
 * renders identically wherever body is shown (admin preview, public
 * ContentViewerModal, BibleStudyDetail) without depending on any
 * particular page's CSS being loaded.
 */
const HEADINGS = [
  { value: 'P', label: 'Paragraph' },
  { value: 'H1', label: 'Heading 1' },
  { value: 'H2', label: 'Heading 2' },
  { value: 'H3', label: 'Heading 3' },
];

const COLORS = ['#2D2A4A', '#7A2CF3', '#E548B9', '#2DA8FF', '#059669', '#DC2626', '#D97706'];

const IMAGE_SIZES = [
  { label: 'S', width: '25%' },
  { label: 'M', width: '50%' },
  { label: 'L', width: '75%' },
  { label: 'Full', width: '100%' },
];

// Tags/attributes allowed to survive a paste. Everything else (script,
// style, font, inline "style" that sets font-size/family, tracked class
// names from the source page, etc.) is stripped so pasting from Word/a
// webpage can't silently change this article's text size or fonts.
const PASTE_ALLOWED_TAGS = new Set(['P', 'BR', 'H1', 'H2', 'H3', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'IMG']);

function sanitizePastedHtml(html) {
  const container = document.createElement('div');
  container.innerHTML = html;

  function clean(node) {
    // Walk a static copy of the children since we mutate as we go.
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        return;
      }
      if (!PASTE_ALLOWED_TAGS.has(child.tagName)) {
        // Unwrap disallowed elements (e.g. <span style="font-size:40px">) —
        // keep their text/children, drop the wrapper and its styling.
        while (child.firstChild) node.insertBefore(child.firstChild, child);
        node.removeChild(child);
        return;
      }
      // Strip every attribute except the one or two each allowed tag needs.
      const keep = child.tagName === 'A' ? ['href'] : child.tagName === 'IMG' ? ['src', 'alt'] : [];
      Array.from(child.attributes).forEach((attr) => {
        if (!keep.includes(attr.name)) child.removeAttribute(attr.name);
      });
      if (child.tagName === 'A') child.setAttribute('target', '_blank');
      clean(child);
    });
  }

  clean(container);
  return container.innerHTML;
}

export default function RichTextEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const isFirstRender = useRef(true);
  const savedRangeRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showColors, setShowColors] = useState(false);

  // Browsers disagree on what Enter inserts in a bare contentEditable
  // (a wrapping <div> vs. a bare <br>), which is what silently loses
  // paragraph structure while typing. Forcing <p> makes Enter behave
  // consistently and matches the CSS below/the public-page renderer,
  // which both already expect real <p> tags.
  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'p');
  }, []);

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

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const sel = window.getSelection();
    if (!savedRangeRef.current) {
      ref.current?.focus();
      return;
    }
    sel.removeAllRanges();
    sel.addRange(savedRangeRef.current);
  }

  function runCommand(command, arg) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  }

  function runLink() {
    const url = window.prompt('Link URL');
    if (!url) return;
    runCommand('createLink', url);
  }

  function runHeading(value) {
    runCommand('formatBlock', value === 'P' ? 'p' : value.toLowerCase());
  }

  function applyColor(color) {
    runCommand('foreColor', color);
    setShowColors(false);
  }

  function openImagePicker() {
    saveSelection();
    fileInputRef.current?.click();
  }

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('folder', 'general');
      const res = await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data.data.url;

      restoreSelection();
      const html = `<img src="${url}" alt="" style="width:50%;display:block;margin:12px auto;border-radius:12px;" />`;
      document.execCommand('insertHTML', false, html);
      emitChange();
    } catch {
      window.alert('The image could not be uploaded. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }

  // Direct DOM style edits (not execCommand — there's no per-image sizing
  // command) on whichever image the admin last clicked, so it's possible to
  // position/size a specific image rather than the whole selection.
  function alignSelectedImage(align) {
    if (!selectedImage) return;
    if (align === 'center') {
      selectedImage.style.float = '';
      selectedImage.style.display = 'block';
      selectedImage.style.margin = '12px auto';
    } else {
      selectedImage.style.display = '';
      selectedImage.style.float = align;
      selectedImage.style.margin = align === 'left' ? '4px 16px 8px 0' : '4px 0 8px 16px';
    }
    emitChange();
  }

  function resizeSelectedImage(width) {
    if (!selectedImage) return;
    selectedImage.style.width = width;
    emitChange();
  }

  function removeSelectedImage() {
    if (!selectedImage) return;
    selectedImage.remove();
    setSelectedImage(null);
    emitChange();
  }

  function handleEditorClick(e) {
    if (e.target.tagName === 'IMG') {
      setSelectedImage(e.target);
    } else {
      setSelectedImage(null);
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    if (html) {
      document.execCommand('insertHTML', false, sanitizePastedHtml(html));
    } else {
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }
    emitChange();
  }

  const isEmpty = !value || value === '<br>' || value === '<p><br></p>';

  return (
    <div className="rounded-2xl border border-ink/10 focus-within:ring-2 focus-within:ring-secondary overflow-hidden bg-white">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-ink/10 bg-surface/60">
        <select
          aria-label="Heading level"
          onMouseDown={(e) => e.preventDefault()}
          onChange={(e) => runHeading(e.target.value)}
          defaultValue="P"
          className="h-8 px-2 rounded-lg text-xs font-medium text-ink/70 bg-white border border-ink/10 focus:outline-none focus:ring-1 focus:ring-secondary"
        >
          {HEADINGS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
        </select>

        <span className="w-px h-5 bg-ink/10 mx-1" />

        {[
          { command: 'bold', icon: Bold, label: 'Bold' },
          { command: 'italic', icon: Italic, label: 'Italic' },
          { command: 'underline', icon: Underline, label: 'Underline' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            title={item.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand(item.command)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary hover:shadow-sm transition"
          >
            <item.icon className="w-4 h-4" />
          </button>
        ))}

        <div className="relative">
          <button
            type="button"
            aria-label="Text color"
            title="Text color"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={() => setShowColors((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary hover:shadow-sm transition"
          >
            <Palette className="w-4 h-4" />
          </button>
          {showColors && (
            <div className="absolute z-10 top-9 left-0 flex gap-1.5 p-2 rounded-xl border border-ink/10 bg-white shadow-glass">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onMouseDown={(e) => { e.preventDefault(); restoreSelection(); applyColor(c); }}
                  className="w-5 h-5 rounded-full border border-ink/10"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        <span className="w-px h-5 bg-ink/10 mx-1" />

        {[
          { command: 'insertUnorderedList', icon: List, label: 'Bullet list' },
          { command: 'insertOrderedList', icon: ListOrdered, label: 'Numbered list' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            title={item.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand(item.command)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary hover:shadow-sm transition"
          >
            <item.icon className="w-4 h-4" />
          </button>
        ))}
        <button
          type="button"
          aria-label="Quote"
          title="Quote"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runHeading('BLOCKQUOTE')}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary hover:shadow-sm transition"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Link"
          title="Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={runLink}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary hover:shadow-sm transition"
        >
          <Link2 className="w-4 h-4" />
        </button>

        <span className="w-px h-5 bg-ink/10 mx-1" />

        <button
          type="button"
          aria-label="Insert image"
          title="Insert image"
          disabled={uploadingImage}
          onMouseDown={(e) => e.preventDefault()}
          onClick={openImagePicker}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary hover:shadow-sm transition disabled:opacity-50"
        >
          {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

        <span className="w-px h-5 bg-ink/10 mx-1" />

        <button
          type="button"
          aria-label="Undo"
          title="Undo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('undo')}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary transition"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Redo"
          title="Redo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand('redo')}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary transition"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Contextual toolbar — only appears once an inserted image is clicked,
          for positioning/sizing that one image. */}
      {selectedImage && (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-ink/10 bg-secondary/5">
          <span className="text-[11px] font-semibold text-ink/40 mr-1">Image:</span>
          {[
            { align: 'left', icon: AlignLeft, label: 'Align left' },
            { align: 'center', icon: AlignCenter, label: 'Align center' },
            { align: 'right', icon: AlignRight, label: 'Align right' },
          ].map((item) => (
            <button
              key={item.align}
              type="button"
              aria-label={item.label}
              title={item.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => alignSelectedImage(item.align)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-secondary transition"
            >
              <item.icon className="w-3.5 h-3.5" />
            </button>
          ))}
          <span className="w-px h-5 bg-ink/10 mx-1" />
          {IMAGE_SIZES.map((s) => (
            <button
              key={s.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => resizeSelectedImage(s.width)}
              className="px-2 h-7 rounded-lg text-[11px] font-semibold text-ink/60 hover:bg-white hover:text-secondary transition"
            >
              {s.label}
            </button>
          ))}
          <span className="w-px h-5 bg-ink/10 mx-1" />
          <button
            type="button"
            aria-label="Remove image"
            title="Remove image"
            onMouseDown={(e) => e.preventDefault()}
            onClick={removeSelectedImage}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink/60 hover:bg-white hover:text-red-500 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
          onClick={handleEditorClick}
          onPaste={handlePaste}
          role="textbox"
          aria-multiline="true"
          aria-label="Article body"
          className="prose prose-sm max-w-none min-h-[220px] max-h-[560px] overflow-y-auto px-4 py-4 text-sm text-ink focus:outline-none [&_h1]:text-2xl [&_h1]:font-display [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-display [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-base [&_h3]:font-display [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-secondary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-ink/60 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-secondary [&_a]:underline [&_img]:cursor-pointer [&_img:hover]:opacity-90"
        />
      </div>
    </div>
  );
}
