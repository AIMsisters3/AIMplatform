import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Mirrors ManageContent.jsx's own viewHrefFor() for the two sections that
// can actually go live (UploadContent.jsx's LIVE_ELIGIBLE_SECTIONS) - kept
// local rather than shared since it's this small and this component is the
// only other place that needs it.
function liveHrefFor(item) {
  if (item.section === 'bible_study') return `/bible-studies/${item.slug}`;
  return `/content?item=${item.slug}`;
}

/**
 * The navbar's LIVE badge - renders nothing when nothing is live (real
 * data from useLiveNow(), never a static/fake indicator). One live item:
 * a small pill linking straight to it. Multiple: the same pill, but it
 * opens a short list instead of guessing which one to link to (spec item
 * 17's "do not overwrite one with another").
 */
export default function LiveIndicator({ items, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!items || items.length === 0) return null;

  const badge = (
    <span className="relative flex items-center gap-1.5 pl-2 pr-2.5 h-8 rounded-full bg-red-500 text-white text-xs font-bold shadow-glass">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      LIVE
    </span>
  );

  if (items.length === 1) {
    return (
      <Link to={liveHrefFor(items[0])} className={`shrink-0 ${className}`} title={items[0].title}>
        <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} className="block">
          {badge}
        </motion.span>
      </Link>
    );
  }

  // Multiple live items at once - a real, if uncommon, case (spec item 17)
  // - a small dropdown rather than an arbitrary pick.
  return (
    <div className={`relative shrink-0 ${className}`} ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="true" aria-expanded={open}>
        {badge}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Live now"
          className="absolute right-0 mt-2 w-64 glass-card bg-white/95 shadow-glass z-50 overflow-hidden py-1.5"
        >
          <p className="px-4 py-1.5 text-[11px] font-semibold text-ink/40 uppercase tracking-wide">Live Now</p>
          {items.map((item) => (
            <Link
              key={item.id}
              to={liveHrefFor(item)}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-ink/70 hover:bg-surface hover:text-ink transition truncate"
            >
              {item.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
