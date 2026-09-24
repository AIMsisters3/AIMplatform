import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../Components/StatCard.jsx';
import api from '../../api/axios.js';

function money(n) {
  const v = Number(n ?? 0);
  return 'N$ ' + v.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pctChange(curr, prev) {
  if (!prev) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

const PRODUCT_METRICS = [
  { key: 'best_selling', label: 'Best-Selling', unitLabel: (i) => `${i.units_sold} sold` },
  { key: 'fastest_selling', label: 'Fastest-Selling (30d)', unitLabel: (i) => `${i.units_sold_30d} sold` },
  { key: 'most_viewed', label: 'Most Viewed', unitLabel: (i) => `${i.views} views` },
  { key: 'lowest_stock', label: 'Lowest Stock', unitLabel: (i) => `${i.available} available` },
];

const TREND_PERIODS = [
  { key: 'daily', label: 'Daily (30d)' },
  { key: 'weekly', label: 'Weekly (12wk)' },
  { key: 'monthly', label: 'Monthly (12mo)' },
  { key: 'yearly', label: 'Yearly (5yr)' },
];

export default function BusinessDashboard() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(false);

  const [trendPeriod, setTrendPeriod] = useState('monthly');
  const [trends, setTrends] = useState(null);

  const [productMetric, setProductMetric] = useState('best_selling');
  const [productItems, setProductItems] = useState(null);

  useEffect(() => {
    setSummary(null);
    setSummaryError(false);
    api.get('/business-analytics/summary', { params: { month } })
      .then((r) => setSummary(r.data.data))
      .catch(() => setSummaryError(true));
  }, [month]);

  useEffect(() => {
    setTrends(null);
    api.get('/business-analytics/trends', { params: { period: trendPeriod } })
      .then((r) => setTrends(r.data.data.points))
      .catch(() => setTrends([]));
  }, [trendPeriod]);

  useEffect(() => {
    setProductItems(null);
    api.get('/business-analytics/products', { params: { metric: productMetric, limit: 8 } })
      .then((r) => setProductItems(r.data.data.items))
      .catch(() => setProductItems([]));
  }, [productMetric]);

  const current = summary?.current;
  const previous = summary?.previous;
  const revenueChange = current && previous ? pctChange(current.revenue, previous.revenue) : null;
  const profitChange = current && previous ? pctChange(current.profit, previous.profit) : null;

  const maxRevenue = useMemo(() => {
    if (!trends || trends.length === 0) return 0;
    return Math.max(...trends.map((p) => p.revenue), 0.01);
  }, [trends]);

  const activeMetric = PRODUCT_METRICS.find((m) => m.key === productMetric);
  const isCurrentMonth = month === new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold">Business Dashboard</h1>
          <p className="text-sm text-ink/50">Real revenue, profit, and tithe from verified payments — not estimates.</p>
        </div>
        <div className="flex items-center gap-2 glass-card px-3 py-2">
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="w-8 h-8 rounded-xl2 bg-white/70 hover:bg-white transition flex items-center justify-center"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="text-sm font-semibold min-w-[9rem] text-center">{monthLabel(month)}</span>
          <button
            type="button"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={isCurrentMonth}
            className="w-8 h-8 rounded-xl2 bg-white/70 hover:bg-white transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {summaryError && (
        <p className="text-xs text-red-500">Couldn't load business analytics — try refreshing the page.</p>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={`Revenue — ${monthLabel(month)}`}
          value={current ? money(current.revenue) : '—'}
          icon="💰"
          trend={revenueChange !== null ? `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(0)}% vs prior mo.` : undefined}
        />
        <StatCard
          label="Profit (known-cost items)"
          value={current ? money(current.profit) : '—'}
          icon={current && current.profit < 0 ? '📉' : '📈'}
          trend={profitChange !== null ? `${profitChange >= 0 ? '+' : ''}${profitChange.toFixed(0)}% vs prior mo.` : undefined}
        />
        <StatCard label="Tithe (10% of profit)" value={current ? money(current.tithe) : '—'} icon="🙏" />
        <StatCard label="Fully-Paid Orders" value={current ? current.paid_orders_counted : '—'} icon="📦" />
      </div>

      {current && current.cost_coverage_note && (
        <div className={`glass-card p-4 text-xs ${current.cost_coverage_percent !== null && current.cost_coverage_percent < 100 ? 'text-amber-700' : 'text-ink/50'}`}>
          ℹ️ {current.cost_coverage_note}
          {current.cost_coverage_percent !== null && current.cost_coverage_percent < 100 && (
            <> <Link to="/admin/products" className="underline font-medium">Set cost prices →</Link></>
          )}
        </div>
      )}

      {/* Sales trend */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm font-semibold">Sales Trend (verified payments)</p>
          <div className="flex gap-1 flex-wrap">
            {TREND_PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setTrendPeriod(p.key)}
                className={`px-3 py-1.5 rounded-xl2 text-xs font-medium transition ${
                  trendPeriod === p.key ? 'bg-brand-gradient text-white' : 'bg-white/60 hover:bg-white text-ink/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {!trends ? (
          <p className="text-sm text-ink/40 py-8 text-center">Loading…</p>
        ) : trends.every((p) => p.revenue === 0) ? (
          <p className="text-sm text-ink/60 py-8 text-center">No verified payments in this window yet.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-48 overflow-x-auto pb-1">
            {trends.map((p) => (
              <div key={p.label} className="flex flex-col items-center gap-1 flex-1 min-w-[28px] group relative">
                <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition bg-ink text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
                  {money(p.revenue)} · {p.units_sold} sold
                </div>
                <div
                  className="w-full rounded-t-md bg-brand-gradient min-h-[3px]"
                  style={{ height: `${Math.max(3, (p.revenue / maxRevenue) * 160)}px` }}
                />
                <span className="text-[9px] text-ink/40 whitespace-nowrap rotate-0">{p.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product performance */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm font-semibold">Product Performance</p>
          <div className="flex gap-1 flex-wrap">
            {PRODUCT_METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setProductMetric(m.key)}
                className={`px-3 py-1.5 rounded-xl2 text-xs font-medium transition ${
                  productMetric === m.key ? 'bg-brand-gradient text-white' : 'bg-white/60 hover:bg-white text-ink/70'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {!productItems ? (
          <p className="text-sm text-ink/40 py-6 text-center">Loading…</p>
        ) : productItems.length === 0 ? (
          <p className="text-sm text-ink/60 py-6 text-center">No data yet for this metric.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {productItems.map((item, i) => (
              <li key={item.id} className="flex items-center justify-between px-3 py-2 rounded-xl2 bg-white/50">
                <span className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-gradient-soft flex items-center justify-center text-xs font-bold text-ink/60">
                    {i + 1}
                  </span>
                  <Link to={`/shop/${item.slug}`} target="_blank" className="font-medium hover:text-secondary">
                    {item.name}
                  </Link>
                </span>
                <span className={`text-xs font-semibold ${productMetric === 'lowest_stock' && item.available <= 5 ? 'text-red-500' : 'text-ink/60'}`}>
                  {activeMetric.unitLabel(item)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
