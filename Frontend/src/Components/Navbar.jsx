import React, { useState, useEffect, useRef, useId } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, User, LogOut, Package, Bookmark, Heart, LayoutDashboard, NotebookText, ChevronDown } from 'lucide-react';
import logo from '../assets/lg.png';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { LANGUAGE_OPTIONS } from '../i18n/translations.js';
import NotificationsBell from './NotificationsBell.jsx';

// Every destination lives under one of these three top-level slots, plus a
// plain Home and Shop link. Explore groups everything content-related so
// the bar itself only ever shows 4 items, per spec - Reforms deliberately
// has no entry here (and no page of its own): it's a filter *within*
// Content and Bible Studies, not a destination. Categories browsing lives
// on the homepage's own category cards + Content page filters instead of
// here (removed from the navbar per explicit request).
const EXPLORE_LINKS = [
  { to: '/content', labelKey: 'nav_content' },
  { to: '/bible-studies', labelKey: 'nav_bible_studies' },
  { to: '/series', labelKey: 'nav_series' },
  { to: '/devotions', labelKey: 'nav_devotions' },
  { to: '/kids', labelKey: 'nav_children' },
  { to: '/songs', labelKey: 'nav_songs' },
  { to: '/news', labelKey: 'nav_news' },
  { to: '/gallery', labelKey: 'nav_gallery' },
];

const ABOUT_LINKS = [
  { to: '/about', labelKey: 'nav_about_full' },
  { to: '/contact', labelKey: 'nav_contact' },
];

// Desktop dropdown for Explore/About — click-toggles (so it's reachable
// with just Enter/Space like any button, matching AccountMenu's existing
// pattern) and also opens on hover for pointer users, which is what
// visitors expect from a nav dropdown. Closes on Escape, click-outside,
// or picking a link.
function NavDropdown({ label, links, currentPath, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const closeTimerRef = useRef(null);
  const menuId = useId();
  const isActiveGroup = links.some((l) => currentPath === l.to || currentPath.startsWith(l.to + '/'));

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function openNow() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(true);
  }
  function closeSoon() {
    closeTimerRef.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div className="relative" ref={ref} onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        className="relative flex items-center gap-1 px-3 py-2 text-sm font-medium"
      >
        <span className={`relative z-10 transition-colors ${isActiveGroup ? 'text-secondary' : 'text-ink/70 hover:text-ink'}`}>
          {label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''} ${isActiveGroup ? 'text-secondary' : 'text-ink/50'}`} />
        {isActiveGroup && (
          <motion.span
            layoutId="navbar-active-underline"
            className="absolute left-3 right-6 -bottom-0.5 h-0.5 bg-brand-gradient rounded-full"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 w-56 glass-card bg-white/95 shadow-glass z-50 overflow-hidden py-1.5"
          >
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2.5 text-sm transition ${isActive ? 'text-secondary font-semibold bg-surface' : 'text-ink/70 hover:bg-surface hover:text-ink'}`
                }
              >
                {link.labelKey ? t(link.labelKey) : link.label}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountMenu({ t }) {
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
          {t('nav_login')}
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
        aria-haspopup="true"
        aria-expanded={open}
      >
        {user.name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Account menu"
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
              <Package className="w-4 h-4" /> {t('account_my_orders')}
            </button>
            <button onClick={() => { setOpen(false); navigate('/bookmarks'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/70 hover:bg-surface transition">
              <Bookmark className="w-4 h-4" /> {t('account_my_bookmarks')}
            </button>
            <button onClick={() => { setOpen(false); navigate('/notes'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/70 hover:bg-surface transition">
              <NotebookText className="w-4 h-4" /> {t('account_my_notes')}
            </button>
            <button onClick={() => { setOpen(false); navigate('/wishlist'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/70 hover:bg-surface transition">
              <Heart className="w-4 h-4" /> {t('account_my_wishlist')}
            </button>
            {isAdmin && (
              <button onClick={() => { setOpen(false); navigate('/admin'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink/70 hover:bg-surface transition">
                <LayoutDashboard className="w-4 h-4" /> {t('account_admin_dashboard')}
              </button>
            )}
            <button onClick={() => { setOpen(false); logout(); navigate('/'); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition border-t border-ink/10">
              <LogOut className="w-4 h-4" /> {t('account_logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchBox({ t }) {
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
              placeholder={t('nav_search_placeholder')}
              className="w-full px-4 py-2 rounded-full border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            />
          </motion.form>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full flex items-center justify-center text-ink/70 hover:bg-white hover:shadow-glass transition"
        aria-label={t('nav_search')}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Search className="w-5 h-5" />
      </button>
    </div>
  );
}

// Flag-icon toggle replacing the old per-page globe-icon language
// filters (Content/BibleStudies/Devotions/News each had their own,
// unrelated to this: that filter labels a piece of CONTENT's language,
// this switches the app's own interface language). Two languages today,
// so a simple click-to-toggle list is clearer than a wider dropdown.
function LanguageSwitcher({ language, setLanguage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGE_OPTIONS.find((l) => l.code === language) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 h-10 rounded-full text-ink/70 hover:bg-white hover:shadow-glass transition"
        aria-label="Change language"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="text-lg leading-none">{current.flag}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-44 glass-card bg-white/95 shadow-glass z-50 overflow-hidden py-1.5"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                role="menuitem"
                onClick={() => { setLanguage(opt.code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition ${
                  opt.code === language ? 'text-secondary font-semibold bg-surface' : 'text-ink/70 hover:bg-surface hover:text-ink'
                }`}
              >
                <span className="text-base leading-none">{opt.flag}</span> {opt.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mobile: Explore/About render as an inline expand-in-place group (a
// header row that toggles, then its links indented beneath) rather than a
// floating dropdown - flyout menus are awkward to reach with a thumb, and
// this keeps the whole mobile menu as one scrollable column.
function MobileGroup({ label, links, currentPath, onNavigate, t }) {
  const [expanded, setExpanded] = useState(() => links.some((l) => currentPath === l.to || currentPath.startsWith(l.to + '/')));
  const groupId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={groupId}
        className="w-full flex items-center justify-between py-2.5 text-sm font-semibold text-ink/80"
      >
        {label}
        <ChevronDown className={`w-4 h-4 text-ink/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={groupId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden pl-3 border-l border-ink/10 ml-1"
          >
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `block py-2 text-sm font-medium transition-colors ${isActive ? 'text-secondary' : 'text-ink/60'}`
                }
              >
                {link.labelKey ? t(link.labelKey) : link.label}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const { count } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Closing the mobile menu on every route change avoids it staying open
  // (or mid-animation) behind whatever page the visitor just navigated to.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md border-b transition-all duration-300 ${
        scrolled
          ? 'bg-white/92 border-ink/10 shadow-[0_4px_24px_rgba(45,42,74,0.08)]'
          : 'bg-gradient-to-r from-secondary/12 via-white/75 to-accent/12 border-white/40'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4 py-2 min-h-16">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
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

        <nav className="hidden lg:flex items-center justify-center flex-1 gap-6 text-sm font-medium">
          <NavLink to="/" end className="relative px-3 py-2">
            {({ isActive }) => (
              <>
                <span className={`relative z-10 transition-colors ${isActive ? 'text-secondary' : 'text-ink/70 hover:text-ink'}`}>
                  {t('nav_home')}
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

          <NavDropdown label={t('nav_explore')} links={EXPLORE_LINKS} currentPath={location.pathname} t={t} />

          <NavLink to="/shop" className="relative px-3 py-2">
            {({ isActive }) => (
              <>
                <span className={`relative z-10 transition-colors ${isActive ? 'text-secondary' : 'text-ink/70 hover:text-ink'}`}>
                  {t('nav_shop')}
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

          <NavDropdown label={t('nav_about')} links={ABOUT_LINKS} currentPath={location.pathname} t={t} />
        </nav>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <SearchBox t={t} />
          <LanguageSwitcher language={language} setLanguage={setLanguage} />
          {user && <NotificationsBell />}
          <Link to="/cart" className="relative w-10 h-10 rounded-full flex items-center justify-center text-ink/70 hover:bg-white hover:shadow-glass transition" aria-label={t('nav_cart')}>
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
          <span className="ml-1">
            <AccountMenu t={t} />
          </span>
        </div>

        <button
          className="lg:hidden relative w-9 h-9 flex items-center justify-center rounded-lg text-ink"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls="mobile-nav-menu"
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
            id="mobile-nav-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden overflow-hidden bg-white/95 backdrop-blur-md border-t border-ink/5"
          >
            <div className="px-6 py-4 flex flex-col gap-1 max-h-[75vh] overflow-y-auto">
              <NavLink
                to="/"
                end
                onClick={() => setOpen(false)}
                className={({ isActive }) => `block py-2.5 text-sm font-medium transition-colors ${isActive ? 'text-secondary' : 'text-ink/70'}`}
              >
                {t('nav_home')}
              </NavLink>

              <MobileGroup label={t('nav_explore')} links={EXPLORE_LINKS} currentPath={location.pathname} onNavigate={() => setOpen(false)} t={t} />

              <NavLink
                to="/shop"
                onClick={() => setOpen(false)}
                className={({ isActive }) => `block py-2.5 text-sm font-medium transition-colors ${isActive ? 'text-secondary' : 'text-ink/70'}`}
              >
                {t('nav_shop')}
              </NavLink>

              <MobileGroup label={t('nav_about')} links={ABOUT_LINKS} currentPath={location.pathname} onNavigate={() => setOpen(false)} t={t} />

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink/10">
                <span className="text-xs font-semibold text-ink/50">Language</span>
                <LanguageSwitcher language={language} setLanguage={setLanguage} />
              </div>

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-ink/10">
                <Link
                  to="/cart"
                  onClick={() => setOpen(false)}
                  className="relative flex-1 text-center px-4 py-2.5 rounded-full glass-card text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" /> {t('nav_cart')} {count > 0 && `(${count})`}
                </Link>
                {user ? (
                  <Link
                    to="/orders"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass"
                  >
                    {t('account_my_orders')}
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass"
                  >
                    {t('nav_login')}
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
