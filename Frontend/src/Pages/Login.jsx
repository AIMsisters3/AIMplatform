import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axios.js';
import heroBg from '../assets/bg.png';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Login() {
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-glass p-8 sm:p-10">
          <div className="flex justify-center mb-5">
            <span className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glass">
              <Lock className="w-6 h-6 text-white" />
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white text-center mb-1">
            {mode === 'login' ? 'User Login' : 'Create an Account'}
          </h1>
          <p className="text-white/60 text-sm text-center mb-7">
            {mode === 'login' ? 'Sign in to continue your journey with us.' : 'Join the AIMsisters community.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
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
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                required
                type="email"
                placeholder="Email address"
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
      </motion.div>
    </div>
  );
}
