import React from 'react';
import WhatsAppIcon from './icons/WhatsAppIcon.jsx';

// Same contact number Contact.jsx's own WhatsApp card links to - one
// place to change it is Contact.jsx itself; this mirrors the value
// rather than importing it, since Contact.jsx doesn't export it.
const WHATSAPP_LINK = 'https://wa.me/264812616938';

/**
 * A floating "connect with us on WhatsApp" button, fixed to the corner
 * of the viewport rather than scrolling with the page content - stays
 * visible the whole time someone's reading a Bible Study, wherever they
 * scroll to. Meant to be dropped onto one page at a time (currently
 * BibleStudyDetail.jsx only), not rendered globally in the app shell.
 */
export default function FloatingWhatsAppButton() {
  return (
    <a
      href={WHATSAPP_LINK}
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
