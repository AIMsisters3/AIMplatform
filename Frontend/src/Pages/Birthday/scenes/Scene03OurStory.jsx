import React from 'react';
import { motion } from 'framer-motion';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import StaggerLines from '../components/StaggerLines.jsx';
import { scene03 } from '../birthdayConfig.js';

export default function Scene03OurStory({ onNext }) {
  const buttonDelay = 0.2 + scene03.lines.length * 0.45 + 0.5;
  return (
    <SceneShell>
      <ParticlesField count={14} variant="hearts" />
      <StaggerLines
        lines={scene03.lines}
        lineClassName="bday-serif text-xl sm:text-2xl leading-relaxed"
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: buttonDelay, duration: 0.6 }}>
        <GlowButton onClick={onNext}>{scene03.button}</GlowButton>
      </motion.div>
    </SceneShell>
  );
}
