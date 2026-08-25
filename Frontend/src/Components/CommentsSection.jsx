import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function CommentRow({ comment, onReply, onLike, isReply }) {
  const [comments, setComments] = useState([]);
  const { user } = useAuth();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');

  async function submitReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    await onReply(comment.id, replyText.trim());
    setReplyText('');
    setShowReplyBox(false);
  }

  return (
    <div className={isReply ? 'ml-11 mt-3' : ''}>
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-gradient-soft flex items-center justify-center text-xs font-bold text-secondary shrink-0">
          {comment.user_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">{comment.user_name}</span>
            <span className="text-xs text-ink/40">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-ink/70">{comment.body}</p>
          <div className="flex items-center gap-4 mt-1">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-xs font-medium transition ${
                comment.liked_by_me ? 'text-accent' : 'text-ink/40 hover:text-accent'
              }`}
            >
              <Heart className="w-3.5 h-3.5" fill={comment.liked_by_me ? 'currentColor' : 'none'} />
              {comment.likes_count > 0 && comment.likes_count}
            </button>
            {!isReply && user && (
              <button
                onClick={() => setShowReplyBox((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-ink/40 hover:text-secondary transition"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Reply
              </button>
            )}
          </div>

          {showReplyBox && (
            <form onSubmit={submitReply} className="flex gap-2 mt-2">
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.user_name}...`}
                className="flex-1 px-3 py-1.5 rounded-full border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <button className="px-4 py-1.5 rounded-full bg-brand-gradient text-white text-xs font-semibold">
                Reply
              </button>
            </form>
          )}
        </div>
      </div>

      {comment.replies?.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentRow key={reply.id} comment={reply} onReply={onReply} onLike={onLike} isReply />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentsSection({ contentId, allowComments }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [contentId]);

    async function refresh() {
    const r = await api.get(`/content/${contentId}/comments`);
    setComments(r.data?.data?.items || []);
  }

  async function submitTopLevel(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      await api.post(`/content/${contentId}/comments`, { body: text.trim() });
      setText('');
      await refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not post comment.');
    } finally {
      setPosting(false);
    }
  }

  async function handleReply(parentId, body) {
    try {
      await api.post(`/content/${contentId}/comments`, { body, parent_id: parentId });
      await refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not post reply.');
    }
  }

  function updateLikeInTree(comment, targetId) {
    if (comment.id === targetId) {
      const liked = !comment.liked_by_me;
      return { ...comment, liked_by_me: liked, likes_count: comment.likes_count + (liked ? 1 : -1) };
    }
    if (comment.replies?.length) {
      return { ...comment, replies: comment.replies.map((r) => updateLikeInTree(r, targetId)) };
    }
    return comment;
  }

  async function handleLike(commentId) {
    if (!user) {
      alert('Please sign in to like comments.');
      return;
    }
    setComments((prev) => prev.map((c) => updateLikeInTree(c, commentId)));
    try {
      await api.post(`/comments/${commentId}/like`);
    } catch {
      await refresh();
    }
  }

  if (!allowComments) return null;

  const totalCount = (comments || []).reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="mt-8 pt-6 border-t border-ink/10">
      <h3 className="font-display font-semibold text-lg text-ink mb-4">
        Comments {totalCount > 0 && <span className="text-ink/40 font-normal">({totalCount})</span>}
      </h3>

      {user ? (
        <form onSubmit={submitTopLevel} className="flex gap-3 mb-6">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts..."
            className="flex-1 px-4 py-2.5 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
          />
          <button
            disabled={posting}
            className="px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass disabled:opacity-60"
          >
            {posting ? '...' : 'Post'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-ink/50 mb-6">
          <a href="/login" className="text-secondary font-semibold">Sign in</a> to join the conversation.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink/40">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-ink/40">Be the first to comment.</p>
      ) : (
        <div className="space-y-5">
          {comments.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <CommentRow comment={c} onReply={handleReply} onLike={handleLike} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}