import React from 'react';
import WhatsAppIcon from './icons/WhatsAppIcon.jsx';
import useWhatsAppNumber from '../hooks/useWhatsAppNumber.js';

/**
 * A floating "connect with us on WhatsApp" button, fixed to the corner
 * of the viewport rather than scrolling with the page content - stays
 * visible the whole time someone's reading, wherever they scroll to.
 * Meant to be dropped onto one page at a time (BibleStudyDetail.jsx,
 * BibleStudies.jsx), not rendered globally in the app shell.
 *
 * The number comes from Site Settings (useWhatsAppNumber), not a
 * hardcoded constant, so there is exactly one place an admin sets the
 * real number - this renders nothing at all until it's configured,
 * rather than showing a fake/dead link.
 */
export default function FloatingWhatsAppButton() {
  const { link } = useWhatsAppNumber();
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Connect with us on WhatsApp"
      title="Connect with us on WhatsApp"
      className="fixed z-40 bottom-5 right-5 sm:bottom-6 sm:right-6 flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-[#25D366] text-white font-semibold shadow-glass hover:opacity-90 transition"
    >
      <WhatsAppIcon className="w-5 h-5 shrink-0" />
      <span className="text-sm whitespace-nowrap">Connect with us</span>
    </a>
  );
}
