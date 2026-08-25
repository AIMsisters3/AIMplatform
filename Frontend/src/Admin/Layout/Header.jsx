import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/60 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="font-display font-semibold text-lg">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋</h1>
        <p className="text-xs text-ink/40">Here's what's happening with your ministry content today.</p>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative w-10 h-10 rounded-full glass-card flex items-center justify-center">
          🔔
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-[10px] text-white flex items-center justify-center">3</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white font-semibold">
            {(user?.name || 'A')[0].toUpperCase()}
          </div>
          <div className="hidden md:block text-sm">
            <p className="font-semibold leading-tight">{user?.name || 'Admin'}</p>
            <p className="text-ink/40 text-xs leading-tight capitalize">{user?.role || 'admin'}</p>
          </div>
          <button onClick={handleLogout} className="text-xs font-semibold text-secondary ml-2">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
