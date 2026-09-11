import React from 'react';
import { motion } from 'framer-motion';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import StaggerLines from '../components/StaggerLines.jsx';
import { scene07 } from '../birthdayConfig.js';

export default function Scene07LookBack({ onNext }) {
  const buttonDelay = 0.2 + scene07.lines.length * 0.45 + 0.5;
  return (
    <SceneShell>
      <ParticlesField count={16} variant="mixed" />
      <StaggerLines
        lines={scene07.lines}
        startDelay={0.2}
        lineClassName="bday-serif text-lg sm:text-2xl leading-relaxed"
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: buttonDelay, duration: 0.6 }}>
        <GlowButton onClick={onNext}>{scene07.button}</GlowButton>
      </motion.div>
    </SceneShell>
  );
}
