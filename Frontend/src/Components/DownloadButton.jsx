import React from 'react';
import { Download } from 'lucide-react';

/**
 * Shown on every piece of uploaded media (video/audio/pdf/image) - anyone
 * can download, signed in or not, same as sharing/copying a link already
 * work without an account.
 */
export default function DownloadButton({ item }) {
  if (!item?.media_url) return null;

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
