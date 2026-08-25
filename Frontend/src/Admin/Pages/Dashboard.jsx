import React from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../Components/StatCard.jsx';

const quickActions = [
  { label: 'Upload Content', to: '/admin/upload', icon: '⬆️' },
  { label: 'New Product', to: '/admin/products', icon: '🛍️' },
  { label: 'Media Library', to: '/admin/media', icon: '🗂️' },
  { label: 'Ask AI Assistant', to: '/admin/ai-assistant', icon: '✨' },
];

const activity = [
  { text: 'New devotion "Morning Grace" published', time: '2h ago' },
  { text: 'Product "Study Bible - NKJV" stock updated', time: '5h ago' },
  { text: 'Comment awaiting approval on "Prophecy Series Pt. 3"', time: '1d ago' },
];

export default function Dashboard() {
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
        <StatCard label="Visitors (30d)" value="—" icon="👥" />
        <StatCard label="Total Videos" value="—" icon="🎬" />
        <StatCard label="Articles" value="—" icon="📰" />
        <StatCard label="Products" value="—" icon="🛒" />
        <StatCard label="Orders" value="—" icon="📦" />
      </div>

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
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2"><span>🔔</span> 3 comments pending approval</li>
            <li className="flex gap-2"><span>📦</span> 2 orders awaiting fulfillment</li>
            <li className="flex gap-2"><span>⚠️</span> Low stock on 1 product</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Uploads / Recent Activity */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">Recent Activity</p>
          <ul className="space-y-3 text-sm">
            {activity.map((a, i) => (
              <li key={i} className="flex justify-between text-ink/70">
                <span>{a.text}</span>
                <span className="text-ink/40 text-xs whitespace-nowrap ml-2">{a.time}</span>
              </li>
            ))}
          </ul>
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
          <p className="text-sm text-ink/60">
            Your "Devotions" category has the highest engagement this week. Consider publishing more content there.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Usage */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">Storage Usage</p>
          <div className="w-full h-3 rounded-full bg-ink/10 overflow-hidden">
            <div className="h-full bg-brand-gradient w-1/3" />
          </div>
          <p className="text-xs text-ink/40 mt-2">33% used of allotted storage</p>
        </div>

        {/* Drafts */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">Drafts</p>
          <p className="text-sm text-ink/60">No drafts yet — start writing from Upload Content.</p>
        </div>

        {/* System Status */}
        <div className="glass-card p-6">
          <p className="text-sm font-semibold mb-4">System Status</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> API: Operational</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Database: Operational</li>
            <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> Storage: 33% used</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
