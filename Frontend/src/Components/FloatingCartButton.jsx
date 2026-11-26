import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

/**
 * A floating cart indicator, fixed to the viewport so it follows the
 * customer as they keep scrolling/shopping — bug report: "why is the
 * cart not showing below, to scrol with the user as they are adding on
 * their carts." Mirrors FloatingWhatsAppButton.jsx's pattern: dropped
 * onto the Shop/product pages where items actually get added, not
 * rendered globally. Renders nothing while the cart is empty.
 */
export default function FloatingCartButton() {
  const { count, subtotal } = useCart();
  if (count === 0) return null;

  return (
    <Link
      to="/cart"
      aria-label={`View cart — ${count} item${count === 1 ? '' : 's'}`}
      className="fixed z-40 bottom-5 left-5 sm:bottom-6 sm:left-6 flex items-center gap-2.5 pl-3.5 pr-4 py-3 rounded-full bg-brand-gradient text-white shadow-glass hover:opacity-90 transition"
    >
      <span className="relative shrink-0">
        <ShoppingCart className="w-5 h-5" />
        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-secondary text-[10px] font-bold flex items-center justify-center">
          {count}
        </span>
      </span>
      <span className="text-sm font-semibold whitespace-nowrap">N$ {subtotal.toFixed(2)}</span>
    </Link>
  );
}
