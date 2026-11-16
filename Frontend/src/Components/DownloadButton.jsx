import React from 'react';
import { Download } from 'lucide-react';

/**
 * Shown on every piece of uploaded media (video/audio/pdf/image) - anyone
 * can download, signed in or not, same as sharing/copying a link already
 * work without an account. Gated on is_downloadable (migration 041):
 * missing/undefined (most content types don't select this column
 * explicitly in older queries) is treated as downloadable, to match
 * every existing content type's unchanged behavior - only an explicit
 * false/0 (Bible Stories' own admin toggle, default off) hides it.
 */
export default function DownloadButton({ item }) {
  if (!item?.media_url) return null;
  if (item.is_downloadable === false || item.is_downloadable === 0 || item.is_downloadable === '0') return null;

  function handleClick() {
    const link = document.createElement('a');
    link.href = item.media_url;
    link.download = item.title || '';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Download"
      title="Download"
      className="flex items-center justify-center w-9 h-9 rounded-full bg-surface text-ink/70 border border-ink/10 hover:bg-ink/5 transition shrink-0"
    >
      <Download className="w-4 h-4" />
    </button>
  );
}
