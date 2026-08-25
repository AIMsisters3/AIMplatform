import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/lg.png';

const links = [
  { to: '/', label: 'Home' },
  { to: '/content', label: 'Content' },
  { to: '/bible-studies', label: 'Bible Studies' },
  { to: '/devotions', label: 'Devotions' },
  { to: '/news', label: 'News' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/login">
            <motion.span
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block px-5 py-2 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-95 transition-opacity"
            >
              Login
            </motion.span>
          </Link>
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
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="mt-3 text-center px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass"
              >
                Login
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}