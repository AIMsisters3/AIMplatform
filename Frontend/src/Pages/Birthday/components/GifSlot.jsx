import React from 'react';
import { motion } from 'framer-motion';
import useAssetExists from '../hooks/useAssetExists.js';

const PRESETS = {
  celebration: { emojis: ['🎉', '🎊', '🎂', '✨'], label: 'celebration gif' },
  hearts: { emojis: ['💗', '🩷', '💕', '♡'], label: 'hearts gif' },
  reactions: { emojis: ['😂', '🥹', '😭', '🙈'], label: 'reaction gif' },
  sparkles: { emojis: ['✨', '⋆', '✦', '✧'], label: 'sparkles gif' },
  balloons: { emojis: ['🎈', '🎈', '🎈'], label: 'balloons gif' },
};

/**
 * A styled slot for a GIF. Renders the real gif once you drop a file
 * at the configured path (see birthdayConfig.js -> GIFS); until then
 * it shows a tasteful animated emoji placeholder in the same spot,
 * so the layout always looks finished.
 */
export default function GifSlot({ src, variant = 'sparkles', size = 96, className = '' }) {
  const ready = useAssetExists(src);
  const preset = PRESETS[variant] || PRESETS.sparkles;

  if (ready) {
    return (
      <img
        src={src}
        alt={preset.label}
        loading="lazy"
        className={`rounded-2xl object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`relative rounded-2xl flex items-center justify-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 35% 30%, rgba(255,94,196,0.35), rgba(6,1,4,0.9))',
        border: '1px solid rgba(255,194,222,0.35)',
      }}
      aria-hidden="true"
    >
      {preset.emojis.map((e, i) => (
        <motion.span
          key={i}
          data-anim
          className="absolute"
          style={{ fontSize: size * 0.26, left: `${18 + i * 20}%` }}
          animate={{ y: [6, -10, 6], opacity: [0.6, 1, 0.6], rotate: [-6, 6, -6] }}
          transition={{ duration: 2.6 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
        >
          {e}
        </motion.span>
      ))}
    </div>
  );
}
