export function getYouTubeEmbed(url = '') {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function getItemKind(item) {
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