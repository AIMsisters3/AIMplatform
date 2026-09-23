import React, { useState } from 'react';
import { PlayCircle, FileText, Headphones, Eye, MessageCircle } from 'lucide-react';
import { getItemKind, isLive } from '../utils/mediaKind.js';
import { formatRelativeDate, formatDuration } from '../utils/formatters.js';

const KIND_ICON = {
  video: PlayCircle,
  pdf: FileText,
  audio: Headphones,
  article: FileText,
};

export default function ContentCard({ item, onClick }) {
  const kind = getItemKind(item);
  const KindIcon = KIND_ICON[kind];
  // A thumbnail URL that 404s or points at an unreachable host (a stale
  // record, a still-uploading file, a host outage) falls back to the same
  // placeholder used for no-thumbnail items, rather than leaving a broken
  // image icon on the card.
  const [thumbnailBroken, setThumbnailBroken] = useState(false);
  const duration = kind === 'video' ? formatDuration(item.duration_seconds) : null;
  const relativeDate = formatRelativeDate(item.publish_date || item.created_at);

  return (
    <article
      onClick={onClick}
      className="glass-card overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform"
    >
      <div className="relative h-44 bg-brand-gradient-soft flex items-center justify-center overflow-hidden">
        {item.thumbnail && !thumbnailBroken ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            loading="lazy"
            decoding="async"
            onError={() => setThumbnailBroken(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl brand-gradient-text font-display font-bold">AIM</span>
        )}

        {isLive(item) && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold tracking-wide flex items-center gap-1 shadow-glass">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </span>
        )}

        {KindIcon && (
          <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-brand-gradient shadow-glass flex items-center justify-center">
            <KindIcon className="w-4 h-4 text-white" />
          </span>
        )}

        {/* YouTube-style duration chip — only ever a real, captured
            duration (see readVideoDuration() in UploadContent.jsx);
            omitted entirely for anything uploaded before that existed. */}
        {duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-white text-[11px] font-semibold tabular-nums">
            {duration}
          </span>
        )}
      </div>

      <div className="p-5">
        {item.category_name && (
          <span className="inline-block text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
            {item.category_name}
          </span>
        )}
        <h3 className="font-display font-semibold text-lg leading-snug mb-1 group-hover:text-secondary transition-colors">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-sm text-ink/60 line-clamp-2 mb-2">{item.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-ink/50">
          {item.speaker && <span>{item.speaker}</span>}
          {relativeDate && <span>{relativeDate}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-ink/40 mt-1.5">
          {item.views !== undefined && (
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {item.views}</span>
          )}
          {item.comments_count !== undefined && (
            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {item.comments_count}</span>
          )}
        </div>
      </div>
    </article>
  );
}