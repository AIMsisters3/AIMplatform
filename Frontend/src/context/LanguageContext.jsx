import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TRANSLATIONS } from '../i18n/translations.js';

const STORAGE_KEY = 'aim_ui_lang';
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'ng' ? 'ng' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = useCallback((code) => {
    setLanguageState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Private browsing / storage blocked — the selection still applies
      // for this page load via state, it just won't persist.
    }
  }, []);

  // A future logged-in-only preference (e.g. saved to the user's
  // account) could hydrate this on login — not needed yet since this
  // is the first UI-chrome language switch the app has ever had.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key) => TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage() must be used within a LanguageProvider');
  return ctx;
}
