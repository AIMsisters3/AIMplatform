import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

/**
 * PDF download for a devotion/news article's actual text content (see
 * articlePdf.js — a real generated document, not a screenshot). Anyone
 * can download, signed in or not, same as the generic DownloadButton
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
  const [generating, setGenerating] = useState(false);

  async function handleClick() {
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
      aria-label={generating ? 'Preparing PDF' : 'Download PDF'}
      title={generating ? 'Preparing PDF...' : 'Download PDF'}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-surface text-ink/70 border border-ink/10 hover:bg-ink/5 transition disabled:opacity-60 shrink-0"
    >
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
    </button>
  );
}
