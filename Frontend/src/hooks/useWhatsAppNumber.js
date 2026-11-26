import { useEffect, useState } from 'react';
import api from '../api/axios.js';

/**
 * The single source of the site's official WhatsApp number (admin-set via
 * Site Settings -> site.whatsapp_number, GET /settings/site - see
 * SettingController::site()). Previously hardcoded independently in
 * FloatingWhatsAppButton.jsx AND Contact.jsx; both now call this instead,
 * so there's exactly one place the real number ever comes from.
 *
 * `number` is null until it's actually configured - callers must not
 * invent a fake link in that case (redesign spec), just render nothing.
 */
export default function useWhatsAppNumber() {
  const [digits, setDigits] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/settings/site')
      .then((r) => {
        if (!active) return;
        const raw = (r.data?.data?.items?.['site.whatsapp_number'] || '').replace(/[^0-9]/g, '');
        setDigits(raw || null);
      })
      .catch(() => { if (active) setDigits(null); });
    return () => { active = false; };
  }, []);

  if (!digits) {
    return { number: null, link: null, display: null };
  }
  return {
    number: digits,
    link: `https://wa.me/${digits}`,
    display: `+${digits}`,
  };
}
