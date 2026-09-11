import React from 'react';
import { motion } from 'framer-motion';
import useAssetExists from '../hooks/useAssetExists.js';

const PLACEHOLDER_ICONS = ['💗', '🩷', '✨', '🎀', '📸', '🥹'];

/**
 * A polaroid-style photo card.
 * If `image` doesn't exist yet in /public, a beautiful styled
 * placeholder is shown instead — never a broken image icon.
 */
export default function Polaroid({ image, caption, tilt = -3, index = 0, onClick, className = '' }) {
  const ready = useAssetExists(image);
  const icon = PLACEHOLDER_ICONS[index % PLACEHOLDER_ICONS.length];

  return (
    <motion.figure
      className={`bday-polaroid w-full cursor-pointer select-none ${className}`}
      style={{ '--tilt': `${tilt}deg` }}
      initial={{ opacity: 0, y: 24, rotate: tilt }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.08, 0.5), ease: 'easeOut' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick();
      }}
    >
      <div className="bday-polaroid-photo">
        {ready ? (
          <img src={image} alt={caption} loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-center px-2">
            <span style={{ fontSize: 26 }}>{icon}</span>
            <span className="text-[10px] uppercase tracking-wide text-white/40">your photo here</span>
          </div>
        )}
      </div>
      {caption && <figcaption className="bday-polaroid-caption">{caption}</figcaption>}
    </motion.figure>
  );
}
