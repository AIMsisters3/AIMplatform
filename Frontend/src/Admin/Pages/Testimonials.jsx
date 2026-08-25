import React, { useEffect, useState } from 'react';
import { Check, X, Trash2 } from 'lucide-react';
import api from '../../api/axios.js';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function Testimonials() {
  const [tab, setTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    load();
  }, [tab]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/testimonials/admin', { params: { status: tab } });
      setItems(r.data?.data?.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    setBusyId(id);
    try {
      await api.post(`/testimonials/${id}/approve`);
      setItems((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not approve.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    try {
      await api.post(`/testimonials/${id}/reject`);
      setItems((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not reject.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Permanently delete this testimony?')) return;
    setBusyId(id);
    try {
      await api.delete(`/testimonials/${id}`);
      setItems((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-display font-bold text-ink mb-1">Testimonials</h1>
      <p className="text-ink/50 text-sm mb-6">Review and moderate testimonies submitted by visitors.</p>

      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
              tab === t.key
                ? 'bg-brand-gradient text-white shadow-glass'
                : 'bg-white/70 text-ink/60 border border-ink/10 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-ink/40 text-sm">Loading...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/40 text-sm">
          No {tab} testimonials.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((t) => (
            <div key={t.id} className="glass-card p-5 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-ink/80 text-sm mb-2">"{t.body}"</p>
                <div className="flex items-center gap-3 text-xs text-ink/45">
                  <span className="font-semibold text-ink/60">{t.user_name}</span>
                  <span>{t.user_email}</span>
                  <span>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {tab === 'pending' && (
                  <>
                    <button
                      disabled={busyId === t.id}
                      onClick={() => handleApprove(t.id)}
                      className="w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center hover:opacity-90 transition disabled:opacity-50"
                      title="Approve"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      disabled={busyId === t.id}
                      onClick={() => handleReject(t.id)}
                      className="w-9 h-9 rounded-full bg-ink/20 text-ink flex items-center justify-center hover:bg-ink/30 transition disabled:opacity-50"
                      title="Reject"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  disabled={busyId === t.id}
                  onClick={() => handleDelete(t.id)}
                  className="w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition disabled:opacity-50"
                  title="Delete permanently"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}