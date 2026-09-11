import React from 'react';
import { motion } from 'framer-motion';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import { scene01 } from '../birthdayConfig.js';

export default function Scene01Intro({ onNext }) {
  return (
    <SceneShell>
      <ParticlesField count={20} variant="mixed" />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="bday-serif text-3xl sm:text-4xl"
      >
        {scene01.line1}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="bday-script text-2xl sm:text-3xl text-[var(--soft-pink)] bday-glow-text-soft"
      >
        {scene01.line2}
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8, duration: 0.6 }}>
        <GlowButton onClick={onNext}>{scene01.button}</GlowButton>
      </motion.div>
    </SceneShell>
  );
}
