import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion.js';

const CONFETTI_COLORS = ['#ff2d78', '#ff5ec4', '#ffc2de', '#ffffff', '#7a0c3e'];
const EMOJI = ['🎉', '💗', '✨', '🎈', '🩷', '🎊'];

/**
 * One-shot celebration burst (confetti + hearts + sparkles + balloons)
 * for the "open your gift" moment. Renders nothing until `active`.
 */
export default function Celebration({ active }) {
  const reducedMotion = usePrefersReducedMotion();

  const pieces = useMemo(() => {
    const total = reducedMotion ? 14 : 46;
    return Array.from({ length: total }, (_, i) => {
      const isEmoji = i % 3 === 0;
      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.4 + Math.random() * 1.8,
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 220,
        isEmoji,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        emoji: EMOJI[i % EMOJI.length],
        size: isEmoji ? 18 + Math.random() * 14 : 6 + Math.random() * 6,
      };
    });
  }, [active, reducedMotion]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden" aria-hidden="true">
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute top-[-5%]"
              style={{
                left: `${p.left}%`,
                width: p.isEmoji ? undefined : p.size,
                height: p.isEmoji ? undefined : p.size,
                borderRadius: p.isEmoji ? undefined : 2,
                background: p.isEmoji ? undefined : p.color,
                fontSize: p.isEmoji ? p.size : undefined,
              }}
              initial={{ y: -40, x: 0, opacity: 0, rotate: 0 }}
              animate={{
                y: '110vh',
                x: p.drift,
                opacity: [0, 1, 1, 0],
                rotate: p.rotate,
              }}
              transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
            >
              {p.isEmoji ? p.emoji : null}
            </motion.span>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
