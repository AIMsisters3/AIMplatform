import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Truck, MapPin } from 'lucide-react';
import api from '../../api/axios.js';
import DeliveryLocationPicker from '../../Components/DeliveryLocationPicker.jsx';

const emptyForm = { name: '', fee: '', is_pickup: false, instructions: '', center: null, radius_km: '' };

export default function ManageDeliveryAreas() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/delivery-areas', { params: { all: 1 } })
      .then((r) => setAreas(r.data?.data?.items || []))
      .catch(() => setAreas([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.post('/delivery-areas', {
        name: form.name.trim(),
        fee: form.is_pickup ? 0 : Number(form.fee) || 0,
        is_pickup: form.is_pickup,
        instructions: form.instructions.trim() || null,
        center_latitude: !form.is_pickup ? form.center?.lat ?? null : null,
        center_longitude: !form.is_pickup ? form.center?.lng ?? null : null,
        radius_km: !form.is_pickup && form.radius_km !== '' ? Number(form.radius_km) : null,
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not create delivery area.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(area) {
    await api.put(`/delivery-areas/${area.id}`, { is_active: !area.is_active });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this delivery area/pickup location? Past orders keep their own snapshot of the fee, so this is safe.')) return;
    await api.delete(`/delivery-areas/${id}`);
    load();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-lg">Delivery Areas &amp; Pickup Locations</h2>
          <p className="text-sm text-ink/50 mt-1">Customers choose one of these at checkout — the fee shown here is exactly what they'll be charged.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Area'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Name</span>
            <input required value={form.name} onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Windhoek Central, or Church Pickup Point"
              className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_pickup" checked={form.is_pickup} onChange={(e) => update('is_pickup', e.target.checked)} className="w-4 h-4" />
            <label htmlFor="is_pickup" className="text-sm text-ink/70">This is a pickup location (no delivery fee)</label>
          </div>
          {!form.is_pickup && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-ink/50">Delivery Fee (N$)</span>
                <input required type="number" step="0.01" min="0" value={form.fee} onChange={(e) => update('fee', e.target.value)}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
              </label>

              <div>
                <span className="text-xs font-semibold text-ink/50">
                  Zone Center + Radius (optional — lets checkout auto-match a customer's pinned location to this area)
                </span>
                <div className="mt-2">
                  <DeliveryLocationPicker value={form.center} onChange={(loc) => update('center', loc)} />
                </div>
                {form.center && (
                  <label className="block mt-3 max-w-[200px]">
                    <span className="text-xs font-semibold text-ink/50">Radius (km)</span>
                    <input type="number" step="0.1" min="0.1" value={form.radius_km} onChange={(e) => update('radius_km', e.target.value)}
                      placeholder="e.g. 5"
                      className="mt-1 w-full px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
                    <span className="block text-[11px] text-ink/40 mt-1">A customer pin within this radius of the center point auto-selects this area.</span>
                  </label>
                )}
              </div>
            </>
          )}
          <label className="block">
            <span className="text-xs font-semibold text-ink/50">Instructions (optional)</span>
            <textarea rows={2} value={form.instructions} onChange={(e) => update('instructions', e.target.value)}
              placeholder="e.g. opening hours, landmark, courier used"
              className="mt-1 w-full px-4 py-2.5 rounded-2xl border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary" />
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="px-6 py-3 rounded-full bg-brand-gradient text-white font-semibold text-sm shadow-glass disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {saving ? 'Saving...' : 'Create'}
            </button>
            {message && <p className="text-sm text-red-500">{message}</p>}
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-ink/50">Loading...</p>
      ) : areas.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">No delivery areas or pickup locations yet — add one above.</div>
      ) : (
        <div className="glass-card divide-y divide-ink/5">
          {areas.map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-4">
              <span className="w-9 h-9 rounded-full bg-brand-gradient-soft flex items-center justify-center shrink-0">
                {a.is_pickup ? <MapPin className="w-4 h-4 text-secondary" /> : <Truck className="w-4 h-4 text-secondary" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{a.name}</p>
                <p className="text-xs text-ink/45">{a.is_pickup ? 'Pickup — no fee' : `N$ ${Number(a.fee).toFixed(2)} delivery fee`}</p>
              </div>
              <button
                onClick={() => toggleActive(a)}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${a.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-ink/10 text-ink/50'}`}
              >
                {a.is_active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => handleDelete(a.id)} className="text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
