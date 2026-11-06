import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import api from '../api/axios.js';

// How often to re-check whether anything is still actually live. There's
// no real streaming-provider webhook wired up (see live_url's docblock in
// migration 014) - is_live is a plain admin-toggled column - so this is
// the most reliable supported way to keep a visitor's screen from showing
// a stale "Live Now" banner well after a broadcast has actually ended:
// poll rather than fetch once on mount and never again.
const POLL_INTERVAL_MS = 45_000;

/**
 * Small "Live Now" banner shown above a listing page when at least one
 * item in that section currently has is_live=1. Reused by Content.jsx
 * (Media Library) and BibleStudies.jsx — the two sections live content is
 * offered under — so there's one place that owns the fetch + styling
 * instead of duplicating it per page.
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
    <div className="mb-8 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 p-5 shadow-glass">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-4 h-4 text-white animate-pulse" />
        <h2 className="text-sm font-display font-bold text-white uppercase tracking-wide">Live Now</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {items.map((item) => {
          const inner = (
            <>
              <p className="text-xs font-semibold text-white line-clamp-2">{item.title}</p>
              {item.category_name && <p className="text-[10px] text-white/70 mt-1">{item.category_name}</p>}
            </>
          );
          const className = 'shrink-0 w-56 bg-white/10 backdrop-blur rounded-xl2 p-3.5 text-left hover:bg-white/20 transition block';
          return itemHref ? (
            <Link key={item.id} to={itemHref(item)} className={className}>{inner}</Link>
          ) : (
            <button key={item.id} onClick={() => onItemClick(item)} className={className}>{inner}</button>
          );
        })}
      </div>
    </div>
  );
}
