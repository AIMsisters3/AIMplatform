import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAssetExists from '../hooks/useAssetExists.js';

function LightboxContent({ photo }) {
  const ready = useAssetExists(photo?.image);
  if (!photo) return null;
  return (
    <>
      <div
        className="rounded-md overflow-hidden"
        style={{
          width: 'min(80vw, 420px)',
          aspectRatio: '1 / 1',
          background: 'linear-gradient(145deg, #2a0713, #4d0a24 45%, #7a0c3e 100%)',
        }}
      >
        {ready ? (
          <img src={photo.image} alt={photo.caption} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/50">
            <span style={{ fontSize: 40 }}>📸</span>
            <span className="text-xs uppercase tracking-wide">your photo here</span>
          </div>
        )}
      </div>
      {photo.caption && <p className="bday-script text-2xl text-white mt-4 text-center px-4">{photo.caption}</p>}
    </>
  );
}

/**
 * Full-screen click-to-enlarge viewer for the final memory gallery.
 * Close via the × button, backdrop click, or Escape.
 */
export default function Lightbox({ photo, onClose }) {
  useEffect(() => {
    if (!photo) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo, onClose]);

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
          style={{ background: 'rgba(4,0,2,0.92)', backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center"
          >
            <LightboxContent photo={photo} />
          </motion.div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="fixed top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
