import React from 'react';

/** Shared loading-state placeholder for the simple category+language list
 * pages (News/Gallery/Devotions) — mirrors the skeleton pattern already
 * used on Content.jsx/Series.jsx so "Loading..." text isn't the only
 * feedback a visitor gets while a page's first fetch is in flight. */
export default function CardGridSkeleton({ count = 6, columns = 'md:grid-cols-3' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${columns} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl3 overflow-hidden bg-white/70 shadow-glass animate-pulse">
          <div className="h-44 bg-ink/10" />
          <div className="p-5 space-y-2">
            <div className="h-3 w-1/3 bg-ink/10 rounded-full" />
            <div className="h-4 w-4/5 bg-ink/10 rounded-full" />
            <div className="h-3 w-2/3 bg-ink/10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
