import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

const STORAGE_KEY = 'aimsisters.floatingCartPos';
const DRAG_THRESHOLD_PX = 6;
const MARGIN = 12;

/**
 * A floating cart indicator, fixed to the viewport so it follows the
 * customer as they keep scrolling/shopping — bug report: "why is the
 * cart not showing below, to scrol with the user as they are adding on
 * their carts." It's draggable (bug report: "it must also be movable..
 * on smaller screen") so it never permanently blocks something on a
 * small phone, and still behaves as a real link to /cart on a plain tap
 * — a drag beyond a small threshold cancels the navigation, anything
 * shorter still opens the cart. Mirrors FloatingWhatsAppButton.jsx's
 * per-page pattern: dropped onto the Shop/product pages where items
 * actually get added, not rendered globally. Renders nothing while the
 * cart is empty.
 *
 * Position is a per-viewer convenience (where they personally like the
 * button), so it's kept in localStorage only — never synced, never read
 * back by the app itself.
 */
export default function FloatingCartButton() {
  const { count, subtotal } = useCart();
  const navigate = useNavigate();
  const btnRef = useRef(null);
  const dragState = useRef(null); // {startX, startY, baseRight, baseBottom, moved}
  const [pos, setPos] = useState(null); // {right, bottom} in px, null = default CSS position

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved.right === 'number' && typeof saved.bottom === 'number') {
        setPos(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  function clamp(pos) {
    const el = btnRef.current;
    const w = el?.offsetWidth || 160;
    const h = el?.offsetHeight || 56;
    return {
      right: Math.min(Math.max(pos.right, MARGIN), window.innerWidth - w - MARGIN),
      bottom: Math.min(Math.max(pos.bottom, MARGIN), window.innerHeight - h - MARGIN),
    };
  }

  function handlePointerDown(e) {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const baseRight = window.innerWidth - rect.right;
    const baseBottom = window.innerHeight - rect.bottom;
    dragState.current = { startX: e.clientX, startY: e.clientY, baseRight, baseBottom, moved: false };
    el.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
      d.moved = true;
    }
    if (d.moved) {
      setPos(clamp({ right: d.baseRight - dx, bottom: d.baseBottom - dy }));
    }
  }

  function handlePointerUp(e) {
    const d = dragState.current;
    dragState.current = null;
    if (!d) return;
    try { btnRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (d.moved) {
      setPos((current) => {
        if (current) localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        return current;
      });
    } else {
      navigate('/cart');
    }
  }

  if (count === 0) return null;

  const style = pos
    ? { right: `${pos.right}px`, bottom: `${pos.bottom}px`, left: 'auto' }
    : undefined;

  return (
    <button
      ref={btnRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={style}
      aria-label={`View cart — ${count} item${count === 1 ? '' : 's'}`}
      title="Drag to move, tap to view your cart"
      className={`fixed z-40 flex items-center gap-2.5 pl-3.5 pr-4 py-3 rounded-full bg-brand-gradient text-white shadow-glass hover:scale-105 active:scale-95 transition touch-none select-none ${
        pos ? '' : 'bottom-20 left-5 sm:bottom-6 sm:left-6'
      }`}
    >
      <span className="absolute inset-0 rounded-full bg-white/30 animate-pulse pointer-events-none" aria-hidden="true" />
      <span className="relative shrink-0">
        <ShoppingCart className="w-5 h-5" />
        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-secondary text-[10px] font-bold flex items-center justify-center">
          {count}
        </span>
      </span>
      <span className="relative text-sm font-semibold whitespace-nowrap">N$ {subtotal.toFixed(2)}</span>
    </button>
  );
}
