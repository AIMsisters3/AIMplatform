import React, { useEffect, useState } from 'react';
import { Truck, MapPin, Loader2 } from 'lucide-react';
import api from '../api/axios.js';
import DeliveryLocationPicker from './DeliveryLocationPicker.jsx';

/**
 * The customer's delivery/pickup decision, shown once an order's status
 * is "arrived" and no choice has been made yet — per the explicit
 * product correction: this is asked for AFTER the order is ready, never
 * at checkout. Includes a manual free-text address fallback for when
 * the map doesn't work for the customer (their own words: "allow the
 * user to be able to put their location to be deliver to, incase the
 * map doesnt want to work").
 */
export default function FulfillmentChoice({ order, onDone }) {
  const [type, setType] = useState('delivery');
  const [location, setLocation] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (type !== 'delivery' || manualMode || !location) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    api.post(`/orders/${order.id}/delivery-quote`, { latitude: location.lat, longitude: location.lng })
      .then((r) => setQuote(r.data?.data || null))
      .catch(() => setQuote({ available: false, message: 'Could not calculate a delivery quote right now — our team will confirm it directly.' }))
      .finally(() => setQuoting(false));
  }, [type, manualMode, location, order.id]);

  async function handleConfirm() {
    setError('');
    if (type === 'delivery' && !manualMode && !location) {
      setError('Please pin your delivery location, or switch to entering your address manually.');
      return;
    }
    if (type === 'delivery' && manualMode && !manualAddress.trim()) {
      setError('Please enter your delivery address.');
      return;
    }
    setSubmitting(true);
    try {
      const body = { fulfillment_type: type };
      if (type === 'delivery') {
        if (manualMode) {
          body.manual_address = manualAddress.trim();
        } else {
          body.latitude = location.lat;
          body.longitude = location.lng;
        }
      }
      const { data } = await api.post(`/orders/${order.id}/fulfillment`, body);
      onDone(data.data.item);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your choice — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-secondary text-white p-5 space-y-4">
      <div>
        <p className="font-display font-semibold">Your order is ready!</p>
        <p className="text-sm text-white/90">Order {order.order_number} — how would you like to receive it?</p>
      </div>

      <div className="inline-flex rounded-xl2 bg-white/15 p-1">
        {[{ value: 'delivery', label: 'Delivery', icon: Truck }, { value: 'pickup', label: 'Pickup', icon: MapPin }].map((f) => (
          <button
            key={f.value} type="button" onClick={() => setType(f.value)}
            className={`px-4 py-1.5 rounded-xl2 text-xs font-semibold flex items-center gap-1.5 transition ${
              type === f.value ? 'bg-white text-secondary' : 'text-white/80'
            }`}
          >
            <f.icon className="w-3.5 h-3.5" /> {f.label}
          </button>
        ))}
      </div>

      {type === 'delivery' && (
        <div className="bg-white rounded-2xl p-4 text-ink">
          {!manualMode ? (
            <>
              <DeliveryLocationPicker value={location} onChange={setLocation} />
              <button type="button" onClick={() => setManualMode(true)} className="text-xs font-semibold text-secondary mt-2">
                Can't use the map? Enter your address manually instead
              </button>
            </>
          ) : (
            <>
              <label className="block text-xs font-semibold text-ink/50 mb-1">Delivery Address</label>
              <textarea
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                rows={2}
                placeholder="Street, suburb/town, and any landmark that helps find you..."
                className="w-full px-3 py-2 rounded-xl2 border border-ink/10 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
              />
              <button type="button" onClick={() => setManualMode(false)} className="text-xs font-semibold text-secondary mt-2">
                Use the map instead
              </button>
            </>
          )}

          {quoting && <p className="flex items-center gap-1.5 text-xs text-ink/50 mt-2"><Loader2 className="w-3 h-3 animate-spin" /> Calculating delivery fee...</p>}
          {quote?.available && <p className="text-sm font-semibold text-emerald-600 mt-2">Delivery fee: N$ {Number(quote.fee).toFixed(2)}</p>}
          {quote && !quote.available && <p className="text-xs text-ink/50 mt-2">{quote.message}</p>}
        </div>
      )}

      {error && <p className="text-xs text-red-100 bg-red-500/30 rounded-xl2 px-3 py-2">{error}</p>}

      <button
        type="button" onClick={handleConfirm} disabled={submitting}
        className="px-5 py-2.5 rounded-full bg-white text-secondary text-sm font-bold shadow-glass hover:opacity-90 transition disabled:opacity-60 flex items-center gap-1.5"
      >
        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {submitting ? 'Saving...' : `Confirm ${type === 'pickup' ? 'Pickup' : 'Delivery'}`}
      </button>
    </div>
  );
}
