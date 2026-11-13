import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Same VITE_BACKEND_URL as src/api/axios.js — falls back to the local
// XAMPP path so this keeps working unchanged in local dev.
const BACKEND_SHARE_BASE = `${(import.meta.env.VITE_BACKEND_URL || 'http://localhost/AIMplatform/Backend').replace(/\/$/, '')}/share.php`;

// lucide-react (this project's only icon set) ships generic glyphs, no
// brand marks — the real WhatsApp logo so the button reads as WhatsApp
// icon-only, without the word, same as every other word-replaced-by-icon
// spot. Matches lucide's own 24x24/currentColor conventions so it drops
// in anywhere a lucide icon would.
function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.67-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2C6.486 2 2 6.486 2 12.004c0 1.863.511 3.606 1.4 5.1L2 22l5.03-1.37a9.934 9.934 0 0 0 4.974 1.332h.004c5.518 0 10.004-4.486 10.004-10.004C22.012 6.486 17.526 2 12.004 2zm0 18.17a8.147 8.147 0 0 1-4.153-1.14l-.298-.177-3.01.82.81-2.95-.194-.302a8.144 8.144 0 0 1-1.254-4.417c0-4.505 3.666-8.17 8.172-8.17 4.505 0 8.17 3.665 8.17 8.17 0 4.506-3.665 8.166-8.243 8.166z" />
    </svg>
  );
}

export default function ShareButton({ item }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${BACKEND_SHARE_BASE}?slug=${encodeURIComponent(item.slug)}`;
  const shareText = `${item.title}\n${item.description || ''}\n\n${shareUrl}`;

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Icon-only (spec: replace the word with its icon everywhere) -
          aria-label/title keep these labeled for screen readers and on
          hover without taking up row width. */}
      <button
        onClick={handleWhatsApp}
        aria-label="Share on WhatsApp"
        title="Share on WhatsApp"
        className="flex items-center justify-center w-9 h-9 rounded-full bg-[#25D366] text-white shadow-glass hover:opacity-90 transition shrink-0"
      >
        <WhatsAppIcon className="w-4 h-4" />
      </button>
      <button
        onClick={handleCopy}
        aria-label={copied ? 'Link copied' : 'Copy link'}
        title={copied ? 'Link copied' : 'Copy link'}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-surface text-ink/70 border border-ink/10 hover:bg-ink/5 transition shrink-0"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}