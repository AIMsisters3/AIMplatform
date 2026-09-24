import React from 'react';
import { motion } from 'framer-motion';
import { Quote, Crown, BookOpen, HandHeart, Heart, ShieldCheck, HeartHandshake, Sunrise, Target, Eye } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

// Verbatim, per the ministry's own wording — nothing here is invented.
// The Mission text is the site's one existing canonical statement
// (already used on Home.jsx and in the footer), reused here rather than
// a second, slightly-different version.
const MISSION = "To spread the everlasting Gospel by using digital media, prayer, Bible-based teaching, community outreach, and Christian resources that strengthen believers and reach souls for Christ.";
const VISION = "To build a Christ-centered community where lives are transformed through God's Word, faith is strengthened, hope is restored, and people are prepared for the Kingdom of God.";

const CORE_VALUES = [
  { icon: Crown, title: 'Christ First', text: 'Jesus Christ is the center of everything we do.' },
  { icon: BookOpen, title: 'The Bible', text: "God's Word is our guide and final authority." },
  { icon: HandHeart, title: 'Prayer', text: 'We believe prayer changes lives.' },
  { icon: Heart, title: 'Love', text: 'We serve others with kindness, compassion and respect.' },
  { icon: ShieldCheck, title: 'Integrity', text: 'We strive to honour God through honesty and faithfulness.' },
  { icon: HeartHandshake, title: 'Service', text: "We use our gifts to bless others and advance God's work." },
  { icon: Sunrise, title: 'Hope', text: "We point people to the promise of Christ's soon return." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink via-primary to-secondary py-16 sm:py-20">
        <motion.div
          className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-accent/20 blur-3xl pointer-events-none"
          animate={{ y: [0, 24, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"
          animate={{ y: [0, -20, 0] }} transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-accent tracking-widest uppercase">About Us</span>
          </motion.div>
          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.05 }}
            className="text-3xl sm:text-5xl font-display font-extrabold text-white leading-tight mb-3 max-w-2xl"
          >
            Welcome to <span className="bg-gradient-to-r from-accent via-pink-300 to-white bg-clip-text text-transparent">AIMsisters</span> Ministry
          </motion.h1>
          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.1 }}
            className="font-display italic text-white/85 text-lg sm:text-xl mb-6"
          >
            Three sisters. One purpose. Jesus.
          </motion.p>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.15 }} className="flex items-start gap-2 max-w-md">
            <Quote className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className="text-white/70 italic text-sm sm:text-base">
              "Set your minds on things above, not on earthly things."
              <span className="block not-italic text-accent font-semibold text-xs tracking-wide uppercase mt-1">Colossians 3:2</span>
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-14">
        {/* Our Story + Mission/Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h2 className="font-display font-bold text-2xl mb-4">Our Story</h2>
            <div className="space-y-4 text-ink/70 leading-relaxed">
              <p>
                Our name, AIM, comes from the first letters of our names: <strong className="text-ink">Alina, Irja, and Maria</strong>.
                More than a name, AIM reminds us to keep our eyes fixed on Christ and to live with purpose, faith, and hope.
              </p>
              <p>
                Through Bible studies, devotionals, videos, articles, prayer, and community outreach, we seek to encourage
                people to know Jesus personally and to grow in their walk with Him.
              </p>
              <p>
                We welcome everyone who is searching for truth, whether you are beginning your journey with Christ or have
                been walking with Him for many years.
              </p>
            </div>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-5">
            <motion.div variants={fadeUp} className="glass-card p-6">
              <div className="w-11 h-11 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">Our Mission</h3>
              <p className="text-ink/70 text-sm leading-relaxed">{MISSION}</p>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-card p-6">
              <div className="w-11 h-11 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center mb-3">
                <Eye className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">Our Vision</h3>
              <p className="text-ink/70 text-sm leading-relaxed">{VISION}</p>
            </motion.div>
          </motion.div>
        </div>

        {/* Our Core Values */}
        <div className="mb-16">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="font-display font-bold text-2xl text-center mb-8"
          >
            Our Core Values
          </motion.h2>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4"
          >
            {CORE_VALUES.map((v) => (
              <motion.div key={v.title} variants={fadeUp} className="text-center">
                <div className="w-14 h-14 rounded-full bg-brand-gradient-soft flex items-center justify-center mx-auto mb-3">
                  <v.icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-display font-bold text-sm mb-1">{v.title}</h3>
                <p className="text-xs text-ink/55 leading-snug">{v.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Everything we do is for one purpose */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#3a2a6e] to-secondary p-8 sm:p-12 text-center"
        >
          <div className="absolute -top-10 -left-10 w-56 h-56 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <h2 className="relative z-10 font-display italic text-xl sm:text-2xl text-white/90 mb-3">
            Everything we do is for one purpose...
          </h2>
          <p className="relative z-10 text-white/80 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            To glorify God, strengthen His people, and help prepare the world for the soon coming of Jesus Christ.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
