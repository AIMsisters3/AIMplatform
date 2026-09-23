import React, { useState } from 'react';
import { PlayCircle, FileText, Headphones, Eye, MessageCircle } from 'lucide-react';
import { getItemKind, isLive } from '../utils/mediaKind.js';
import { formatRelativeDate, formatDuration, formatCount } from '../utils/formatters.js';

const KIND_ICON = {
  video: PlayCircle,
  pdf: FileText,
  audio: Headphones,
  article: FileText,
};
const KIND_LABEL = { video: 'Watch', pdf: 'Read', audio: 'Listen', article: 'Read' };

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
  const viewCount = formatCount(item.views);
  const commentCount = formatCount(item.comments_count);
  // One combined "1.2K views • 14 comments • 12:45" line — built as an
  // array and joined so a missing piece (e.g. no comment count yet)
  // never leaves a stray separator behind.
  const metaParts = [
    viewCount !== null && `${viewCount} ${Number(item.views) === 1 ? 'view' : 'views'}`,
    commentCount !== null && `${commentCount} ${Number(item.comments_count) === 1 ? 'comment' : 'comments'}`,
    duration,
  ].filter(Boolean);

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

        {/* Action/type badge — upper-right corner, per spec (not below
            the card). Labeled (Watch/Listen/Read), not icon-only. */}
        {KindIcon && (
          <span className="absolute top-3 right-3 flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-brand-gradient shadow-glass text-white text-xs font-semibold">
            <KindIcon className="w-3.5 h-3.5" /> {KIND_LABEL[kind] || 'View'}
          </span>
        )}

        {/* YouTube-style duration chip on the thumbnail itself (in
            addition to appearing in the metadata line below) — only
            ever a real, captured duration (see readVideoDuration() in
            UploadContent.jsx); omitted entirely for anything uploaded
            before that existed. */}
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
        {item.speaker && <p className="text-xs text-ink/50 mb-1">{item.speaker}</p>}
        {/* Views • comments • duration, all on one line (spec example:
            "1.2K views 14 comments 12:45") — wraps gracefully only if
            the screen is genuinely too narrow, never forced onto
            separate lines otherwise. */}
        {(metaParts.length > 0 || relativeDate) && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink/45">
            {metaParts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-ink/25">&bull;</span>}
                <span className="flex items-center gap-1">
                  {i === 0 && metaParts[0]?.includes('view') && <Eye className="w-3.5 h-3.5" />}
                  {part.includes('comment') && <MessageCircle className="w-3.5 h-3.5" />}
                  {part}
                </span>
              </React.Fragment>
            ))}
            {relativeDate && (
              <>
                {metaParts.length > 0 && <span className="text-ink/25">&bull;</span>}
                <span>{relativeDate}</span>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}