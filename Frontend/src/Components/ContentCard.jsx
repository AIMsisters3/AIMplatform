import React from 'react';
import { PlayCircle, FileText, Headphones } from 'lucide-react';
import { getItemKind, isLive } from '../utils/mediaKind.js';

const KIND_ICON = {
  video: PlayCircle,
  pdf: FileText,
  audio: Headphones,
  article: FileText,
};

export default function ContentCard({ item, onClick }) {
  const kind = getItemKind(item);
  const KindIcon = KIND_ICON[kind];

  return (
    <article
      onClick={onClick}
      className="glass-card overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform"
    >
      <div className="relative h-44 bg-brand-gradient-soft flex items-center justify-center overflow-hidden">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
          {item.publish_date && (
            <span>{new Date(item.publish_date).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </article>
  );
}