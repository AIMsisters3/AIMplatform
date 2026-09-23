import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, BookOpen, FileText, Eye, AlertTriangle } from 'lucide-react';
import api from '../api/axios.js';
import CommentsSection from './CommentsSection.jsx';
import ShareButton from './ShareButton.jsx';
import DownloadButton from './DownloadButton.jsx';
import ArticleDownloadButton from './ArticleDownloadButton.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { getItemKind, getYouTubeEmbed, isLive } from '../utils/mediaKind.js';
import logo from '../assets/lg.png';

// Devotion and News articles get a dedicated "official document" reading
// layout (spec: logo, title, date, pink "AIMSISTERS ARTICLE" masthead,
// no repeated thumbnail, "by the AIMsisters" closing signature) rather
// than the generic media-viewer layout below — a Bible Study or general
// Content-page article intentionally keeps the plain layout, since only
// Devotions/News asked for this specific document treatment.
const OFFICIAL_DOCUMENT_MEDIA_TYPES = ['devotional', 'news_article'];

// How often to re-check whether a broadcast a viewer already has open is
// still actually live — see LiveNowStrip.jsx's matching comment: there's
// no real streaming-provider webhook, so polling while the modal is open
// is the most reliable supported way to clear a stale LIVE badge without
// making the viewer close and reopen the item themselves.
const LIVE_POLL_INTERVAL_MS = 30_000;

// A file that 404s, or that a host is temporarily refusing to serve,
// should never take the whole viewer down with it — shown in place of
// the player/image instead of a browser's own broken-media UI.
function MediaErrorFallback({ label }) {
  return (
    <div className="w-full bg-surface py-10 flex flex-col items-center gap-2 text-center px-6">
      <AlertTriangle className="w-6 h-6 text-ink/30" />
      <p className="text-sm text-ink/50">{label}</p>
    </div>
  );
}

export default function ContentViewerModal({ item, onClose }) {
  // liveOverride: null = trust item.is_live as originally fetched; once a
  // poll actually runs, it always wins (even to flip live -> not live).
  const [liveOverride, setLiveOverride] = useState(null);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    setMediaError(false);
  }, [item?.id]);

  useEffect(() => {
    setLiveOverride(null);
    if (!item || !isLive(item)) return undefined;
    const interval = setInterval(() => {
      api.get(`/content/${item.id}`)
        .then((r) => {
          const fresh = r.data?.data?.item;
          if (fresh) setLiveOverride(isLive(fresh));
        })
        .catch(() => {});
    }, LIVE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [item]);

  if (!item) return null;
  const kind = getItemKind(item);
  const youtubeSrc = kind === 'video' ? getYouTubeEmbed(item.media_url) : null;
  const live = liveOverride !== null ? liveOverride : isLive(item);
  const commentsAllowed = item.allow_comments === 1 || item.allow_comments === '1' || item.allow_comments === true;
  const isOfficialDocument = OFFICIAL_DOCUMENT_MEDIA_TYPES.includes(item.media_type);

  if (isOfficialDocument) {
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
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl3 bg-white shadow-glass"
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

            {/* Official document masthead — no thumbnail repeated here,
                by design (spec: "Do not display the thumbnail again
                after opening the article"). */}
            <div className="px-8 sm:px-12 pt-10 pb-6 border-b border-ink/10">
              <div className="flex items-start justify-between gap-4 mb-6">
                <img src={logo} alt="AIMsisters" className="h-10 w-10 rounded-full object-cover shadow-glass" />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#E548B9' }}>
                  AIMsisters Article
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink leading-snug mb-2">
                {item.title}
              </h1>
              {(item.publish_date || item.created_at) && (
                <p className="text-right text-sm text-ink/45">
                  {new Date(item.publish_date || item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            <div className="px-8 sm:px-12 py-8">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink/50 mb-6">
                {(item.speaker || item.author) && (
                  <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-secondary" />{item.speaker || item.author}</span>
                )}
                {item.views !== undefined && (
                  <span className="flex items-center gap-1.5"><Eye className="w-4 h-4 text-secondary" />{item.views} {Number(item.views) === 1 ? 'view' : 'views'}</span>
                )}
                <span className="ml-auto flex items-center gap-2">
                  <ShareButton item={item} />
                  <ArticleDownloadButton item={item} />
                </span>
              </div>

              {item.description && <p className="text-ink/60 italic mb-6">{item.description}</p>}

              {/* Professionally formatted document body — generous max-w
                  for readable line length, explicit paragraph/heading
                  spacing, and images constrained to never overflow the
                  page while keeping their real aspect ratio. */}
              {item.body && (
                <div
                  className="prose prose-sm sm:prose-base max-w-none text-ink/80 leading-relaxed [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_p]:mb-4 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_blockquote]:border-l-2 [&_blockquote]:border-secondary/40 [&_blockquote]:pl-4 [&_blockquote]:italic"
                  dangerouslySetInnerHTML={{ __html: item.body }}
                />
              )}

              <p className="text-right italic mt-10 mb-2" style={{ color: '#1E295A' }}>by the AIMsisters</p>

              <ErrorBoundary>
                <CommentsSection contentId={item.id} allowComments={commentsAllowed} />
              </ErrorBoundary>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

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
            <div className="relative aspect-video w-full bg-ink">
              {live && (
                <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE NOW
                </span>
              )}
              <iframe
                src={youtubeSrc}
                title={item.title}
                className="w-full h-full"
                allow="accelerate-compute; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* A live item's media_url is always a link/embed source, never a
              direct video file - <video src> would silently fail on it. */}
          {kind === 'video' && !youtubeSrc && live && item.media_url && (
            <div className="w-full bg-ink py-10 flex flex-col items-center gap-3">
              <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE NOW
              </span>
              <a href={item.media_url} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition">
                Watch the Live Stream
              </a>
            </div>
          )}

          {/* A broadcast that just ended may still hold its original
              live-stream link (e.g. a Facebook Live watch URL) in
              media_url rather than a real playable file - there's no
              provider integration to tell the two apart, so a raw
              <video src> would just fail silently on a link like that.
              Only attempt <video> once the URL actually looks like a
              direct file; otherwise offer the same link a viewer can open
              to check whether a replay is available there. */}
          {kind === 'video' && !youtubeSrc && !live && item.media_url && (
            /\.(mp4|webm|ogg|mov)(\?|$)/i.test(item.media_url) ? (
              mediaError ? (
                <MediaErrorFallback label="This video could not be loaded. It may still be processing, or the file is temporarily unavailable." />
              ) : (
                <video controls className="w-full max-h-[50vh] bg-ink" src={item.media_url} onError={() => setMediaError(true)} />
              )
            ) : (
              <div className="w-full bg-ink py-10 flex flex-col items-center gap-3">
                <a href={item.media_url} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition">
                  Watch Recording
                </a>
              </div>
            )
          )}

          {kind === 'pdf' && (
            <iframe src={item.media_url} title={item.title} className="w-full h-[60vh]" />
          )}

          {kind === 'article' && !item.media_url && item.thumbnail && !mediaError && (
            <div className="h-56 w-full overflow-hidden">
              <img
                src={item.thumbnail}
                alt={item.title}
                loading="lazy"
                decoding="async"
                onError={() => setMediaError(true)}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {kind === 'image' && (item.media_url || item.thumbnail) && (
            mediaError ? (
              <MediaErrorFallback label="This image could not be loaded." />
            ) : (
              <div className="w-full h-72 md:h-96 overflow-hidden bg-ink flex items-center justify-center">
                <img
                  src={item.media_url || item.thumbnail}
                  alt={item.title}
                  onError={() => setMediaError(true)}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )
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

            <div className="flex flex-wrap items-center gap-2 mb-6">
              <ShareButton item={item} />
              <DownloadButton item={item} />
            </div>

            {item.description && <p className="text-ink/70 mb-5">{item.description}</p>}

            {kind === 'audio' && (
              mediaError ? (
                <MediaErrorFallback label="This audio could not be loaded. It may still be processing, or the file is temporarily unavailable." />
              ) : (
                <audio controls className="w-full mb-5" src={item.media_url} onError={() => setMediaError(true)} />
              )
            )}

            {item.body && (
              <div
                className="prose prose-sm max-w-none text-ink/80 leading-relaxed mb-5"
                dangerouslySetInnerHTML={{ __html: item.body }}
              />
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