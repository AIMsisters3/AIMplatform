import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Same VITE_BACKEND_URL as src/api/axios.js — falls back to the local
// XAMPP path so this keeps working unchanged in local dev.
const BACKEND_SHARE_BASE = `${(import.meta.env.VITE_BACKEND_URL || 'http://localhost/AIMTech/Backend').replace(/\/$/, '')}/share.php`;

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
    <div className="flex items-center gap-2">
      <button
        onClick={handleWhatsApp}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-xs font-semibold shadow-glass hover:opacity-90 transition"
      >
        Share on WhatsApp
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface text-ink/70 text-xs font-semibold border border-ink/10 hover:bg-ink/5 transition"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}