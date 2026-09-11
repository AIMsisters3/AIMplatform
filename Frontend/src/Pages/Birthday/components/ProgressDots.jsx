import React from 'react';

/**
 * Quiet little story-progress indicator — intentionally not a navbar.
 * Purely visual, no click-to-jump (this is a one-way story).
 */
export default function ProgressDots({ step, total }) {
  if (step <= 0) return null;
  return (
    <div
      className="fixed z-50 left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 flex gap-1.5"
      aria-hidden="true"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === step - 1 ? 16 : 6,
            height: 6,
            background: i === step - 1 ? 'var(--hot-pink, #ff2d78)' : 'rgba(255,255,255,0.25)',
            boxShadow: i === step - 1 ? '0 0 8px rgba(255,45,120,0.8)' : 'none',
          }}
        />
      ))}
    </div>
  );
}
