import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, BookHeart, BookOpen, Newspaper, Baby, PlayCircle, Megaphone,
  ShoppingBag, Mail, Users, Quote,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api/axios.js';

const TYPE_ICON = {
  devotion: BookHeart,
  bible_study: BookOpen,
  news: Newspaper,
  kids: Baby,
  series_episode: PlayCircle,
  announcement: Megaphone,
};

// Admin-only operational alerts (variant="admin") are keyed by `source`
// instead of `type` — a distinct icon plus a visible label chip, so an
// admin who is also a regular site user can tell "new order" apart from
// "new devotion published" at a glance (spec: "Separate admin
// notifications from general user notifications, with source/category
// labels").
const SOURCE_ICON = {
  store: ShoppingBag,
  contact: Mail,
  subscriptions: Users,
  testimonies: Quote,
  content: Megaphone,
};
const SOURCE_LABEL = {
  store: 'Store',
  contact: 'Contact',
  subscriptions: 'Subscriptions',
  testimonies: 'Testimonies',
  content: 'Content',
};

export default function NotificationsBell({ variant = 'user' }) {
  const isAdmin = variant === 'admin';
  const endpoint = isAdmin ? '/notifications/admin' : '/notifications';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  function load() {
    api.get(endpoint)
      .then((r) => {
        setItems(r.data.data.items || []);
        setUnread(r.data.data.unread_count ?? 0);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function markAllRead() {
    try {
      await api.post(isAdmin ? '/notifications/admin/read-all' : '/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch {
      // best-effort
    }
  }

  async function markRead(id) {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      // best-effort
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-ink/70 hover:bg-white hover:shadow-glass transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-card bg-white/95 shadow-glass z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
              <span className="font-semibold text-sm">{isAdmin ? 'Admin Alerts' : 'Notifications'}</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold text-secondary">
                  Mark all read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink/40">
                {isAdmin ? 'No admin alerts yet.' : 'No notifications yet.'}
              </p>
            ) : (
              <ul>
                {items.map((n) => {
                  const Icon = isAdmin ? (SOURCE_ICON[n.source] || Bell) : (TYPE_ICON[n.type] || Bell);
                  const sourceLabel = isAdmin ? (SOURCE_LABEL[n.source] || n.source) : null;
                  const content = (
                    <>
                      <span className="w-8 h-8 rounded-full bg-brand-gradient-soft flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-secondary" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-ink">{n.title}</p>
                          {sourceLabel && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-wide">
                              {sourceLabel}
                            </span>
                          )}
                        </span>
                        {n.message && <p className="text-xs text-ink/60 mt-0.5 line-clamp-2">{n.message}</p>}
                        <p className="text-[10px] text-ink/35 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </span>
                    </>
                  );
                  const rowClass = `w-full flex items-start gap-3 text-left px-4 py-3 border-b border-ink/5 hover:bg-surface transition ${
                    n.is_read ? 'opacity-60' : ''
                  }`;
                  return (
                    <li key={n.id}>
                      {n.link_url ? (
                        <Link to={n.link_url} onClick={() => { markRead(n.id); setOpen(false); }} className={rowClass}>
                          {content}
                        </Link>
                      ) : (
                        <button onClick={() => markRead(n.id)} className={rowClass}>
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
