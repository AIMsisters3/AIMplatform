import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, User, AtSign, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';
import heroBg from '../assets/bg.png';
import logo from '../assets/lg.png';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

// Not secret - the OAuth Client ID is a public value, baked into the
// built JS bundle same as VITE_BACKEND_URL. Unset locally until you've
// created one and added it to Frontend/.env - see Frontend/.env.example.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const [mode, setMode] = useState('login'); // login | register
  // `email` doubles as "email or username" in login mode (one combined
  // field, same backend endpoint resolves either - see
  // AuthController::login()); register mode uses it as a real email,
  // alongside its own separate `username` field.
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await api.post('/auth/register', form);
        await login(form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Google's Identity Services script is loaded on demand (only the
  // login page ever needs it, same lazy-loading reasoning already used
  // elsewhere in this codebase - e.g. articlePdf.js) rather than added
  // to index.html for every page. The script renders Google's own
  // official button into googleButtonRef - its styling is Google's,
  // not ours, per their brand guidelines, which is why it doesn't
  // match the glass theme around it.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return undefined;

    async function handleCredential(response) {
      setError('');
      setLoading(true);
      try {
        await loginWithGoogle(response.credential);
        navigate('/');
      } catch (err) {
        setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    function renderButton() {
      if (!googleButtonRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential });
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline', size: 'large', shape: 'pill', width: 320,
      });
    }

    // Already loaded (Strict Mode's mount -> cleanup -> mount in dev, or
    // navigating back to this page) - nothing to wait for.
    if (window.google?.accounts?.id) {
      renderButton();
      return undefined;
    }

    // A <script>'s load event only ever fires once - if it already fired
    // before this run's listener was attached (exactly what Strict
    // Mode's double-invoke causes: the first run's `onload =` assignment
    // gets silently replaced), a plain `onload =` here would just as
    // silently never fire either. addEventListener lets this run's own
    // listener coexist with (not overwrite) one left behind by another
    // run, and the explicit google.accounts.id check above already
    // covers the "it fired before we even got here" case.
    let script = document.getElementById('google-identity-script');
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-identity-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', renderButton);
    return () => script.removeEventListener('load', renderButton);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-16 px-6">
      {/* Same background photo the homepage hero uses on larger screens
          (Home.jsx's heroBg) - a dark overlay on top keeps the glass
          panel and its white text readable over it, same reasoning as
          the reference design this follows. */}
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ink/80 via-ink/70 to-secondary/60" />

      {/* Soft brand-gradient glow orbs, same decorative language already
          used elsewhere on the site (Home.jsx's Mission/Newsletter
          sections), not the reference's cyan/blue - kept consistent with
          AIMsisters' own palette instead of copying its colors literally. */}
      <motion.div
        className="absolute top-10 left-10 w-72 h-72 rounded-full bg-secondary/30 blur-3xl pointer-events-none"
        animate={{ y: [0, 25, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-accent/25 blur-3xl pointer-events-none"
        animate={{ y: [0, -20, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial="hidden" animate="visible" variants={fadeUp}
        className="relative z-10 w-full max-w-4xl"
      >
        <div className="rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-glass overflow-hidden md:grid md:grid-cols-2">
          {/* Left panel - the reference's split-layout idea (logo, welcome
              message, decorative shapes on one side; the actual form on
              the other), but transparent/glass over the same photo
              background instead of a solid color block, and hidden below
              md so mobile keeps the single, compact panel it already had. */}
          <motion.div
            initial="hidden" animate="visible" variants={staggerContainer}
            className="hidden md:flex relative flex-col justify-between p-10 overflow-hidden border-r border-white/10"
          >
            {/* Panel-local floating glow, on top of the page-wide orbs
                behind it - "something live" per request, a slow
                continuous drift rather than a one-off entrance. */}
            <motion.div
              className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-accent/30 blur-3xl pointer-events-none"
              animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-secondary/30 blur-3xl pointer-events-none"
              animate={{ x: [0, -15, 0], y: [0, -10, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div variants={fadeUp} className="relative z-10">
              <div className="relative inline-flex mb-8">
                {/* Pulsing ring behind the logo - a small, literal "live"
                    cue, same idea as the LIVE badge's pulsing dot used
                    elsewhere on the site. */}
                <motion.span
                  className="absolute inset-0 rounded-full bg-accent/40"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <img src={logo} alt="AIMsisters" className="relative w-14 h-14 rounded-full object-cover shadow-glass" />
              </div>
              <motion.h2 variants={fadeUp} className="text-3xl font-display font-bold text-white leading-tight mb-3">
                Join <span className="text-accent">AIMsisters</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/70 text-sm max-w-xs">
                {mode === 'login'
                  ? 'Sign in to continue your journey with us.'
                  : 'Create an account to start your journey with us.'}
              </motion.p>
            </motion.div>

            <motion.div variants={fadeUp} className="relative z-10">
              <blockquote className="italic text-white/70 text-sm border-l-2 border-accent/60 pl-4">
                "Go ye into all the world, and preach the gospel to every creature."
                <footer className="not-italic text-accent font-semibold text-xs mt-1">— Mark 16:15</footer>
              </blockquote>
              <p className="text-xs text-white/40 mt-6">AIMsisters &middot; Christ is all in all</p>
            </motion.div>
          </motion.div>

          {/* Right panel - the actual form, unchanged logic throughout. */}
          <div className="p-8 sm:p-10">
            <div className="flex md:hidden justify-center mb-5">
              <span className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glass">
                <Lock className="w-6 h-6 text-white" />
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white text-center md:text-left mb-1">
              {mode === 'login' ? 'Sign In' : 'Create an Account'}
            </h1>
            <p className="text-white/60 text-sm text-center md:text-left mb-7">
              {mode === 'login' ? 'Sign in to continue your journey with us.' : 'Join the AIMsisters community.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                    <input
                      required
                      placeholder="Full name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent transition"
                    />
                  </div>
                  <div className="relative">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                    <input
                      required
                      placeholder="Username"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                      pattern="[a-z][a-z0-9_]{2,29}"
                      title="3-30 characters, start with a letter, letters/numbers/underscores only"
                      className="w-full pl-11 pr-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent transition"
                    />
                  </div>
                </>
              )}
              <div className="relative">
                {/* In login mode this doubles as "email or username" (one
                    combined field, same AuthController::login() resolves
                    either) - a plain text field rather than type="email",
                    which would block typing a username at all. Register
                    mode keeps a real, dedicated email field. */}
                {mode === 'login' ? (
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                ) : (
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                )}
                <input
                  required
                  type={mode === 'login' ? 'text' : 'email'}
                  placeholder={mode === 'login' ? 'Email or Username' : 'Email address'}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent transition"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-11 pr-11 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && <p className="text-sm text-rose-300 text-center">{error}</p>}

              <button
                disabled={loading}
                className="w-full py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-60"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            {/* Hidden when VITE_GOOGLE_CLIENT_ID isn't set (local dev
                before it's configured, see .env.example) - Google's own
                script fills this div once it loads, so there's nothing to
                conditionally render here beyond the container itself. */}
            {GOOGLE_CLIENT_ID && (
              <>
                <div className="flex items-center gap-3 mt-6 mb-5">
                  <div className="flex-1 h-px bg-white/15" />
                  <span className="text-xs text-white/40 font-medium">OR CONTINUE WITH GOOGLE</span>
                  <div className="flex-1 h-px bg-white/15" />
                </div>
                <div className="flex justify-center">
                  <div ref={googleButtonRef} />
                </div>
              </>
            )}

            <p className="text-center text-sm text-white/60 mt-6">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-accent font-semibold hover:text-white transition"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
