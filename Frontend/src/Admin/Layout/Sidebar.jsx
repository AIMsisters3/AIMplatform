import React from 'react';
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/admin', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/admin/upload', label: 'Upload Content', icon: '⬆️' },
  { to: '/admin/content', label: 'Manage Content', icon: '📋' },
  { to: '/admin/products', label: 'Manage Products', icon: '🛍️' },
  { to: '/admin/media', label: 'Media Library', icon: '🗂️' },
  { to: '/admin/testimonials', label: 'Testimonials', icon: '💬' },
  { to: '/admin/ai-assistant', label: 'AI Assistant', icon: '✨' },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-white/70 backdrop-blur-xl border-r border-white/60 px-4 py-6">
      <div className="px-2 mb-8">
        <span className="text-xl font-display font-extrabold">
          <span className="brand-gradient-text">AIM</span>
          <span className="text-ink">sisters</span>
        </span>
        <p className="text-xs text-ink/40 mt-1">Admin CMS</p>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-gradient text-white shadow-glass'
                  : 'text-ink/70 hover:bg-white hover:shadow-glass'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="glass-card p-4 text-xs text-ink/50">
        AIMsisters CMS v1.0
      </div>
    </aside>
  );
}