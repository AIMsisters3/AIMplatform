import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import api from '../../api/axios.js';

/**
 * A brighter, bigger-tap-target like button for Little Lights (spec:
 * "buttons must be easy for children to tap") - same content_likes
 * toggle every other Like control on the site already uses
 * (POST /content/{id}/like), just with its own playful styling instead
 * of the adult-site's understated text link.
 */
export default function KidsLikeButton({ item }) {
  const [liked, setLiked] = useState(!!item.liked_by_me);
  const [count, setCount] = useState(item.likes_count || 0);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.post(`/content/${item.id}/like`);
      setLiked(r.data.data.liked);
      setCount(r.data.data.likes_count);
    } catch {
      // Leave state unchanged on failure - no optimistic flip to undo.
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm shadow-md transition-transform active:scale-95 ${
        liked ? 'bg-rose-500 text-white' : 'bg-white text-rose-500 border-2 border-rose-200'
      }`}
    >
      <Heart className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
      {count > 0 ? count : 'Like'}
    </button>
  );
}
