import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'aim_cart_v2';

// The cart only ever stores what the UI needs to render a line item
// (id/name/thumbnail/price snapshot/quantity/type/variant). It is NOT the
// source of truth for price or availability — Order::create() on the
// backend re-reads every price and stock/reservation state from the
// products/product_variants tables at checkout time, so a stale/tampered
// local value can never actually change what gets charged or reserved.
// This keeps the cart usable offline/instantly while staying safe.
function readStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function lineKey(productId, variantId) {
  return `${productId}::${variantId || 'base'}`;
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

  // `variant` is optional — { id, attributes, price_override, stock_quantity }.
  const addItem = useCallback((product, quantity = 1, variant = null) => {
    setItems((prev) => {
      const key = lineKey(product.id, variant?.id);
      const existing = prev.find((i) => lineKey(i.product_id, i.variant_id) === key);
      if (existing) {
        return prev.map((i) =>
          lineKey(i.product_id, i.variant_id) === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          variant_id: variant?.id || null,
          variant_attributes: variant?.attributes || null,
          name: product.name,
          slug: product.slug,
          thumbnail: variant?.image_url || product.thumbnail,
          price: Number(product.price),
          sale_price: product.sale_price !== null && product.sale_price !== undefined ? Number(product.sale_price) : null,
          variant_price_override: variant?.price_override !== null && variant?.price_override !== undefined ? Number(variant.price_override) : null,
          product_type: product.product_type || 'physical',
          sourcing_type: product.sourcing_type || 'in_stock',
          quantity,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId, variantId = null) => {
    setItems((prev) => prev.filter((i) => lineKey(i.product_id, i.variant_id) !== lineKey(productId, variantId)));
  }, []);

  const setQuantity = useCallback((productId, quantity, variantId = null) => {
    const key = lineKey(productId, variantId);
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => lineKey(i.product_id, i.variant_id) !== key)
        : prev.map((i) => (lineKey(i.product_id, i.variant_id) === key ? { ...i, quantity } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const { count, subtotal, hasPhysical, hasOnOrder, hasInStock } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    let hasPhysical = false;
    let hasOnOrder = false;
    let hasInStock = false;
    for (const i of items) {
      const base = i.variant_price_override ?? i.price;
      const unit = i.sale_price !== null && i.sale_price < i.price && i.variant_price_override == null ? i.sale_price : base;
      count += i.quantity;
      subtotal += unit * i.quantity;
      if (i.product_type === 'physical') hasPhysical = true;
      if (i.sourcing_type === 'on_order') hasOnOrder = true;
      else hasInStock = true;
    }
    return { count, subtotal, hasPhysical, hasOnOrder, hasInStock };
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, setQuantity, clear, count, subtotal, hasPhysical, hasOnOrder, hasInStock }}
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
