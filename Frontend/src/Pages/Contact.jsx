import React, { useState } from 'react';

export default function Contact() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: wire up to a /api/contact endpoint when ready
    setSent(true);
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
          <input required placeholder="Your name" className="w-full px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          <input required type="email" placeholder="Your email" className="w-full px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          <textarea required placeholder="Your message" rows={5} className="w-full px-5 py-3 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          <button className="w-full py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition">
            Send Message
          </button>
        </form>
      )}
    </div>
  );
}
