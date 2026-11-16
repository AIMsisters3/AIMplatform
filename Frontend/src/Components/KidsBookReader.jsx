import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// A real page-by-page book reader for Kids Bible Lessons (spec: "must
// open as a child-friendly book-style reader — page-by-page, swipe
// navigation, page-turn animation — not a raw PDF viewer"). Renders each
// PDF page to a canvas via pdfjs-dist rather than embedding the browser's
// own PDF plugin, which has no swipe/page-turn behavior and is
// unreliable on mobile (many mobile browsers just download the file
// instead of showing it inline).
export default function KidsBookReader({ url, title, onClose }) {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [[pageNum, direction], setPageState] = useState([1, 0]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    pdfjsLib.getDocument(url).promise
      .then((doc) => {
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        setPageState([1, 0]);
      })
      .catch(() => { if (!cancelled) setError("This book couldn't be opened. Please try again later."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  const renderPage = useCallback((num) => {
    if (!pdf) return;
    setPageLoading(true);
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }
    pdf.getPage(num).then((page) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const containerWidth = Math.min(window.innerWidth * 0.9, 640);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      task.promise
        .then(() => setPageLoading(false))
        .catch(() => {}); // a cancelled render (page flipped again mid-render) is expected, not an error
    }).catch(() => setPageLoading(false));
  }, [pdf]);

  useEffect(() => {
    if (pdf) renderPage(pageNum);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, pageNum]);

  function goTo(next) {
    setPageState(([current]) => {
      const clamped = Math.max(1, Math.min(numPages, next));
      return [clamped, clamped > current ? 1 : -1];
    });
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowRight') goTo(pageNum + 1);
    if (e.key === 'ArrowLeft') goTo(pageNum - 1);
    if (e.key === 'Escape') onClose();
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 50) {
      goTo(deltaX < 0 ? pageNum + 1 : pageNum - 1);
    }
    touchStartX.current = null;
  }

  const pageVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0, rotateY: dir > 0 ? 20 : -20 }),
    center: { x: 0, opacity: 1, rotateY: 0 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0, rotateY: dir > 0 ? -20 : 20 }),
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-amber-900/90 backdrop-blur-sm flex flex-col items-center justify-center px-4 py-6"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-label={title || 'Bible lesson book'}
    >
      <div className="w-full max-w-2xl flex items-center justify-between mb-3">
        <h2 className="text-white font-display font-bold text-base sm:text-lg truncate pr-4">{title}</h2>
        <button
          onClick={onClose}
          className="shrink-0 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition"
          aria-label="Close book"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="relative w-full max-w-2xl bg-white rounded-[28px] shadow-2xl overflow-hidden flex items-center justify-center"
        style={{ minHeight: '50vh', perspective: 1200 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-3 text-amber-600">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-semibold">Opening the book...</p>
          </div>
        ) : error ? (
          <div className="py-24 flex flex-col items-center gap-3 text-center px-8">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-ink/60">{error}</p>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={pageNum}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="w-full flex items-center justify-center py-6"
              >
                <canvas ref={canvasRef} className="max-w-full rounded-xl2 shadow-md" />
              </motion.div>
            </AnimatePresence>
            {pageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            )}
          </>
        )}

        {!loading && !error && (
          <>
            <button
              onClick={() => goTo(pageNum - 1)}
              disabled={pageNum <= 1}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-glass flex items-center justify-center text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50 transition"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => goTo(pageNum + 1)}
              disabled={pageNum >= numPages}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-glass flex items-center justify-center text-amber-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50 transition"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {!loading && !error && numPages > 0 && (
        <p className="mt-4 text-white/80 text-sm font-semibold">
          Page {pageNum} of {numPages}
        </p>
      )}
    </div>
  );
}
