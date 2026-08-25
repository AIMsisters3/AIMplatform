import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'aim_cart';

// The cart only ever stores what the UI needs to render a line item
// (id/name/thumbnail/price snapshot/quantity/type). It is NOT the source of
// truth for price — Order::create() on the backend re-reads every price
// from the products table at checkout time, so a stale/tampered local price
// can never actually change what gets charged. This keeps the cart usable
// offline/instantly while staying safe.
function readStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // best-effort only — a full/blocked localStorage should never crash the cart
    }
  }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          slug: product.slug,
          thumbnail: product.thumbnail,
          price: Number(product.price),
          sale_price: product.sale_price !== null && product.sale_price !== undefined ? Number(product.sale_price) : null,
          product_type: product.product_type || 'physical',
          stock_quantity: product.stock_quantity,
          quantity,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  }, []);

  const setQuantity = useCallback((productId, quantity) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.product_id !== productId)
        : prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const { count, subtotal, hasPhysical } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    let hasPhysical = false;
    for (const i of items) {
      const unit = i.sale_price !== null && i.sale_price < i.price ? i.sale_price : i.price;
      count += i.quantity;
      subtotal += unit * i.quantity;
      if (i.product_type === 'physical') hasPhysical = true;
    }
    return { count, subtotal, hasPhysical };
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, setQuantity, clear, count, subtotal, hasPhysical }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
