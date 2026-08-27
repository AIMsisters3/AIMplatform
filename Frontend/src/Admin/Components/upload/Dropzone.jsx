import React, { useRef, useState } from 'react';
import { UploadCloud, X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Presentational drag-and-drop file picker. The actual upload request
 * (progress, folder, error handling) is owned by the parent — this
 * component only ever hands back the raw File via onSelect so it stays
 * reusable across the thumbnail dropzone and the type-aware main media
 * dropzone without duplicating upload logic in two places.
 */
export default function Dropzone({
  icon: Icon = UploadCloud,
  title,
  acceptHint,
  accept,
  file,
  previewUrl,
  uploadedUrl,
  uploading,
  progress,
  error,
  onSelect,
  onRemove,
  kind = 'file',
  compact = false,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const hasFile = !!(file || uploadedUrl);

  function handleFiles(fileList) {
    const picked = fileList?.[0];
    if (picked) onSelect(picked);
  }

  if (hasFile) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white overflow-hidden">
        <div className={`flex items-center gap-4 p-4 ${compact ? '' : ''}`}>
          {kind === 'image' && previewUrl ? (
            <img src={previewUrl} alt="" className="w-16 h-16 rounded-xl2 object-cover shrink-0 bg-surface" />
          ) : (
            <div className="w-16 h-16 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-secondary" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">{file?.name || 'File uploaded'}</p>
            <p className="text-xs text-ink/40">
              {file ? formatBytes(file.size) : 'Previously uploaded'}
            </p>

            {uploading && (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-ink/10 overflow-hidden">
                  <div className="h-full bg-brand-gradient transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[11px] text-ink/40 mt-1">{progress}% uploaded</p>
              </div>
            )}

            {!uploading && uploadedUrl && (
              <p className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Upload complete
              </p>
            )}

            {!uploading && error && (
              <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 text-xs font-semibold text-secondary hover:text-secondary/80"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1 text-xs font-semibold text-ink/40 hover:text-red-500"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>

        {kind === 'audio' && uploadedUrl && !uploading && (
          <audio controls src={uploadedUrl} className="w-full px-4 pb-4" />
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      aria-label={title}
      className={`rounded-2xl border-2 border-dashed transition-colors cursor-pointer text-center px-6 ${compact ? 'py-6' : 'py-10'} ${
        dragOver ? 'border-secondary bg-brand-gradient-soft' : 'border-ink/15 bg-surface/60 hover:border-secondary/40 hover:bg-surface'
      } ${error ? 'border-red-300' : ''}`}
    >
      <div className="w-11 h-11 rounded-full bg-white shadow-glass flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-secondary" />
      </div>
      <p className="text-sm font-medium text-ink">Drag &amp; drop {title.toLowerCase()} here</p>
      <p className="text-xs text-ink/40 mt-1">or</p>
      <span className="inline-block mt-2 px-4 py-1.5 rounded-full bg-white border border-ink/10 text-xs font-semibold text-secondary shadow-sm">
        Browse Files
      </span>
      {acceptHint && <p className="text-[11px] text-ink/35 mt-3">{acceptHint}</p>}
      {error && <p className="flex items-center justify-center gap-1 text-[11px] text-red-500 mt-2 font-medium"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

export { formatBytes };
