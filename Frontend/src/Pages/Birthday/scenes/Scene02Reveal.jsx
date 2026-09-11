import React from 'react';
import { motion } from 'framer-motion';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import GifSlot from '../components/GifSlot.jsx';
import { scene02, GIFS } from '../birthdayConfig.js';

export default function Scene02Reveal({ onNext }) {
  return (
    <SceneShell>
      <ParticlesField count={26} variant="mixed" />
      <GifSlot src={GIFS.balloons} variant="balloons" size={84} />
      <motion.h1
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="bday-serif bday-glow-text text-4xl sm:text-6xl leading-tight"
        style={{ color: '#fff' }}
      >
        {scene02.big}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.7 }}
        className="bday-script text-2xl sm:text-3xl text-[var(--soft-pink)]"
      >
        {scene02.sub}
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
        <GlowButton onClick={onNext}>{scene02.button}</GlowButton>
      </motion.div>
    </SceneShell>
  );
}
