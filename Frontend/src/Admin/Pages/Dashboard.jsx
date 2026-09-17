import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../Components/StatCard.jsx';
import api from '../../api/axios.js';

const quickActions = [
  { label: 'Upload Content', to: '/admin/upload', icon: '⬆️' },
  { label: 'New Product', to: '/admin/products', icon: '🛍️' },
  { label: 'Media Library', to: '/admin/media', icon: '🗂️' },
  { label: 'Ask AI Assistant', to: '/admin/ai-assistant', icon: '✨' },
];

function timeAgo(isoDate) {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then((r) => setSummary(r.data.data))
      .catch(() => setLoadError(true));
  }, []);

  const stats = summary?.stats;
  const notif = summary?.notifications_summary;
  const noNotifications = notif && notif.pending_comments === 0 && notif.orders_awaiting_fulfillment === 0 && notif.low_stock_products === 0
    && notif.payments_awaiting_verification === 0 && notif.refunds_requested === 0 && notif.pending_reviews === 0;

  return (
    <div className="space-y-6">
      {/* Welcome + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-8 bg-brand-gradient text-white">
          <h2 className="text-xl font-display font-bold mb-2">Welcome to the AIMsisters CMS</h2>
          <p className="text-white/80 text-sm max-w-md">
            Manage ministry content, the bookstore, and outreach tools from one beautiful dashboard.
          </p>
        </div>
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link key={a.to} to={a.to} className="flex flex-col items-center gap-1 p-3 rounded-xl2 bg-white/60 hover:bg-white transition text-xs font-medium">
                <span className="text-lg">{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Visitors (30d)" value={stats ? stats.visitors_30d : '—'} icon="👥" />
        <StatCard label="Total Videos" value={stats ? stats.videos : '—'} icon="🎬" />
        <StatCard label="Articles" value={stats ? stats.articles : '—'} icon="📰" />
        <StatCard label="Products" value={stats ? stats.products : '—'} icon="🛒" />
        <StatCard label="Orders" value={stats ? stats.orders : '—'} icon="📦" />
      </div>
      {loadError && (
        <p className="text-xs text-red-500 -mt-2">Couldn't load dashboard stats — try refreshing the page.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart placeholder */}
        <div className="lg:col-span-2 glass-card p-6">
          <p className="text-sm font-semibold mb-4">Analytics Overview</p>
          <div className="h-56 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center text-ink/40 text-sm">
            Analytics chart will render here
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">Notifications</p>
          {!notif ? (
            <p className="text-sm text-ink/40">Loading…</p>
          ) : noNotifications ? (
            <p className="text-sm text-ink/60">All caught up — nothing needs your attention.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {notif.pending_comments > 0 && (
                <li className="flex gap-2">
                  <span>🔔</span> {notif.pending_comments} comment{notif.pending_comments === 1 ? '' : 's'} pending approval
                </li>
              )}
              {notif.orders_awaiting_fulfillment > 0 && (
                <li className="flex gap-2">
                  <span>📦</span> {notif.orders_awaiting_fulfillment} order{notif.orders_awaiting_fulfillment === 1 ? '' : 's'} awaiting fulfillment
                </li>
              )}
              {notif.low_stock_products > 0 && (
                <li className="flex gap-2">
                  <span>⚠️</span> Low stock on {notif.low_stock_products} product{notif.low_stock_products === 1 ? '' : 's'}
                </li>
              )}
              {notif.payments_awaiting_verification > 0 && (
                <li className="flex gap-2">
                  <Link to="/admin/payments" className="flex gap-2 hover:text-secondary">
                    <span>💳</span> {notif.payments_awaiting_verification} payment{notif.payments_awaiting_verification === 1 ? '' : 's'} awaiting verification
                  </Link>
                </li>
              )}
              {notif.refunds_requested > 0 && (
                <li className="flex gap-2">
                  <Link to="/admin/orders" className="flex gap-2 hover:text-secondary">
                    <span>↩️</span> {notif.refunds_requested} refund{notif.refunds_requested === 1 ? '' : 's'} requested
                  </Link>
                </li>
              )}
              {notif.pending_reviews > 0 && (
                <li className="flex gap-2">
                  <Link to="/admin/reviews" className="flex gap-2 hover:text-secondary">
                    <span>📝</span> {notif.pending_reviews} review{notif.pending_reviews === 1 ? '' : 's'} pending moderation
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Uploads / Recent Activity */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">Recent Activity</p>
          {!summary ? (
            <p className="text-sm text-ink/40">Loading…</p>
          ) : summary.recent_activity.length === 0 ? (
            <p className="text-sm text-ink/60">No activity yet — publish your first piece of content to see it here.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {summary.recent_activity.map((a, i) => (
                <li key={i} className="flex justify-between text-ink/70">
                  <span className="capitalize">{a.text}</span>
                  <span className="text-ink/40 text-xs whitespace-nowrap ml-2">{timeAgo(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Calendar / Scheduled posts */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">Scheduled Posts</p>
          <div className="h-40 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center text-ink/40 text-sm">
            Calendar view coming soon
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">AI Insights</p>
          <p className="text-sm text-ink/60">Coming soon — content engagement insights will appear here.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Usage */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">Storage Usage</p>
          <p className="text-sm text-ink/60">Not tracked yet — coming soon.</p>
        </div>

        {/* Drafts */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">Drafts</p>
          {!summary ? (
            <p className="text-sm text-ink/40">Loading…</p>
          ) : summary.drafts_count === 0 ? (
            <p className="text-sm text-ink/60">No drafts yet — start writing from Upload Content.</p>
          ) : (
            <p className="text-sm text-ink/60">
              {summary.drafts_count} draft{summary.drafts_count === 1 ? '' : 's'} in progress.
            </p>
          )}
        </div>

        {/* System Status */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">System Status</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${loadError ? 'bg-red-500' : 'bg-emerald-500'}`} />
              API: {loadError ? 'Unreachable' : 'Operational'}
            </li>
            <li className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${loadError ? 'bg-red-500' : 'bg-emerald-500'}`} />
              Database: {loadError ? 'Unknown' : 'Operational'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
