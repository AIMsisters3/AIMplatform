import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * PDF download for a devotion/news article's actual text content (see
 * articlePdf.js — a real generated document, not a screenshot).
 * Login-gated per spec: a guest is asked to log in rather than the
 * button just being hidden, same pattern as the generic DownloadButton
 * used for media files.
 *
 * articlePdf.js is dynamically imported (only on click), not imported
 * at module scope — jsPDF pulls in html2canvas + DOMPurify as part of
 * its bundle (400KB+) even though none of that is used here, and this
 * button lives inside ContentViewerModal, which every public page that
 * shows articles renders. A static import would ship that weight to
 * every visitor; this way only someone who actually downloads an
 * article ever fetches it, matching this codebase's existing
 * route-level lazy-loading (see App.jsx's React.lazy pages).
 */
export default function ArticleDownloadButton({ item }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);

  async function handleClick() {
    if (!user) {
      if (window.confirm('Please log in to download this article. Go to the login page now?')) {
        navigate('/login');
      }
      return;
    }
    setGenerating(true);
    try {
      const { downloadArticlePdf } = await import('../utils/articlePdf.js');
      await downloadArticlePdf(item);
    } catch {
      window.alert('The PDF could not be generated. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={generating}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface text-ink/70 text-xs font-semibold border border-ink/10 hover:bg-ink/5 transition disabled:opacity-60"
    >
      {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {generating ? 'Preparing PDF...' : 'Download PDF'}
    </button>
  );
}
