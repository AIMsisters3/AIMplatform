import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import useAssetExists from '../hooks/useAssetExists.js';
import { MUSIC_SRC } from '../birthdayConfig.js';

const MusicContext = createContext(null);

/**
 * Owns a single <audio> element for the whole journey so the song
 * keeps playing seamlessly as scenes change — it's never remounted.
 * Autoplay-safe: playback only ever starts from a real user gesture
 * (the "Start the Journey" button, or the floating play/pause control).
 */
export function MusicProvider({ children }) {
  const audioRef = useRef(null);
  const available = useAssetExists(MUSIC_SRC);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  const start = () => {
    setStarted(true);
    if (available && audioRef.current) {
      audioRef.current.volume = 0.65;
      audioRef.current.play().catch(() => {
        // Autoplay was blocked for some reason — she can still tap
        // the floating music control to start it manually.
      });
    }
  };

  const toggle = () => {
    if (!available || !audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  };

  return (
    <MusicContext.Provider value={{ available, playing, started, start, toggle }}>
      {available && (
        <audio ref={audioRef} loop preload="auto">
          <source src={MUSIC_SRC} type="audio/mpeg" />
        </audio>
      )}
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within a MusicProvider');
  return ctx;
}
