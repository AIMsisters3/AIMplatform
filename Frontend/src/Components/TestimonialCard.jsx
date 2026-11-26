import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

/**
 * One testimonial quote card - the same markup Home.jsx's teaser section
 * always used, now shared with Pages/Testimonials.jsx's full listing so
 * both read as the same thing, not two differently-styled testimony
 * sections.
 */
export default function TestimonialCard({ testimonial, variants = fadeUp }) {
  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -6 }}
      className="relative glass-card p-6 overflow-hidden"
    >
      <Quote className="absolute -top-2 -right-2 w-16 h-16 text-secondary/10" />
      <p className="relative text-ink/70 text-sm italic mb-4">"{testimonial.body}"</p>
      <p className="relative font-semibold text-sm text-ink">— {testimonial.user_name}</p>
    </motion.div>
  );
}
