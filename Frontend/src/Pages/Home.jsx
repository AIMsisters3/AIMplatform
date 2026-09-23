import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartPulse, Shirt, Sparkles, ScrollText, Quote, Mail, Send } from 'lucide-react';
import api from '../api/axios.js';
import ContentCard from '../Components/ContentCard.jsx';
import ContentViewerModal from '../Components/ContentViewerModal.jsx';
import heroBg from '../assets/bg.png';
import { useAuth } from '../context/AuthContext.jsx';

// The four category cards, in the requested order — icon/gradient per
// category since there's no per-category photo asset in the project and
// sourcing new stock photography isn't something this session can verify
// the licensing on; a distinct color identity per card still reads as
// "decorative", not a placeholder. Matched by name against whatever the
// `categories` API actually returns (migrations 019/020), so a renamed
// or reordered category in the database is still handled without a
// code change - a name with no match here just doesn't render a card.
const CATEGORY_CARD_META = {
  'Dress Reform':     { icon: Shirt, gradient: 'from-orange-400 to-amber-500', tagline: 'Modesty & godly living' },
  'Health Reform':    { icon: HeartPulse, gradient: 'from-emerald-400 to-teal-500', tagline: 'Wellness of body & soul' },
  'Spiritual Reform':  { icon: Sparkles, gradient: 'from-purple-400 to-secondary', tagline: 'Renewal in Christ' },
  'Prophecy':          { icon: ScrollText, gradient: 'from-rose-400 to-pink-500', tagline: "Bible wisdom for today" },
};
const CATEGORY_CARD_ORDER = ['Dress Reform', 'Health Reform', 'Spiritual Reform', 'Prophecy'];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

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

function SectionHeading({ children, subtitle, action }) {
  return (
    <motion.div
      className="flex items-end justify-between mb-10 gap-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
    >
      <div>
        <h2 className="text-2xl md:text-3xl font-display font-bold text-ink">{children}</h2>
        {subtitle && <p className="text-ink/50 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  );
}

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

function CategoryCard({ category }) {
  const meta = CATEGORY_CARD_META[category.name];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <motion.div variants={fadeUp}>
      <Link
        to={`/category/${category.id}`}
        className="group relative block overflow-hidden rounded-3xl aspect-[4/5] sm:aspect-square shadow-glass"
      >
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.4 }}
        />
        {/* Decorative translucent shapes — this session's stand-in for a
            per-category photo (see CATEGORY_CARD_META's note above). */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/15 group-hover:scale-125 transition-transform duration-500" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-black/10" />
        <Icon className="absolute -bottom-4 -right-4 w-24 h-24 text-white/15 rotate-12" />

        <div className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-6">
          <Icon className="w-8 h-8 text-white mb-2 drop-shadow" />
          <h3 className="font-display font-bold text-lg sm:text-xl text-white leading-tight">{category.name}</h3>
          <p className="text-white/80 text-xs mt-1">{meta.tagline}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [devotions, setDevotions] = useState([]);
  const [news, setNews] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [categories, setCategories] = useState([]);
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState(null);
  const [subMessage, setSubMessage] = useState('');
  const [testimonials, setTestimonials] = useState([]);
  const [showTestimonyForm, setShowTestimonyForm] = useState(false);
  const [testimonyText, setTestimonyText] = useState('');
  const [testimonyStatus, setTestimonyStatus] = useState(null);
  const [testimonyMessage, setTestimonyMessage] = useState('');

  useEffect(() => {
    api.get('/content', { params: { featured: 1, limit: 3 } }).then((r) => setFeatured(r.data.data.items)).catch(() => {});
    api.get('/devotions', { params: { limit: 3 } }).then((r) => setDevotions(r.data.data.items)).catch(() => {});
    api.get('/news', { params: { limit: 3 } }).then((r) => setNews(r.data.data.items)).catch(() => {});
    api.get('/gallery', { params: { limit: 4 } }).then((r) => setGallery(r.data.data.items)).catch(() => {});
    api.get('/categories', { params: { type: 'content' } })
      .then((r) => {
        const items = r.data?.data?.items || [];
        const ordered = CATEGORY_CARD_ORDER
          .map((name) => items.find((c) => c.name === name))
          .filter(Boolean);
        setCategories(ordered);
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    api.get('/testimonials', { params: { limit: 3 } })
      .then((r) => setTestimonials(r.data?.data?.items || []))
      .catch(() => {});
  }, []);

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
    setActiveItem(item);
  }

  async function handleSubscribe(e) {
    e.preventDefault();
    setSubStatus('loading');
    try {
      const r = await api.post('/newsletter/subscribe', { email });
      setSubStatus('success');
      let message = r.data.message || "You're subscribed! You'll receive new AIMsisters devotions and ministry news in your inbox.";
      if (r.data.data?.email_sent === false) {
        message += ' (We could not send a confirmation email right now, but you are on the list.)';
      }
      setSubMessage(message);
      setEmail('');
    } catch (err) {
      setSubStatus('error');
      setSubMessage(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="relative">
      {/* Different composition per screen size, not the same crop
          stretched to fit: mobile favors a tighter, higher crop (keeps
          the hero itself compact, per spec) while desktop shows the
          fuller frame centered. */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-[position:65%_top] md:bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />

      {/* Hero — shorter on mobile so it stays compact, taller on desktop
          where there's room for it. */}
      <section className="relative overflow-hidden min-h-[420px] md:min-h-[580px] flex items-center">
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
              <br /><span className="not-italic font-semibold">— Mark 16:15</span>
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

      {/* Featured — only when there's genuinely featured content */}
      {featured.length > 0 && (
        <GlassSection glow>
          <SectionHeading>Featured Content</SectionHeading>
          <AnimatedGrid items={featured} onItemClick={handleOpenItem} />
        </GlassSection>
      )}

      {devotions.length > 0 && (
        <GlassSection>
          <SectionHeading action={<Link to="/devotions" className="text-secondary text-sm font-semibold">View all →</Link>}>
            Latest Devotions
          </SectionHeading>
          <AnimatedGrid items={devotions} onItemClick={handleOpenItem} />
        </GlassSection>
      )}

      {news.length > 0 && (
        <GlassSection>
          <SectionHeading action={<Link to="/news" className="text-secondary text-sm font-semibold">View all →</Link>}>
            Latest News
          </SectionHeading>
          <AnimatedGrid items={news} onItemClick={handleOpenItem} />
        </GlassSection>
      )}

      {/* Category cards — deliberately no "Popular Categories" heading */}
      {categories.length > 0 && (
        <GlassSection>
          <SectionHeading subtitle="Find teaching and inspiration built around what matters to you.">
            Explore by Focus
          </SectionHeading>
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
          >
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </motion.div>
        </GlassSection>
      )}

      {/* Our Mission */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-primary via-[#3a2a6e] to-secondary">
        <div className="absolute inset-0 opacity-25 mix-blend-soft-light" style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <motion.div
          className="absolute top-10 left-10 w-64 h-64 rounded-full bg-accent/20 blur-3xl pointer-events-none"
          animate={{ y: [0, 25, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none"
          animate={{ y: [0, -25, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-6 shadow-glass"
          >
            <Sparkles className="w-7 h-7 text-accent" />
          </motion.div>
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-3xl md:text-4xl font-display font-bold text-white mb-6"
          >
            Our Mission
          </motion.h2>
          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: 0.1 }}
            className="text-white/85 text-lg leading-relaxed max-w-2xl mx-auto"
          >
            To spread the everlasting Gospel by using digital media, prayer, Bible-based teaching, community
            outreach, and Christian resources that strengthen believers and reach souls for Christ.
          </motion.p>
        </div>
      </section>

      {/* Matthew 24:14 */}
      <section className="relative py-20 overflow-hidden bg-surface">
        <div className="absolute inset-0 bg-brand-gradient-soft" />
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="relative z-10 max-w-3xl mx-auto px-6 text-center"
        >
          <Quote className="w-8 h-8 text-secondary/50 mx-auto mb-5" />
          <p className="font-display italic text-xl sm:text-2xl md:text-3xl text-ink leading-snug mb-4">
            "And this gospel of the kingdom shall be preached in all the world for a witness unto all nations;
            and then shall the end come."
          </p>
          <p className="font-semibold text-secondary tracking-wide">Matthew 24:14 (KJV)</p>
        </motion.div>
      </section>

      {gallery.length > 0 && (
        <GlassSection>
          <SectionHeading action={<Link to="/gallery" className="text-secondary text-sm font-semibold">View all →</Link>}>
            Gallery
          </SectionHeading>
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
          >
            {gallery.map((item) => (
              <motion.div
                key={item.id}
                variants={fadeUp}
                whileHover={{ scale: 1.04 }}
                onClick={() => handleOpenItem(item)}
                className="aspect-square rounded-xl2 overflow-hidden shadow-glass cursor-pointer"
              >
                <img src={item.thumbnail || item.media_url} alt={item.title} className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </motion.div>
        </GlassSection>
      )}

      {/* Testimonials — only ever real, approved testimonials; the whole
          section (including the form's own visibility) is otherwise
          omitted, never backfilled with invented quotes. */}
      {(testimonials.length > 0 || user) && (
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-2xl bg-white/75 border-y border-white/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <SectionHeading
              subtitle={testimonials.length > 0 ? 'Real stories from our community.' : undefined}
              action={
                user ? (
                  <button onClick={() => setShowTestimonyForm((v) => !v)} className="text-secondary text-sm font-semibold">
                    {showTestimonyForm ? 'Cancel' : 'Share Your Testimony'}
                  </button>
                ) : (
                  <Link to="/login" className="text-secondary text-sm font-semibold">Sign in to share yours</Link>
                )
              }
            >
              Testimonies
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

            {testimonials.length > 0 && (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
              >
                {testimonials.map((t) => (
                  <motion.div
                    key={t.id}
                    variants={fadeUp}
                    whileHover={{ y: -6 }}
                    className="relative glass-card p-6 overflow-hidden"
                  >
                    <Quote className="absolute -top-2 -right-2 w-16 h-16 text-secondary/10" />
                    <p className="relative text-ink/70 text-sm italic mb-4">"{t.body}"</p>
                    <p className="relative font-semibold text-sm text-ink">— {t.user_name}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* Newsletter — its own deliberately decorated section, not a plain
          form dropped into the generic glass-section pattern. */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-primary via-[#3F2E7A] to-secondary">
        <div className="absolute inset-0 opacity-20 mix-blend-soft-light" style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center 20%' }} />
        <motion.div
          className="absolute top-8 right-10 w-72 h-72 rounded-full bg-accent/25 blur-3xl pointer-events-none"
          animate={{ y: [0, 25, 0], x: [0, -15, 0] }} transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"
          animate={{ y: [0, -20, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="relative z-10 max-w-2xl mx-auto px-6 text-center"
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-6 shadow-glass">
            <Mail className="w-7 h-7 text-accent" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-3">Stay Connected</h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto">
            Subscribe to receive new devotions and ministry news directly in your inbox.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto" onSubmit={handleSubscribe}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 px-5 py-3.5 rounded-full border-0 bg-white/95 shadow-glass focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            />
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              disabled={subStatus === 'loading'}
              className="px-7 py-3.5 rounded-full bg-white text-secondary font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2 shrink-0"
            >
              {subStatus === 'loading' ? 'Subscribing...' : <>Subscribe <Send className="w-4 h-4" /></>}
            </motion.button>
          </form>
          {subMessage && (
            <p className={`mt-4 text-sm font-medium ${subStatus === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {subMessage}
            </p>
          )}
        </motion.div>
      </section>

      <ContentViewerModal item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
