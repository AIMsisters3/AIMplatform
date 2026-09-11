import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import Celebration from '../components/Celebration.jsx';
import GifSlot from '../components/GifSlot.jsx';
import { scene09, GIFS } from '../birthdayConfig.js';

export default function Scene09Gift({ onNext }) {
  const [opened, setOpened] = useState(false);

  return (
    <SceneShell>
      <ParticlesField count={opened ? 30 : 14} variant="mixed" />
      <Celebration active={opened} />

      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.div
            key="teaser"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-6"
          >
            <p className="bday-serif text-2xl sm:text-3xl">{scene09.teaser}</p>
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <GlowButton onClick={() => setOpened(true)}>{scene09.button}</GlowButton>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="flex flex-col items-center gap-6"
          >
            <GifSlot src={GIFS.celebration} variant="celebration" size={110} />
            <h1 className="bday-serif bday-glow-text text-4xl sm:text-5xl">{scene09.reveal}</h1>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
              <GlowButton onClick={onNext}>{scene09.button2}</GlowButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SceneShell>
  );
}
