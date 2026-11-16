import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import api from '../api/axios.js';
import heroBg from '../assets/bg.png';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

/**
 * Landed on from the "Reset Password" button in the email
 * AuthController::forgotPassword() sends — `token` identifies which
 * request this is (see Backend/models/PasswordReset.php), never the
 * user themselves, so there's nothing here to prefill or look up ahead
 * of submitting the new password.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('This reset link is missing its token. Please use the link from your email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-16 px-6">
      <div className="absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ink/80 via-ink/70 to-secondary/60" />

      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-glass p-8 sm:p-10">
          <div className="flex justify-center mb-5">
            <span className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glass">
              <Lock className="w-6 h-6 text-white" />
            </span>
          </div>

          {done ? (
            <div className="text-center space-y-5">
              <CheckCircle2 className="w-10 h-10 text-accent mx-auto" />
              <h1 className="text-2xl font-display font-bold text-white">Password reset</h1>
              <p className="text-white/70 text-sm">Your password has been changed. You can now sign in with it.</p>
              <Link
                to="/login"
                className="inline-block w-full py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white text-center mb-1">Choose a New Password</h1>
              <p className="text-white/60 text-sm text-center mb-7">Enter and confirm your new password below.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-accent transition"
                  />
                </div>

                {error && <p className="text-sm text-rose-300 text-center">{error}</p>}

                <button
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-60"
                >
                  {loading ? 'Please wait...' : 'Reset Password'}
                </button>
              </form>

              <p className="text-center text-sm text-white/60 mt-6">
                <Link to="/login" className="text-accent font-semibold hover:text-white transition">Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
