export function getYouTubeEmbed(url = '') {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function getItemKind(item) {
  const url = item.media_url || '';
  if (getYouTubeEmbed(url)) return 'video';
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (item.content_type === 'video') return 'video';
  return 'article';
}