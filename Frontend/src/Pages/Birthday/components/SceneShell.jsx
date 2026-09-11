import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
  exit: { opacity: 0, y: -24, transition: { duration: 0.45, ease: 'easeIn' } },
};

/**
 * Consistent full-screen wrapper every scene renders inside.
 * Keeps padding/centering/transitions identical while each scene's
 * own content and background flair stay completely different.
 */
export default function SceneShell({ children, className = '', maxWidth = 'max-w-xl' }) {
  return (
    <motion.section
      className={`relative z-10 min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center text-center px-6 py-16 ${className}`}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={`w-full ${maxWidth} flex flex-col items-center gap-6`}>{children}</div>
    </motion.section>
  );
}
