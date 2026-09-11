import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic } from './MusicContext.jsx';

/**
 * Small floating music control, visible on every scene once the
 * journey has started. Fits the black/pink theme instead of looking
 * like a generic browser audio bar.
 */
export default function MusicPlayer() {
  const { available, playing, started, toggle } = useMusic();

  if (!started) return null;

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={!available}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.9 }}
      whileHover={available ? { scale: 1.08 } : undefined}
      className="fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, rgba(255,45,120,0.9), rgba(122,12,62,0.9))',
        border: '1px solid rgba(255,194,222,0.6)',
        boxShadow: playing
          ? '0 0 18px rgba(255,94,196,0.85), 0 0 42px rgba(255,45,120,0.45)'
          : '0 0 10px rgba(255,45,120,0.3)',
        opacity: available ? 1 : 0.55,
        cursor: available ? 'pointer' : 'not-allowed',
      }}
      aria-label={available ? (playing ? 'Pause music' : 'Play music') : 'Add a song to enable music'}
      title={available ? (playing ? 'Pause music' : 'Play music') : 'Add birthday-song.mp3 to /public/music to enable'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {playing ? (
          <motion.span
            key="bars"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-end gap-[3px] h-4"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                data-anim
                className="w-[3px] rounded-full bg-white"
                animate={{ height: [6, 16, 6] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </motion.span>
        ) : (
          <motion.span key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-lg text-white">
            🎵
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
