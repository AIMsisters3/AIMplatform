import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, User, LogOut, Package, Bookmark, LayoutDashboard } from 'lucide-react';
import logo from '../assets/lg.png';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import NotificationsBell from './NotificationsBell.jsx';

const links = [
  { to: '/', label: 'Home' },
  { to: '/content', label: 'Content' },
  { to: '/bible-studies', label: 'Bible Studies' },
  { to: '/series', label: 'Series' },
  { to: '/devotions', label: 'Devotions' },
  { to: '/news', label: 'News' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

function AccountMenu() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!user) {
    return (
      <Link to="/login">
        <motion.span
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="inline-block px-5 py-2 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-95 transition-opacity"
        >
          Login
        </motion.span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-brand-gradient text-white flex items-center justify-center font-display font-semibold shadow-glass"
        aria-label="Account menu"
      >
        {user.name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 glass-card bg-white/95 shadow-glass z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-ink/10">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-ink/50 truncate">{user.email}</p>
            </div>
            <button onClick={() => { setOpen(false); navigate('/orders'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/70 hover:bg-surface transition">
              <Package className="w-4 h-4" /> My Orders
            </button>
            <button onClick={() => { setOpen(false); navigate('/bookmarks'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/70 hover:bg-surface transition">
              <Bookmark className="w-4 h-4" /> My Bookmarks
            </button>
            {isAdmin && (
              <button onClick={() => { setOpen(false); navigate('/admin'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/70 hover:bg-surface transition">
                <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
              </button>
            )}
            <button onClick={() => { setOpen(false); logout(); navigate('/'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition border-t border-ink/10">
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchBox() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  }

  return (
    <div className="relative flex items-center">
      <AnimatePresence>
        {open && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mr-1"
          >
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => !q && setOpen(false)}
              placeholder="Search..."
              className="w-full px-4 py-2 rounded-full border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </motion.form>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-ink/70 hover:bg-white hover:shadow-glass transition"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const { count } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md border-b transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 border-ink/10 shadow-[0_4px_24px_rgba(45,42,74,0.08)]'
          : 'bg-white/70 border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between py-2 min-h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src={logo}
            alt="AIMsisters logo"
            className="w-22 h-16 rounded-full object-cover shadow-glass transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col leading-none">
            <span className="text-xl font-display font-800">
              <span className="brand-gradient-text font-extrabold">AIM</span>
              <span className="text-ink font-semibold">sisters</span>
            </span>
            <span className="text-[11px] font-medium tracking-wide text-ink/45 mt-1">
              Christ is all in all
            </span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className="relative px-3 py-2"
            >
              {({ isActive }) => (
                <>
                  <span className={`relative z-10 transition-colors ${isActive ? 'text-secondary' : 'text-ink/70 hover:text-ink'}`}>
                    {link.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="navbar-active-underline"
                      className="absolute left-3 right-3 -bottom-0.5 h-0.5 bg-brand-gradient rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-1">
          <SearchBox />
          {user && <NotificationsBell />}
          <Link to="/cart" className="relative w-10 h-10 rounded-full flex items-center justify-center text-ink/70 hover:bg-white hover:shadow-glass transition" aria-label="Cart">
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
          <span className="ml-2">
            <AccountMenu />
          </span>
        </div>

        <button
          className="lg:hidden relative w-9 h-9 flex items-center justify-center rounded-lg text-ink"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <motion.span
            className="absolute block w-6 h-0.5 bg-ink rounded-full"
            animate={open ? { rotate: 45, y: 0 } : { rotate: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="absolute block w-6 h-0.5 bg-ink rounded-full"
            animate={open ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.15 }}
          />
          <motion.span
            className="absolute block w-6 h-0.5 bg-ink rounded-full"
            animate={open ? { rotate: -45, y: 0 } : { rotate: 0, y: 6 }}
            transition={{ duration: 0.2 }}
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden overflow-hidden bg-white/95 backdrop-blur-md border-t border-ink/5"
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {links.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `block py-2.5 text-sm font-medium transition-colors ${
                        isActive ? 'text-secondary' : 'text-ink/70'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </motion.div>
              ))}

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-ink/10">
                <Link
                  to="/cart"
                  onClick={() => setOpen(false)}
                  className="relative flex-1 text-center px-4 py-2.5 rounded-full glass-card text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" /> Cart {count > 0 && `(${count})`}
                </Link>
                {user ? (
                  <Link
                    to="/orders"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass"
                  >
                    My Account
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}