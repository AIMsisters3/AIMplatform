import React from 'react';
import { motion } from 'framer-motion';

export default function GlowButton({ children, onClick, variant = 'solid', className = '', ...rest }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`bday-btn ${variant === 'ghost' ? 'bday-btn-ghost' : ''} ${className}`}
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
