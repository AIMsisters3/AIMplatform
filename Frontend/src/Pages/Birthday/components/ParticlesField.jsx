import React, { useMemo } from 'react';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion.js';

const SYMBOL_SETS = {
  mixed: ['✦', '💗', '✧', '🩷', '·'],
  hearts: ['💗', '🩷', '♡'],
  sparkles: ['✦', '✧', '⋆', '·'],
};

/**
 * Soft, slow-moving field of floating hearts/sparkles behind a scene.
 * Purely decorative — always aria-hidden, and drops to a static handful
 * of twinkles when the visitor prefers reduced motion.
 */
export default function ParticlesField({ count = 18, variant = 'mixed', className = '' }) {
  const reducedMotion = usePrefersReducedMotion();
  const symbols = SYMBOL_SETS[variant] || SYMBOL_SETS.mixed;

  const particles = useMemo(() => {
    const total = reducedMotion ? Math.min(6, count) : count;
    return Array.from({ length: total }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 10 + Math.random() * 18,
      duration: 9 + Math.random() * 10,
      delay: Math.random() * 10,
      drift: `${(Math.random() * 60 - 30).toFixed(0)}px`,
      symbol: symbols[i % symbols.length],
      opacity: 0.35 + Math.random() * 0.45,
    }));
  }, [count, reducedMotion, variant]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          data-anim
          className="bday-particle"
          style={{
            left: `${p.left}%`,
            fontSize: p.size,
            color: 'var(--soft-pink)',
            opacity: reducedMotion ? p.opacity : undefined,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--drift': p.drift,
          }}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  );
}
