import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from './ContentCard.jsx';

// How often to re-check whether anything is still actually live. There's
// no real streaming-provider webhook wired up (see live_url's docblock in
// migration 014) - is_live is a plain admin-toggled column - so this is
// the most reliable supported way to keep a visitor's screen from showing
// a stale "Live Now" banner well after a broadcast has actually ended:
// poll rather than fetch once on mount and never again.
const POLL_INTERVAL_MS = 45_000;

/**
 * "Live Now" strip shown above a listing page when at least one item in
 * that section currently has is_live=1. Reused by Content.jsx (Media
 * Library) and BibleStudies.jsx — the two sections live content is
 * offered under — so there's one place that owns the fetch + styling
 * instead of duplicating it per page.
 *
 * Renders the exact same ContentCard used in the regular grid below -
 * real thumbnail, title, meta - rather than a separate, differently-
 * styled banner (spec: "must appear just like all other videos... just
 * the way the rest appear"). A live item's own LIVE badge (ContentCard's
 * existing top-left pulsing-dot pill, driven by isLive()) is what marks
 * it out, not a special card treatment.
 */
export default function LiveNowStrip({ endpoint, onItemClick, itemHref }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    function fetchLive() {
      api.get(endpoint, { params: { live: 1, limit: 6 } })
        .then((r) => { if (active) setItems(r.data?.data?.items || []); })
        .catch(() => { if (active) setItems([]); });
    }
    fetchLive();
    const interval = setInterval(fetchLive, POLL_INTERVAL_MS);
    return () => { active = false; clearInterval(interval); };
  }, [endpoint]);

  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
        <h2 className="text-lg font-display font-bold text-ink">Live Now</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {items.map((item) => (
          <div key={item.id} className="shrink-0 w-64 sm:w-72">
            {itemHref ? (
              <Link to={itemHref(item)} className="block">
                <ContentCard item={item} />
              </Link>
            ) : (
              <ContentCard item={item} onClick={() => onItemClick(item)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
