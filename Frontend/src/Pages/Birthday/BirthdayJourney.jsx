import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './birthday.css';

import { MusicProvider } from './components/MusicContext.jsx';
import MusicPlayer from './components/MusicPlayer.jsx';
import ProgressDots from './components/ProgressDots.jsx';

import Scene00StartGate from './scenes/Scene00StartGate.jsx';
import Scene01Intro from './scenes/Scene01Intro.jsx';
import Scene02Reveal from './scenes/Scene02Reveal.jsx';
import Scene03OurStory from './scenes/Scene03OurStory.jsx';
import Scene04Distance from './scenes/Scene04Distance.jsx';
import Scene05MemoryLane from './scenes/Scene05MemoryLane.jsx';
import Scene06MemoryCards from './scenes/Scene06MemoryCards.jsx';
import Scene07LookBack from './scenes/Scene07LookBack.jsx';
import Scene08Letter from './scenes/Scene08Letter.jsx';
import Scene09Gift from './scenes/Scene09Gift.jsx';
import Scene10Gallery from './scenes/Scene10Gallery.jsx';

// Scene 0 is the "Start the Journey" music-consent gate; scenes 1-10
// are Pages 1-10 of the birthday story.
const SCENES = [
  Scene00StartGate,
  Scene01Intro,
  Scene02Reveal,
  Scene03OurStory,
  Scene04Distance,
  Scene05MemoryLane,
  Scene06MemoryCards,
  Scene07LookBack,
  Scene08Letter,
  Scene09Gift,
  Scene10Gallery,
];

function BirthdayJourneyInner() {
  const [step, setStep] = useState(0);
  const CurrentScene = SCENES[step];
  const goNext = () => setStep((s) => Math.min(s + 1, SCENES.length - 1));

  return (
    <div className="bday-root">
      <div className="bday-bg" />
      <AnimatePresence mode="wait">
        <CurrentScene key={step} onNext={goNext} />
      </AnimatePresence>
      <MusicPlayer />
      <ProgressDots step={step} total={SCENES.length} />
    </div>
  );
}

export default function BirthdayJourney() {
  return (
    <MusicProvider>
      <BirthdayJourneyInner />
    </MusicProvider>
  );
}
