import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookHeart, BookOpen, Puzzle, Music2, Star, Sparkles, Trophy } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';

const float = (delay = 0, distance = 14, duration = 6) => ({
  animate: { y: [0, -distance, 0] },
  transition: { duration, repeat: Infinity, ease: 'easeInOut', delay },
});

/** A handful of soft decorative shapes for the sky - purely visual, no semantic content. */
function SkyDecor() {
  return (
    <>
      <motion.div className="absolute top-10 left-[8%] w-20 h-20 rounded-full bg-white/70 blur-[2px]" {...float(0, 10, 7)} />
      <motion.div className="absolute top-24 left-[22%] w-14 h-14 rounded-full bg-white/60 blur-[2px]" {...float(1, 8, 8)} />
      <motion.div className="absolute top-16 right-[14%] w-24 h-24 rounded-full bg-white/70 blur-[2px]" {...float(0.5, 12, 6.5)} />
      <motion.div className="absolute top-32 right-[28%] w-12 h-12 rounded-full bg-white/50 blur-[2px]" {...float(1.4, 9, 7.5)} />
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-white/80"
          style={{ top: `${15 + (i % 3) * 18}%`, left: `${10 + i * 14}%` }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
        >
          <Star className="w-4 h-4" fill="currentColor" />
        </motion.div>
      ))}
    </>
  );
}

const AREAS = [
  {
    to: '/kids/stories', label: 'Bible Stories', icon: BookHeart,
    blurb: 'Watch fun cartoons about people in the Bible!',
    from: 'from-orange-400', to2: 'to-amber-500', ring: 'ring-orange-200',
  },
  {
    to: '/kids/lessons', label: 'Bible Lessons', icon: BookOpen,
    blurb: 'Learn amazing things about God and His Word!',
    from: 'from-sky-400', to2: 'to-blue-500', ring: 'ring-sky-200',
  },
  {
    to: '/kids/activities', label: 'Bible Activities', icon: Puzzle,
    blurb: 'Play games and quizzes to test what you know!',
    from: 'from-emerald-400', to2: 'to-teal-500', ring: 'ring-emerald-200',
  },
];

export default function KidsHub() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get('/children/progress').then((r) => setProgress(r.data?.data || null)).catch(() => setProgress(null));
  }, [user]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF8EC' }}>
      {/* Hero - its own distinct visual identity (spec): a warm sunrise sky
          rather than the site's purple/indigo adult branding, built from
          layered CSS/SVG shapes (sun, clouds, rainbow, stars) since no
          character illustration asset exists yet - see the chat message
          offering to swap one in if the user sends cartoon Bible-scene
          artwork later. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-amber-100 pt-14 pb-20 sm:pt-20 sm:pb-28">
        <SkyDecor />
        {/* Sun */}
        <motion.div
          className="absolute -top-10 right-[6%] sm:right-[12%] w-40 h-40 sm:w-56 sm:h-56 rounded-full bg-gradient-to-br from-yellow-200 to-amber-400 shadow-[0_0_80px_30px_rgba(251,191,36,0.45)]"
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Rainbow arc */}
        <svg className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[140%] max-w-none sm:w-full opacity-80" viewBox="0 0 600 200" fill="none">
          <path d="M20 200C20 100 150 20 300 20C450 20 580 100 580 200" stroke="#FCA5A5" strokeWidth="14" />
          <path d="M50 200C50 112 165 44 300 44C435 44 550 112 550 200" stroke="#FDE68A" strokeWidth="14" />
          <path d="M80 200C80 124 180 68 300 68C420 68 520 124 520 200" stroke="#86EFAC" strokeWidth="14" />
          <path d="M110 200C110 136 195 92 300 92C405 92 490 136 490 200" stroke="#93C5FD" strokeWidth="14" />
        </svg>
        {/* Soft ground clouds along the bottom edge */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-[#FFF8EC]" style={{ clipPath: 'ellipse(60% 100% at 50% 100%)' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 backdrop-blur text-amber-600 font-bold text-sm shadow-md mb-5"
          >
            <Sparkles className="w-4 h-4" /> Little Lights
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="font-display font-extrabold text-ink leading-tight text-4xl sm:text-5xl md:text-6xl mb-4 [text-shadow:0_2px_0_rgba(255,255,255,0.6)]"
          >
            Hi there, friend! 👋
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-ink/70 text-lg sm:text-xl font-medium max-w-xl mx-auto"
          >
            Come learn about God and the Bible with stories, lessons, and games made just for you!
          </motion.p>
        </div>
      </section>

      {/* Three big, unmissable destinations - rounded, colorful, playful hover. */}
      <div className="max-w-5xl mx-auto px-6 -mt-14 sm:-mt-16 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {AREAS.map((area, i) => (
            <motion.div
              key={area.to}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08, type: 'spring' }}
              whileHover={{ y: -8, rotate: i === 1 ? 0 : i === 0 ? -1.5 : 1.5 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                to={area.to}
                className={`block rounded-[2rem] p-7 text-center bg-gradient-to-br ${area.from} ${area.to2} shadow-xl ring-4 ${area.ring} ring-offset-4 ring-offset-[#FFF8EC]`}
              >
                <span className="w-20 h-20 rounded-full bg-white/25 flex items-center justify-center mx-auto mb-4">
                  <area.icon className="w-10 h-10 text-white" />
                </span>
                <h3 className="font-display font-extrabold text-2xl text-white mb-2">{area.label}</h3>
                <p className="text-white/90 text-sm font-medium">{area.blurb}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-14 space-y-10">
        {/* Progress peek for a signed-in child - simple, encouraging, never
            required (spec: "do not require unnecessary personal information"). */}
        {user && progress && (progress.lessons_completed > 0 || progress.activities_completed > 0) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[2rem] bg-white shadow-lg p-6 sm:p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6 text-white" />
                </span>
                <div>
                  <p className="font-display font-bold text-lg text-ink">Great job so far!</p>
                  <p className="text-ink/50 text-sm">{progress.lessons_completed} lessons · {progress.activities_completed} activities done</p>
                </div>
              </div>
              <Link to="/kids/progress" className="px-5 py-2.5 rounded-full bg-ink/5 text-ink font-bold text-sm hover:bg-ink/10 transition">
                See My Progress
              </Link>
            </div>
          </motion.div>
        )}

        {/* Songs - unchanged legacy area, tucked here so it's still
            reachable even though it wasn't part of this redesign. */}
        <Link to="/kids/songs" className="flex items-center gap-4 rounded-[2rem] bg-white shadow-lg p-6 hover:-translate-y-0.5 transition-transform">
          <span className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shrink-0">
            <Music2 className="w-6 h-6 text-white" />
          </span>
          <div>
            <p className="font-display font-bold text-ink">Kids Songs</p>
            <p className="text-ink/50 text-sm">Sing along to songs about Jesus!</p>
          </div>
        </Link>

        {!user && (
          <div className="rounded-[2rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 p-7 text-center text-white">
            <p className="font-display font-bold text-xl mb-1">Grown-ups!</p>
            <p className="text-white/90 text-sm mb-4 max-w-sm mx-auto">Sign in so your child's progress and best scores are saved every time they visit.</p>
            <Link to="/login" className="inline-block px-6 py-2.5 rounded-full bg-white text-violet-600 font-bold text-sm shadow-md">Sign In</Link>
          </div>
        )}
      </div>

      <div className="h-16" />
    </div>
  );
}
