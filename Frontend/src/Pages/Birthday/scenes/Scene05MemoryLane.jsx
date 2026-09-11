import React from 'react';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import Polaroid from '../components/Polaroid.jsx';
import { memoryLane } from '../birthdayConfig.js';

const TILTS = [-6, 4, -3, 7, -5, 3];

export default function Scene05MemoryLane({ onNext }) {
  return (
    <SceneShell maxWidth="max-w-3xl">
      <ParticlesField count={10} variant="hearts" />
      <h2 className="bday-serif text-3xl sm:text-4xl bday-glow-text-soft">{memoryLane.heading}</h2>
      <p className="bday-script text-xl sm:text-2xl text-[var(--soft-pink)] -mt-2">{memoryLane.sub}</p>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-6 sm:gap-8 w-full mt-2 px-2">
        {memoryLane.photos.map((photo, i) => (
          <Polaroid
            key={photo.image}
            image={photo.image}
            caption={photo.caption}
            tilt={TILTS[i % TILTS.length]}
            index={i}
            className="max-w-[220px] mx-auto"
          />
        ))}
      </div>

      <GlowButton onClick={onNext} className="mt-4">
        {memoryLane.button}
      </GlowButton>
    </SceneShell>
  );
}
