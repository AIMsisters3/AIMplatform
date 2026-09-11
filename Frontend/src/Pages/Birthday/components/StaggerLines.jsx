import React from 'react';
import { motion } from 'framer-motion';

/**
 * Renders an array of lines, each fading/sliding in one after another.
 * Used for the emotional "one line at a time" beats of the story.
 */
export default function StaggerLines({ lines, className = '', lineClassName = '', startDelay = 0.2 }) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: startDelay + i * 0.45, ease: 'easeOut' }}
          className={lineClassName}
        >
          {line}
        </motion.p>
      ))}
    </div>
  );
}
