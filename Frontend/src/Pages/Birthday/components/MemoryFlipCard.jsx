import React, { useState } from 'react';

/**
 * A tap-to-flip memory card. Front shows the emoji + title, back
 * reveals the message. Content comes from birthdayConfig.js -> memoryCards.
 */
export default function MemoryFlipCard({ emoji, title, message }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="bday-flip-scene w-full aspect-[4/5] cursor-pointer"
      onClick={() => setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
    >
      <div className={`bday-flip-card ${flipped ? 'is-flipped' : ''}`}>
        <div
          className="bday-flip-face"
          style={{
            background: 'linear-gradient(160deg, rgba(255,45,120,0.18), rgba(6,1,4,0.9))',
            border: '1px solid rgba(255,194,222,0.35)',
            boxShadow: '0 0 24px rgba(255,45,120,0.2)',
          }}
        >
          <span style={{ fontSize: 42 }}>{emoji}</span>
          <p className="bday-serif mt-3 text-lg sm:text-xl text-[var(--soft-pink)]">{title}</p>
          <span className="mt-4 text-[11px] uppercase tracking-widest text-white/40">tap to open</span>
        </div>
        <div
          className="bday-flip-face bday-flip-face--back"
          style={{
            background: 'linear-gradient(160deg, #ffe3ef, #ffc2de)',
            color: '#3a2230',
          }}
        >
          <p className="bday-script text-xl sm:text-2xl leading-snug">{message}</p>
        </div>
      </div>
    </div>
  );
}
