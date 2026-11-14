import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

/**
 * A search icon that expands into a real input on click, collapsing back
 * once empty and blurred - same corner-search pattern Content.jsx's hero
 * introduced, pulled out here so Bible Studies' own hero (and anywhere
 * else that wants it) doesn't duplicate the same state/animation logic a
 * second time.
 */
export default function ExpandingSearchButton({ value, onChange, placeholder = 'Search...', className = '' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.form
            key="expanded"
            onSubmit={(e) => e.preventDefault()}
            initial={{ width: 44, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            exit={{ width: 44, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden max-w-full"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => { if (!value) setOpen(false); }}
              placeholder={placeholder}
              className="w-full pl-11 pr-11 py-3 rounded-full border-0 bg-white shadow-glass focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
            />
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              aria-label="Close search"
              className="absolute right-1.5 top-1.5 bottom-1.5 w-8 rounded-full bg-surface flex items-center justify-center text-ink/50"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.form>
        ) : (
          <motion.button
            key="icon"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            aria-label="Open search"
            className="w-11 h-11 rounded-full bg-white shadow-glass flex items-center justify-center text-secondary shrink-0"
          >
            <Search className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
