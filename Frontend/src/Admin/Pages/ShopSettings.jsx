import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import api from '../../api/axios.js';

const FIELDS = [
  { key: 'shop.business_name', label: 'Business Name', type: 'text' },
  { key: 'shop.business_email', label: 'Business Email', type: 'text' },
  { key: 'shop.business_phone', label: 'Business Phone', type: 'text' },
  { key: 'shop.business_address', label: 'Business Address', type: 'textarea' },
  { key: 'shop.payment_instructions_bank', label: 'Bank Transfer Instructions', type: 'textarea',
    hint: 'Shown to customers after checkout and on invoices. Include account name, bank, account number, branch code.' },
  { key: 'shop.payment_instructions_mobile_wallet', label: 'Mobile Wallet Instructions', type: 'textarea',
    hint: 'Include the wallet number/name to send to.' },
  { key: 'shop.refund_policy', label: 'Returns & Refunds Policy', type: 'textarea',
    hint: 'Shown to customers on the Shop. Have this reviewed by a Namibian legal advisor before publishing.' },
  { key: 'shop.low_stock_threshold', label: 'Low Stock Alert Threshold', type: 'number',
    hint: 'When a product\'s available stock (stock minus reserved) falls at or below this number, it\'s flagged as low stock on the dashboard and in Manage Products. Defaults to 5 until you set your own.' },
];

const DRAFT_REFUND_POLICY = `We want you to be happy with your order.

- Damaged, defective, or incorrect items: contact us within 3 days of receiving your order for a replacement or refund.
- Change of mind: contact us within 3 days of receiving your order; the item must be unused and in its original condition. Return delivery is the customer's responsibility unless the item was damaged/incorrect.
- Food and hygiene-sensitive items: cannot be returned once opened, for health and safety reasons, unless the item was defective or incorrect.
- On-order items: if our supplier is unable to fulfill your order, we will contact you to agree on a refund or an alternative item.
- Refunds are processed once approved and are confirmed to you separately from any invoice or payment request.

This is a draft policy — please have it reviewed by a Namibian legal advisor before relying on it.`;

export default function ShopSettings() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/settings/shop')
      .then((r) => setValues(r.data?.data?.items || {}))
      .catch(() => setValues({}))
      .finally(() => setLoading(false));
  }, []);

  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function useDraftPolicy() {
    update('shop.refund_policy', DRAFT_REFUND_POLICY);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.put('/settings/shop', values);
      setMessage('Settings saved.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-ink/50">Loading...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-display font-semibold text-lg">Shop Settings</h2>
        <p className="text-sm text-ink/50 mt-1">
          These appear on invoices/receipts, checkout, and the public refund policy — nothing here is invented, so fill in real details before launch.
        </p>
      </div>

      <form onSubmit={handleSave} className="glass-card p-6 space-y-5">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-semibold text-ink/50">{f.label}</span>
            {f.hint && <span className="block text-[11px] text-ink/40 -mt-0.5 mb-1">{f.hint}</span>}
            {f.type === 'textarea' ? (
              <textarea
                rows={f.key === 'shop.refund_policy' ? 8 : 3}
                value={values[f.key] || ''}
                onChange={(e) => update(f.key, e.target.value)}
                className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            ) : (
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                min={f.type === 'number' ? 1 : undefined}
                value={values[f.key] || ''}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.key === 'shop.low_stock_threshold' ? '5' : undefined}
                className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            )}
            {f.key === 'shop.refund_policy' && !values[f.key] && (
              <button type="button" onClick={useDraftPolicy} className="mt-2 text-xs font-semibold text-secondary flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Start from a draft policy (review before publishing)
              </button>
            )}
          </label>
        ))}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold text-sm shadow-glass disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {message && <p className="text-sm text-secondary">{message}</p>}
        </div>
      </form>
    </div>
  );
}
