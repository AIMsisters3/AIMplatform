import React from 'react';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import { startGate } from '../birthdayConfig.js';
import { useMusic } from '../components/MusicContext.jsx';

export default function Scene00StartGate({ onNext }) {
  const { start } = useMusic();

  const handleStart = () => {
    start();
    onNext();
  };

  return (
    <SceneShell>
      <ParticlesField count={14} variant="sparkles" />
      <span className="bday-serif text-4xl sm:text-5xl bday-glow-text" style={{ color: '#fff' }}>
        {startGate.heading}
      </span>
      <GlowButton onClick={handleStart}>{startGate.button}</GlowButton>
      <span className="text-sm text-white/40">{startGate.hint}</span>
    </SceneShell>
  );
}
