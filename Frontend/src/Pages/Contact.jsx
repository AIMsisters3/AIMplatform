import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Quote, Mail, Phone, MapPin, Send, HandHeart, BookOpen, Sunrise, Video, BookMarked, Bell, Loader2 } from 'lucide-react';
import api from '../api/axios.js';

// Real ministry contact details — the same email already used as the
// Contact form's own inbox on the backend (ContactController::CONTACT_INBOX).
const CONTACT_EMAIL = 'aimsisters3@gmail.com';
const CONTACT_WHATSAPP_DISPLAY = '+264 81 261 6938';
const CONTACT_WHATSAPP_LINK = 'https://wa.me/264812616938';
const CONTACT_LOCATION = 'Online';

// Mirrors ContactController::SUBJECTS exactly (Backend/controllers/ContactController.php).
const SUBJECTS = ['General Inquiry', 'Prayer Request', 'Testimony', 'Partnership / Support', 'Technical Issue', 'Other'];

const FOLLOW_TOPICS = [
  { icon: BookOpen, label: 'Daily Bible verses' },
  { icon: Sunrise, label: 'Devotionals' },
  { icon: Video, label: 'Christian videos' },
  { icon: BookMarked, label: 'Bible studies' },
  { icon: Bell, label: 'Ministry updates' },
  { icon: HandHeart, label: 'Prayer encouragement' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post('/contact', form);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink via-primary to-secondary py-16 sm:py-20">
        <motion.div
          className="absolute -top-20 -left-16 w-80 h-80 rounded-full bg-accent/20 blur-3xl pointer-events-none"
          animate={{ y: [0, 24, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-accent tracking-widest uppercase">Contact Us</span>
          </motion.div>
          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.05 }}
            className="font-display italic text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-4 max-w-xl"
          >
            We'd Love to Hear From You
          </motion.h1>
          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.1 }}
            className="text-white/80 text-base sm:text-lg max-w-xl mb-6"
          >
            Whether you have a question, a prayer request, a testimony, or simply want to connect with us, we would be happy to hear from you.
          </motion.p>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.15 }} className="flex items-start gap-2 max-w-md">
            <Quote className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className="text-white/70 italic text-sm sm:text-base">
              "Carry each other's burdens, and in this way you will fulfill the law of Christ."
              <span className="block not-italic text-accent font-semibold text-xs tracking-wide uppercase mt-1">Galatians 6:2</span>
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-14">
        {/* Get in Touch */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="text-center mb-8"
        >
          <h2 className="font-display font-bold text-2xl">Get in Touch</h2>
        </motion.div>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14"
        >
          <motion.a href={`mailto:${CONTACT_EMAIL}`} variants={fadeUp} className="glass-card p-6 text-center hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center mx-auto mb-3 shadow-glass">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-sm mb-0.5">Email</p>
            <p className="text-ink/60 text-xs break-all">{CONTACT_EMAIL}</p>
          </motion.a>
          <motion.a href={CONTACT_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" variants={fadeUp} className="glass-card p-6 text-center hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center mx-auto mb-3 shadow-glass">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-sm mb-0.5">WhatsApp</p>
            <p className="text-ink/60 text-xs">{CONTACT_WHATSAPP_DISPLAY}</p>
          </motion.a>
          <motion.div variants={fadeUp} className="glass-card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center mx-auto mb-3 shadow-glass">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-sm mb-0.5">Location</p>
            <p className="text-ink/60 text-xs">{CONTACT_LOCATION}</p>
          </motion.div>
        </motion.div>

        {/* Prayer Requests */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="glass-card p-6 sm:p-8 mb-14 flex flex-col sm:flex-row items-center gap-6"
        >
          <div className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center shrink-0">
            <HandHeart className="w-8 h-8 text-secondary" />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="font-display font-bold text-lg mb-2">Prayer Requests</h3>
            <p className="text-ink/70 text-sm leading-relaxed mb-2">
              If you would like us to pray with you, please send us your prayer request. Every request is treated
              with care and respect. We believe God hears every sincere prayer.
            </p>
            <p className="text-secondary italic text-sm font-medium">
              "Call unto Me, and I will answer thee..." <span className="not-italic font-semibold">— Jeremiah 33:3</span>
            </p>
          </div>
        </motion.div>

        {/* Follow Our Ministry */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mb-14">
          <h2 className="font-display font-bold text-xl mb-1">Follow Our Ministry</h2>
          <p className="text-ink/50 text-sm mb-5">Stay connected through our social media platforms for:</p>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {FOLLOW_TOPICS.map((t) => (
              <motion.div key={t.label} variants={fadeUp} className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-gradient-soft flex items-center justify-center mx-auto mb-2">
                  <t.icon className="w-5 h-5 text-secondary" />
                </div>
                <p className="text-xs text-ink/60 font-medium">{t.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Send Us a Message */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <h2 className="font-display font-bold text-xl mb-5">Send Us a Message</h2>

          {sent ? (
            <div className="glass-card p-8 text-center">
              <p className="font-semibold text-secondary">Thank you! Your message has been sent — we'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-4">
              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-ink/50">Full Name *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    className="mt-1 w-full px-4 py-3 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink/50">Subject *</span>
                  <select
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="mt-1 w-full px-4 py-3 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary bg-white"
                  >
                    <option value="">Select a subject</option>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-ink/50">Email Address *</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="mt-1 w-full px-4 py-3 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink/50">Message *</span>
                <textarea
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Type your message here..."
                  rows={5}
                  className="mt-1 w-full px-4 py-3 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </label>
              <button
                disabled={sending}
                className="px-8 py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-60 flex items-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </motion.div>

        {/* Thank you banner */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#3a2a6e] to-secondary p-8 sm:p-10 text-center mt-14"
        >
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <h2 className="relative z-10 font-display font-bold text-xl sm:text-2xl text-white mb-3">
            Thank you for visiting AIMsisters Ministry.
          </h2>
          <p className="relative z-10 text-white/75 max-w-xl mx-auto text-sm sm:text-base leading-relaxed mb-4">
            We pray that through every message, study, and resource you find here, you will grow closer to Jesus
            Christ and experience the peace, hope, and comfort that only He can give.
          </p>
          <p className="relative z-10 text-accent italic text-sm font-medium max-w-xl mx-auto">
            "Now unto Him that is able to keep you from falling, and to present you faultless before the presence
            of His glory with exceeding joy," <span className="not-italic font-semibold text-white/80">— Jude 24</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
