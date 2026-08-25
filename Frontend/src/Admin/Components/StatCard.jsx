import React from 'react';

export default function StatCard({ label, value, icon, trend }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="w-10 h-10 rounded-xl2 bg-brand-gradient-soft flex items-center justify-center text-lg">
          {icon}
        </span>
        {trend && <span className="text-xs font-semibold text-emerald-500">{trend}</span>}
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
      <p className="text-xs text-ink/50 mt-1">{label}</p>
    </div>
  );
}
