import React from 'react';
import { motion } from 'framer-motion';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import { letter } from '../birthdayConfig.js';

export default function Scene08Letter({ onNext }) {
  return (
    <SceneShell maxWidth="max-w-2xl">
      <ParticlesField count={10} variant="hearts" />
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full rounded-2xl p-6 sm:p-10 text-left"
        style={{
          background: 'linear-gradient(160deg, #fff8fb, #ffe3ef)',
          color: '#3a2230',
          boxShadow: '0 20px 50px rgba(0,0,0,0.45), 0 0 40px rgba(255,94,196,0.25)',
        }}
      >
        <p className="bday-script text-3xl sm:text-4xl mb-4">{letter.heading}</p>
        <p className="whitespace-pre-line leading-relaxed text-[15px] sm:text-base font-medium">{letter.body}</p>
        <p className="bday-script text-2xl mt-6 text-right text-[var(--dark-pink)]">{letter.signOff}</p>
      </motion.div>

      <GlowButton onClick={onNext} className="mt-2">
        {letter.button}
      </GlowButton>
    </SceneShell>
  );
}
