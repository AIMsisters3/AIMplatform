// content.is_live comes back from the API as 1/0, '1'/'0', or a real
// boolean depending on the PHP/PDO driver in play — normalize once here
// rather than repeating the same loose check at every render site.
export function isLive(item) {
  return item?.is_live === 1 || item?.is_live === '1' || item?.is_live === true;
}

export function getYouTubeEmbed(url = '') {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

// Written-content media types never have a real media file — media_url is
// always null for these (see ContentController::normalizeClassification()),
// so inferring kind from a URL's file extension always fell through to
// whatever the *thumbnail's* extension happened to be (almost always an
// image), misclassifying every article/devotion/news article as 'image'.
// Checked first, before any URL-extension inference, so this can never
// happen regardless of what the thumbnail looks like.
const ARTICLE_MEDIA_TYPES = ['article', 'news_article', 'devotional', 'bible_lesson'];

export function getItemKind(item) {
  if (ARTICLE_MEDIA_TYPES.includes(item.media_type)) return 'article';
  // PDF/Notes typed directly as text instead of uploaded as a file (spec:
  // "support typed notes/text where PDF/Notes content is allowed") — no
  // media_url, but real body content.
  if (!item.media_url && item.body) return 'article';

  const url = item.media_url || item.thumbnail || '';
  if (getYouTubeEmbed(url)) return 'video';
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  // Gallery items store their photo as media_url/thumbnail with a plain
  // image extension, which the check above already catches — this only
  // covers the rare case of a missing/unrecognized extension.
  if (item.section === 'gallery' || item.media_type === 'image') return 'image';
  if (item.content_type === 'video') return 'video';
  return 'article';
}