import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api/axios.js';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  function load() {
    api.get('/notifications')
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
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all');
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
              <span className="font-semibold text-sm">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold text-secondary">
                  Mark all read
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink/40">No notifications yet.</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => markRead(n.id)}
                      className={`w-full text-left px-4 py-3 border-b border-ink/5 hover:bg-surface transition ${
                        n.is_read ? 'opacity-60' : ''
                      }`}
                    >
                      <p className="text-sm font-semibold text-ink">{n.title}</p>
                      <p className="text-xs text-ink/60 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-ink/35 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
