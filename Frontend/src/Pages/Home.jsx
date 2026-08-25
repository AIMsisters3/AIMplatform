import React, { useState } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import heroBg from '../assets/bg.png';
import { useAuth } from '../context/AuthContext.jsx';

const CATEGORIES = [
  'Bible Studies', 'Children', 'Devotions', 'Health', 'Music',
  'News', 'Prophecy', 'Sabbath School', 'Testimonies', 'Youth',
];

// Single element fade-up (used for headings, one-off blocks)
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

// Parent orchestrates stagger — children just use fadeUp, no manual `custom` index needed
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/**
 * Reusable frosted-glass section wrapper.
 * Sits over the page-wide fixed background photo, blurring it into a soft
 * white "cloud" so content stays readable while the photo still bleeds through.
 * Pass `glow` for the two ambient floating blobs (nice on 1-2 standout sections,
 * skip it elsewhere so it doesn't get busy).
 */
function GlassSection({ children, glow = false, className = '' }) {
  return (
    <section className={`relative py-20 overflow-hidden ${className}`}>
      <div className="absolute inset-0 backdrop-blur-2xl bg-white/75 border-y border-white/40" />
      {glow && (
        <>
          <motion.div
            className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-secondary/20 blur-3xl pointer-events-none"
            animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-24 -right-20 w-96 h-96 rounded-full bg-accent/20 blur-3xl pointer-events-none"
            animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-6">{children}</div>
    </section>
  );
}

// Heading row with optional "View all →" link, fades up on scroll
function SectionHeading({ children, action }) {
  return (
    <motion.div
      className="flex items-center justify-between mb-10"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
    >
      <h2 className="text-2xl md:text-3xl font-display font-bold text-ink">{children}</h2>
      {action}
    </motion.div>
  );
}

// Card grid with staggered entrance + lift-on-hover, reused by Featured/Devotions/News
function AnimatedGrid({ items, cols = 'md:grid-cols-3', onItemClick }) {
  return (
    <motion.div
      className={`grid grid-cols-1 ${cols} gap-6`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={staggerContainer}
    >
      {items.map((item) => (
        <motion.div
          key={item.id}
          variants={fadeUp}
          whileHover={{ y: -8, scale: 1.015 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="rounded-xl2 bg-white/90 backdrop-blur-md shadow-glass"
        >
          <ContentCard item={item} onClick={() => onItemClick?.(item)} />
        </motion.div>
      ))}
    </motion.div>
  );
}

const placeholder = (title, description) => (n) =>
  Array.from({ length: n }).map((_, i) => ({ id: `ph-${i}`, title, description, __placeholder: true }));

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [devotions, setDevotions] = useState([]);
  const [news, setNews] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [subMessage, setSubMessage] = useState('');
  const [testimonials, setTestimonials] = useState([]);
  const [showTestimonyForm, setShowTestimonyForm] = useState(false);
  const [testimonyText, setTestimonyText] = useState('');
  const [testimonyStatus, setTestimonyStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [testimonyMessage, setTestimonyMessage] = useState('');

  useEffect(() => {
    api.get('/content', { params: { featured: 1, limit: 3 } }).then((r) => setFeatured(r.data.data.items)).catch(() => {});
    api.get('/devotions', { params: { limit: 3 } }).then((r) => setDevotions(r.data.data.items)).catch(() => {});
    api.get('/news', { params: { limit: 3 } }).then((r) => setNews(r.data.data.items)).catch(() => {});
    api.get('/gallery', { params: { limit: 3 } }).then((r) => setGallery(r.data.data.items)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/testimonials', { params: { limit: 3 } })
      .then((r) => setTestimonials(r.data?.data?.items || []))
      .catch(() => {});
  }, []);

  const featuredItems = featured.length > 0 ? featured : placeholder('Sample Featured Study', 'Content will appear here once published from the admin CMS.')(3);
  const devotionItems = devotions.length > 0 ? devotions : placeholder('Daily Devotion', "A moment of reflection with God's Word.")(3);
  const newsItems = news.length > 0 ? news : placeholder('Ministry Update', 'Stay connected with what God is doing among us.')(3);
  const galleryItems = gallery.length > 0 ? gallery : placeholder('Photo Gallery', 'Explore our community moments.')(3);

   const { user } = useAuth();

    async function handleSubmitTestimony(e) {
      e.preventDefault();
      setTestimonyStatus('loading');
      try {
        const r = await api.post('/testimonials', { body: testimonyText });
        setTestimonyStatus('success');
        setTestimonyMessage(r.data.message || 'Submitted for review!');
        setTestimonyText('');
      } catch (err) {
        setTestimonyStatus('error');
        setTestimonyMessage(err.response?.data?.message || 'Something went wrong.');
      }
    }

  function handleOpenItem(item) {
    if (item.__placeholder) return;
    setActiveItem(item);
  }

    async function handleSubscribe(e) {
    e.preventDefault();
    setSubStatus('loading');
    try {
      const r = await api.post('/newsletter/subscribe', { email });
      setSubStatus('success');
      setSubMessage(r.data.message || 'Subscribed! Check your inbox.');
      setEmail('');
    } catch (err) {
      setSubStatus('error');
      setSubMessage(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="relative">
      {/* Page-wide fixed background — every section below sits over this */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />

      {/* Hero — the one section that shows the photo at full strength, no glass */}
      <section className="relative overflow-hidden min-h-[580px] flex items-center">
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-surface to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="max-w-xl text-left">
            <motion.h1
              className="text-5xl md:text-6xl font-display font-extrabold leading-none mb-5"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            >
              <span className="text-white">AIM</span>
              <span className="text-accent">sisters</span>
            </motion.h1>

            <motion.p
              className="text-2xl md:text-3xl text-white font-semibold leading-snug mb-6"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} transition={{ delay: 0.1 }}
            >
              Sharing the Everlasting Gospel
              <br />Through Faith and Technology
            </motion.p>

            <motion.blockquote
              className="text-white/85 italic text-base mb-8 border-l-2 border-white/40 pl-4"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} transition={{ delay: 0.2 }}
            >
              "Go ye into all the world,
              <br />and preach the gospel to every creature."
              <br />
              <span className="not-italic font-semibold">— Mark 16:15</span>
            </motion.blockquote>

            <motion.div
              className="flex flex-wrap gap-4"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} transition={{ delay: 0.3 }}
            >
              <Link to="/content" className="px-8 py-3 rounded-full bg-secondary text-white font-semibold shadow-glass hover:opacity-90 transition">
                Explore Content
              </Link>
              <Link to="/devotions" className="px-8 py-3 rounded-full border-2 border-white text-white font-semibold hover:bg-white/10 transition">
                Daily Devotion
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured — the glow one, since it's the first glass panel someone hits */}
      <GlassSection glow>
        <SectionHeading>Featured Content</SectionHeading>
        <AnimatedGrid items={featuredItems} onItemClick={handleOpenItem} />
      </GlassSection>

      {/* Latest Devotions */}
      <GlassSection>
        <SectionHeading action={<Link to="/devotions" className="text-secondary text-sm font-semibold">View all →</Link>}>
          Latest Devotions
        </SectionHeading>
        <AnimatedGrid items={devotionItems} onItemClick={handleOpenItem} />
      </GlassSection>

      {/* Latest News */}
      <GlassSection>
        <SectionHeading action={<Link to="/news" className="text-secondary text-sm font-semibold">View all →</Link>}>
          Latest News
        </SectionHeading>
        <AnimatedGrid items={newsItems} onItemClick={handleOpenItem} />
      </GlassSection>

      {/* Popular Categories */}
      <GlassSection>
        <SectionHeading>Popular Categories</SectionHeading>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          {CATEGORIES.map((cat) => (
            <motion.div key={cat} variants={fadeUp} whileHover={{ y: -4, scale: 1.04 }}>
              <Link to="/content" className="glass-card block p-5 text-center font-semibold text-sm hover:text-secondary transition">
                {cat}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </GlassSection>

      {/* Mission */}
      <GlassSection>
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-6 text-ink">Our Mission</h2>
          <p className="text-ink/70 leading-relaxed">
            To spread the everlasting Gospel by using digital media, prayer, Bible-based teaching, community outreach, and Christian resources that strengthen believers and reach souls for Christ.
          </p>
        </motion.div>
      </GlassSection>

      {/* Gallery Preview */}
      <GlassSection>
        <SectionHeading action={<Link to="/gallery" className="text-secondary text-sm font-semibold">View all →</Link>}>
          Gallery
        </SectionHeading>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          {gallery.length > 0
            ? gallery.map((item) => (
                <motion.div
                  key={item.id}
                  variants={fadeUp}
                  whileHover={{ scale: 1.04 }}
                  onClick={() => handleOpenItem(item)}
                  className="aspect-square rounded-xl2 overflow-hidden shadow-glass cursor-pointer"
                >
                  <img
                    src={item.thumbnail || item.media_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))
            : Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={{ scale: 1.04, rotate: i % 2 === 0 ? -1 : 1 }}
                  className="aspect-square rounded-xl2 bg-brand-gradient-soft shadow-glass"
                />
              ))}
        </motion.div>
      </GlassSection>

      {/* Testimonials */}
      {/* Testimonials */}
<GlassSection>
  <SectionHeading
    action={
      user ? (
        <button
          onClick={() => setShowTestimonyForm((v) => !v)}
          className="text-secondary text-sm font-semibold"
        >
          {showTestimonyForm ? 'Cancel' : 'Share Your Testimony'}
        </button>
      ) : (
        <Link to="/login" className="text-secondary text-sm font-semibold">
          Sign in to share yours
        </Link>
      )
    }
  >
    Testimonials
  </SectionHeading>

  {showTestimonyForm && (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      onSubmit={handleSubmitTestimony}
      className="glass-card p-6 mb-8"
    >
      <textarea
        required
        maxLength={2000}
        rows={4}
        value={testimonyText}
        onChange={(e) => setTestimonyText(e.target.value)}
        placeholder="Share how God has worked in your life..."
        className="w-full px-4 py-3 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary text-sm resize-none"
      />
      <div className="flex items-center justify-between mt-3">
        {testimonyMessage && (
          <p className={`text-xs ${testimonyStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {testimonyMessage}
          </p>
        )}
        <button
          disabled={testimonyStatus === 'loading'}
          className="ml-auto px-6 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass disabled:opacity-60"
        >
          {testimonyStatus === 'loading' ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </motion.form>
  )}

    <motion.div
    className="grid grid-cols-1 md:grid-cols-3 gap-6"
    initial="hidden" animate="visible"
    variants={staggerContainer}
  >
    {(testimonials.length > 0
      ? testimonials
      : [
          { id: 'ph-1', body: "This ministry's devotions have brought so much peace and clarity to my daily walk with God.", user_name: 'Community Member' },
          { id: 'ph-2', body: 'AIMsisters helped me grow closer to Christ during a difficult season of my life.', user_name: 'Community Member' },
          { id: 'ph-3', body: 'The Bible studies here are deep, practical, and truly Spirit-led.', user_name: 'Community Member' },
        ]
    ).map((t, i) => (
      <motion.div key={t.id} variants={fadeUp} whileHover={{ y: -6 }} className="glass-card p-6">
        <p className="text-ink/70 text-sm italic mb-4">"{t.body}"</p>
        <p className="font-semibold text-sm text-ink">— {t.user_name}</p>
      </motion.div>
    ))}
  </motion.div>
</GlassSection>

      {/* Newsletter */}
      <GlassSection>
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
        >
          <h2 className="text-2xl font-bold mb-4 text-ink">Stay Connected</h2>
          <p className="text-ink/60 mb-6">Subscribe to receive new devotions, studies, and ministry news in your inbox.</p>
          
          <form className="flex flex-col sm:flex-row gap-3 justify-center" onSubmit={handleSubscribe}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="px-5 py-3 rounded-full border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary w-full sm:w-80"
            />
            <button
              disabled={subStatus === 'loading'}
              className="px-8 py-3 rounded-full bg-brand-gradient text-white font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-60"
            >
              {subStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          {subMessage && (
            <p className={`mt-3 text-sm ${subStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {subMessage}
            </p>
          )}
        </motion.div>
      </GlassSection>

      <ContentViewerModal item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}