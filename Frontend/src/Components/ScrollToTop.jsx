import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Plain <BrowserRouter> (see main.jsx) does not reset scroll position on
 * navigation the way the newer data-router APIs' <ScrollRestoration>
 * does — a <Link> push leaves the viewport wherever it already was,
 * which is why opening a new page could land mid-page or at the
 * bottom. One centralized listener here, rather than a scroll-to-top
 * call scattered into every page component.
 *
 * Deliberately keyed on pathname only, not the full location (search/
 * hash) — Content.jsx's item-viewer modal, filter changes, and similar
 * same-route interactions all update the URL's query string without
 * changing pathname, and must NOT reset scroll for those (spec: don't
 * reset when editing a form, expanding a section, or otherwise staying
 * on the same page). A real route change to a new page is the only
 * thing this reacts to.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
