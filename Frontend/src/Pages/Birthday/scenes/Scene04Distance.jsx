import React from 'react';
import { motion } from 'framer-motion';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import StaggerLines from '../components/StaggerLines.jsx';
import { scene04 } from '../birthdayConfig.js';

export default function Scene04Distance({ onNext }) {
  const buttonDelay = 0.2 + scene04.lines.length * 0.45 + 0.5;
  return (
    <SceneShell>
      <ParticlesField count={8} variant="sparkles" />
      <StaggerLines
        lines={scene04.lines}
        lineClassName="bday-serif text-lg sm:text-2xl leading-relaxed text-white/85"
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: buttonDelay, duration: 0.6 }}>
        <GlowButton onClick={onNext} variant="ghost">
          {scene04.button}
        </GlowButton>
      </motion.div>
    </SceneShell>
  );
}
