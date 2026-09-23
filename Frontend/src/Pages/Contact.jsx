import React, { useState } from 'react';
import api from '../api/axios.js';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
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
    <div className="max-w-2xl mx-auto px-6 py-20">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-ink/60 mb-10">We'd love to hear from you. Send us a message below.</p>

      {sent ? (
        <div className="glass-card p-8 text-center">
          <p className="font-semibold text-secondary">Thank you! Your message has been sent.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-4">
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
            className="w-full px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Your email"
            className="w-full px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <textarea
            required
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Your message"
            rows={5}
            className="w-full px-5 py-3 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
          <button
            disabled={sending}
            className="w-full py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  );
}
