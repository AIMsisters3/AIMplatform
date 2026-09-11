import React from 'react';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import MemoryFlipCard from '../components/MemoryFlipCard.jsx';
import { memoryCards } from '../birthdayConfig.js';

export default function Scene06MemoryCards({ onNext }) {
  return (
    <SceneShell maxWidth="max-w-3xl">
      <ParticlesField count={10} variant="sparkles" />
      <h2 className="bday-serif text-3xl sm:text-4xl bday-glow-text-soft">A few of my favorites 🎀</h2>
      <p className="text-white/55 text-sm -mt-2">tap a card to open it</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 w-full">
        {memoryCards.map((card) => (
          <MemoryFlipCard key={card.title} emoji={card.emoji} title={card.title} message={card.message} />
        ))}
      </div>

      <GlowButton onClick={onNext} className="mt-4">
        Continue →
      </GlowButton>
    </SceneShell>
  );
}
