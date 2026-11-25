import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../../api/axios.js';

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest first' },
  { value: 'order_index', label: 'Admin-set order' },
];

export default function SettingsTab() {
  const [values, setValues] = useState({});
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/settings/bible-study').then((r) => r.data?.data?.items || {}),
      api.get('/settings/site').then((r) => r.data?.data?.items?.['site.whatsapp_number'] || ''),
    ])
      .then(([bs, wa]) => { setValues(bs); setWhatsapp(wa); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await Promise.all([
        api.put('/settings/bible-study', values),
        api.put('/settings/site', { 'site.whatsapp_number': whatsapp.trim() }),
      ]);
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
        <h3 className="font-display font-semibold text-lg">Bible Studies Settings</h3>
        <p className="text-sm text-ink/50 mt-1">The WhatsApp number here is the same site-wide setting used everywhere else (the floating button, Contact page) - there's only ever one.</p>
      </div>

      <form onSubmit={handleSave} className="glass-card p-6 space-y-5">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={values['bible_study.page_visible'] !== '0'}
            onChange={(e) => update('bible_study.page_visible', e.target.checked ? '1' : '0')}
            className="w-4 h-4 rounded accent-secondary"
          />
          <span className="text-sm font-semibold text-ink/70">Bible Studies page visible to the public</span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Featured Studies Display Limit</span>
            <input type="number" min="1" max="20" value={values['bible_study.featured_limit'] || ''} placeholder="8"
              onChange={(e) => update('bible_study.featured_limit', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Default Study Sorting</span>
            <select value={values['bible_study.default_sort'] || 'latest'} onChange={(e) => update('bible_study.default_sort', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Featured Minimum Views</span>
            <input type="number" min="0" value={values['bible_study.featured_min_views'] || ''} placeholder="10"
              onChange={(e) => update('bible_study.featured_min_views', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Featured Minimum Likes</span>
            <input type="number" min="0" value={values['bible_study.featured_min_likes'] || ''} placeholder="5"
              onChange={(e) => update('bible_study.featured_min_likes', e.target.value)}
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-ink/50">Official WhatsApp Number</span>
          <span className="block text-[11px] text-ink/40 -mt-0.5 mb-1">International format, digits only. Leave blank to hide the WhatsApp button everywhere.</span>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="264812616938"
            className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
        </label>

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
