import React from 'react';

export default function ProductCard({ product }) {
  const price = product.sale_price ?? product.price;
  const onSale = product.sale_price && product.sale_price < product.price;

  return (
    <article className="glass-card overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform">
      <div className="h-48 bg-brand-gradient-soft flex items-center justify-center overflow-hidden">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl brand-gradient-text font-display font-bold">📖</span>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-display font-semibold leading-snug mb-2 group-hover:text-secondary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink">${Number(price).toFixed(2)}</span>
          {onSale && (
            <span className="text-sm text-ink/40 line-through">${Number(product.price).toFixed(2)}</span>
          )}
        </div>
        <button className="mt-4 w-full py-2 rounded-full bg-brand-gradient text-white text-sm font-semibold hover:opacity-90 transition">
          Add to Cart
        </button>
      </div>
    </article>
  );
}
