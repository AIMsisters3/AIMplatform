import { useEffect, useState } from 'react';

// Tiny module-level cache so the same path is only ever checked once
// per page-load, no matter how many components ask about it.
const cache = new Map();

/**
 * Checks (once, quietly) whether a public asset actually exists yet.
 * Used so photo/gif/music placeholders can render a beautiful styled
 * placeholder instead of a broken image/audio element until the real
 * file is dropped into /public.
 *
 * Uses fetch() rather than an <img>/<audio> src probe so a missing
 * file never produces a "failed to load resource" console error.
 */
export default function useAssetExists(src) {
  const [exists, setExists] = useState(cache.get(src) ?? null);

  useEffect(() => {
    if (!src) {
      setExists(false);
      return;
    }
    if (cache.has(src)) {
      setExists(cache.get(src));
      return;
    }

    let cancelled = false;
    fetch(src, { method: 'HEAD' })
      .then((res) => {
        // The site's SPA fallback (see public/.htaccess, and Vite's own
        // dev-server fallback) rewrites any unmatched path to
        // index.html with a 200 status instead of a real 404 — so a
        // missing photo/gif/song "succeeds" with an HTML response.
        // Checking the content type tells the two apart reliably.
        const contentType = res.headers.get('content-type') || '';
        const ok = res.ok && !contentType.includes('text/html');
        cache.set(src, ok);
        if (!cancelled) setExists(ok);
      })
      .catch(() => {
        cache.set(src, false);
        if (!cancelled) setExists(false);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  // null = still checking, treat as "not ready yet" (placeholder)
  return exists === true;
}
