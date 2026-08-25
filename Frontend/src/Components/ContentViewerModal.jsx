import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, BookOpen, FileText, Eye } from 'lucide-react';
import CommentsSection from './CommentsSection.jsx';
import ShareButton from './ShareButton.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { getItemKind, getYouTubeEmbed } from '../utils/mediaKind.js';

export default function ContentViewerModal({ item, onClose }) {
  if (!item) return null;
  const kind = getItemKind(item);
  const youtubeSrc = kind === 'video' ? getYouTubeEmbed(item.media_url) : null;
  const commentsAllowed = item.allow_comments === 1 || item.allow_comments === '1' || item.allow_comments === true;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-xl3 bg-white shadow-glass"
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-brand-gradient text-white flex items-center justify-center shadow-glass hover:opacity-90 transition"
            aria-label="Close"
          >
            ✕
          </button>

          {kind === 'video' && youtubeSrc && (
            <div className="aspect-video w-full bg-ink">
              <iframe
                src={youtubeSrc}
                title={item.title}
                className="w-full h-full"
                allow="accelerate-compute; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {kind === 'video' && !youtubeSrc && item.media_url && (
            <video controls className="w-full max-h-[50vh] bg-ink" src={item.media_url} />
          )}

          {kind === 'pdf' && (
            <iframe src={item.media_url} title={item.title} className="w-full h-[60vh]" />
          )}

          {kind === 'article' && !item.media_url && item.thumbnail && (
            <div className="h-56 w-full overflow-hidden">
              <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="p-8">
            {item.category_name && (
              <span className="inline-block text-xs font-semibold text-secondary uppercase tracking-wide mb-2">
                {item.category_name}
              </span>
            )}
            <h2 className="text-2xl md:text-3xl font-display font-bold text-ink mb-3">{item.title}</h2>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/50 mb-4">
              {(item.speaker || item.author) && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-secondary" />
                  {item.speaker || item.author}
                </span>
              )}
              {item.publish_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-secondary" />
                  {new Date(item.publish_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              )}
              {item.views !== undefined && (
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-secondary" />
                  {item.views} {Number(item.views) === 1 ? 'view' : 'views'}
                </span>
              )}
            </div>

            <div className="mb-6">
              <ShareButton item={item} />
            </div>

            {item.description && <p className="text-ink/70 mb-5">{item.description}</p>}

            {kind === 'audio' && <audio controls className="w-full mb-5" src={item.media_url} />}

            {item.body && (
              <div className="prose prose-sm max-w-none text-ink/80 leading-relaxed whitespace-pre-line mb-5">
                {item.body}
              </div>
            )}

            {item.bible_references && (
              <div className="flex items-start gap-2 bg-surface rounded-2xl px-4 py-3 mb-5">
                <BookOpen className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <p className="text-sm text-ink/70 italic">{item.bible_references}</p>
              </div>
            )}

            {item.tags && (
              <div className="flex flex-wrap gap-2 mb-5">
                {item.tags.split(',').map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-surface text-xs text-ink/60">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            {kind === 'pdf' && (<a href={item.media_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mb-2 px-6 py-2.5 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition"><FileText className="w-4 h-4" />Open Full PDF</a>)}

            <ErrorBoundary>
              <CommentsSection contentId={item.id} allowComments={commentsAllowed} />
            </ErrorBoundary>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}