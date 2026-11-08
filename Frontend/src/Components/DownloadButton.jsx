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
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface text-ink/70 text-xs font-semibold border border-ink/10 hover:bg-ink/5 transition"
    >
      <Download className="w-3.5 h-3.5" />
      Download
    </button>
  );
}
