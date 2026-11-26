import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../api/axios.js';

export default function SiteSettings() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/settings/site')
      .then((r) => setValue(r.data?.data?.items?.['site.whatsapp_number'] || ''))
      .catch(() => setValue(''))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.put('/settings/site', { 'site.whatsapp_number': value.trim() });
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
        <h2 className="font-display font-semibold text-lg">Site Settings</h2>
        <p className="text-sm text-ink/50 mt-1">
          Site-wide details used across the public site - not Shop-specific.
        </p>
      </div>

      <form onSubmit={handleSave} className="glass-card p-6 space-y-5">
        <label className="block">
          <span className="text-xs font-semibold text-ink/50">Official WhatsApp Number</span>
          <span className="block text-[11px] text-ink/40 -mt-0.5 mb-1">
            International format, digits only (e.g. 264812616938). Used for the floating WhatsApp button and the Contact page. Leave blank to hide the WhatsApp button everywhere rather than show a fake link.
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="264812616938"
            className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary"
          />
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
