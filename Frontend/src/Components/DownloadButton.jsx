import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Shown on every piece of uploaded media (video/audio/pdf/image) regardless
 * of login state, per spec: anyone sees the button, but only a signed-in
 * visitor's click actually downloads - a guest is asked to log in first
 * instead of the button just being hidden/disabled with no explanation.
 */
export default function DownloadButton({ item }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!item?.media_url) return null;

  function handleClick() {
    if (!user) {
      if (window.confirm('Please log in to download this. Go to the login page now?')) {
        navigate('/login');
      }
      return;
    }

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
