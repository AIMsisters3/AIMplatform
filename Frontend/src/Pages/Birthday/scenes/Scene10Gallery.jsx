import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SceneShell from '../components/SceneShell.jsx';
import GlowButton from '../components/GlowButton.jsx';
import ParticlesField from '../components/ParticlesField.jsx';
import StaggerLines from '../components/StaggerLines.jsx';
import Polaroid from '../components/Polaroid.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { finalGallery } from '../birthdayConfig.js';

const TILTS = [-7, 5, -3, 8, -5, 4, -6, 3];

export default function Scene10Gallery() {
  const [opened, setOpened] = useState(false);
  const [active, setActive] = useState(null);
  const introDelay = 0.2 + finalGallery.intro.length * 0.45 + 0.5;

  return (
    <SceneShell maxWidth="max-w-4xl">
      <ParticlesField count={16} variant="mixed" />

      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.div key="intro" exit={{ opacity: 0 }} className="flex flex-col items-center gap-6">
            <StaggerLines
              lines={finalGallery.intro}
              lineClassName="bday-serif text-xl sm:text-2xl leading-relaxed"
            />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: introDelay, duration: 0.6 }}>
              <GlowButton onClick={() => setOpened(true)}>Open the memory box 🎁</GlowButton>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="gallery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-8 w-full"
          >
            <h2 className="bday-serif text-3xl sm:text-4xl bday-glow-text-soft">{finalGallery.heading}</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 w-full">
              {finalGallery.photos.map((photo, i) => (
                <Polaroid
                  key={photo.image + i}
                  image={photo.image}
                  caption={photo.caption}
                  tilt={TILTS[i % TILTS.length]}
                  index={i}
                  className="max-w-[210px] mx-auto"
                  onClick={() => setActive(photo)}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="bday-script text-2xl sm:text-3xl text-[var(--soft-pink)] max-w-md">
                {finalGallery.footer1}
              </p>
              <p className="bday-serif bday-glow-text text-2xl sm:text-3xl mt-2">{finalGallery.footer2}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Lightbox photo={active} onClose={() => setActive(null)} />
    </SceneShell>
  );
}
