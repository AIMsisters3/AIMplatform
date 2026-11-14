import { useEffect, useRef, useState } from 'react';
import api from '../api/axios.js';

// How often to re-poll for whether anything is newly live. Same interval
// LiveNowStrip.jsx already uses for the same reason (is_live has no push/
// webhook - see Backend/helpers/live_status.php's own docblock) - one
// convention, not two competing ones.
const POLL_INTERVAL_MS = 45_000;

/**
 * The one place the navbar's live state is computed - called once from
 * Navbar itself, its result passed down to wherever the LIVE badge needs
 * to render (desktop cluster, mobile header row), so there is exactly one
 * poll and one expiry timer regardless of how many places display it (per
 * spec: "one source of truth", "do not create separate independent live
 * timers for each page").
 *
 * GET /content?live=1 with no section filter already returns items across
 * every section (media_library, news, devotions, kids, bible_study - see
 * ContentController::index()), and the backend now computes is_live from
 * the item's real live_start_time/live_end_time window (Backend/helpers/
 * live_status.php), not just the raw admin toggle - so this genuinely only
 * matches content currently inside its live window.
 *
 * Beyond the 45s poll, this schedules ONE extra precise timeout for the
 * soonest live_end_time among the current results, so the badge disappears
 * at the exact expiry moment rather than up to 45s late (spec item 8).
 */
export default function useLiveNow() {
  const [items, setItems] = useState([]);
  const expiryTimerRef = useRef(null);

  useEffect(() => {
    let active = true;

    function scheduleExpiryCheck(currentItems) {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      const endTimes = currentItems
        .map((i) => (i.live_end_time ? new Date(i.live_end_time.replace(' ', 'T')).getTime() : null))
        .filter((t) => t !== null && Number.isFinite(t));
      if (endTimes.length === 0) return;
      const soonest = Math.min(...endTimes);
      const delay = soonest - Date.now();
      if (delay <= 0) return;
      // Cap the timeout itself (browsers clamp very large setTimeout delays
      // anyway) - the 45s poll is the fallback for anything longer.
      expiryTimerRef.current = setTimeout(fetchLive, Math.min(delay + 500, POLL_INTERVAL_MS));
    }

    function fetchLive() {
      api.get('/content', { params: { live: 1, limit: 5 } })
        .then((r) => {
          if (!active) return;
          const liveItems = r.data?.data?.items || [];
          setItems(liveItems);
          scheduleExpiryCheck(liveItems);
        })
        .catch(() => { if (active) setItems([]); });
    }

    fetchLive();
    const interval = setInterval(fetchLive, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, []);

  return items;
}
