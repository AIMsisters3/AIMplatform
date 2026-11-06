/**
 * UI-chrome translation dictionary (navigation, buttons, labels — not
 * user-uploaded content, which already has its own separate language
 * tag via Backend/models/Language.php). Codes match that same table
 * (migration 007): 'en' English, 'ng' Oshiwambo.
 *
 * IMPORTANT: the Oshiwambo strings below are a first-pass draft, not a
 * verified translation — this session has no way to confirm Oshiwambo
 * accuracy with a native speaker. Review and correct every 'ng' value
 * before relying on it in front of real users; anything not yet
 * translated intentionally falls back to English (see useLanguage()'s
 * t()) rather than guessing.
 */
export const TRANSLATIONS = {
  en: {
    nav_home: 'Home',
    nav_explore: 'Explore',
    nav_content: 'Content',
    nav_bible_studies: 'Bible Studies',
    nav_series: 'Series',
    nav_devotions: 'Devotions',
    nav_children: 'Children',
    nav_songs: 'Songs',
    nav_news: 'News',
    nav_gallery: 'Gallery',
    nav_shop: 'Shop',
    nav_about: 'About',
    nav_about_full: 'About AIMsisters',
    nav_contact: 'Contact',
    nav_login: 'Login',
    nav_cart: 'Cart',
    nav_search: 'Search',
    nav_search_placeholder: 'Search...',
    account_my_orders: 'My Orders',
    account_my_bookmarks: 'My Bookmarks',
    account_my_notes: 'My Notes',
    account_my_wishlist: 'My Wishlist',
    account_admin_dashboard: 'Admin Dashboard',
    account_logout: 'Log Out',
  },
  ng: {
    nav_home: 'Egumbo',
    nav_shop: 'Elandelo',
    nav_about: 'Kombinga',
    nav_contact: 'Tu Kwatha Kumwe',
    nav_login: 'Ya Mo',
    nav_cart: 'Oshikutu',
    nav_search: 'Konga',
    nav_search_placeholder: 'Konga...',
    account_logout: 'Za Mo',
  },
};

export const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ng', name: 'Oshiwambo', flag: '🇳🇦' },
];
