import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Wraps a horizontally-scrollable row of chips/cards and shows a small
 * fading arrow at the right edge whenever there's more content past
 * what's currently visible - the only way a narrow screen otherwise has
 * to tell a visitor "there's more here, swipe/scroll sideways" instead of
 * just stopping at whatever happens to fit. Disappears once scrolled
 * (or dragged) all the way to the end, and never shows at all when
 * everything already fits with nothing left to scroll to.
 */
export default function ScrollHintRow({ children, className = '', fadeFrom = 'from-surface' }) {
  const ref = useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    function check() {
      // A few px of slack so sub-pixel rounding doesn't leave the hint
      // flickering on/off right at the end of the scroll range.
      setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    }

    check();
    const resizeObserver = new ResizeObserver(check);
    resizeObserver.observe(el);
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
    // Re-checks whenever the row's own content changes (e.g. the category
    // list collapsing down to "All" + one chosen category) - a resize
    // alone wouldn't catch content shrinking/growing at the same width.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  return (
    <div className="relative">
      <div ref={ref} className={`flex overflow-x-auto scrollbar-none ${className}`}>
        {children}
      </div>
      {canScrollRight && (
        <>
          <div className={`pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l ${fadeFrom} to-transparent`} />
          <ChevronRight className="pointer-events-none absolute right-0.5 top-[calc(50%-4px)] -translate-y-1/2 w-4 h-4 text-ink/40 animate-pulse" />
        </>
      )}
    </div>
  );
}
