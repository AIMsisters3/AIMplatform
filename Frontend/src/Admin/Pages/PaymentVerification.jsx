import React, { useCallback, useEffect, useState } from 'react';
import { Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api from '../../api/axios.js';

export default function PaymentVerification() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/payments/queue', { params: { limit: 50 } })
      .then((r) => setItems(r.data?.data?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function viewProof(paymentId) {
    try {
      const res = await api.get(`/payments/${paymentId}/proof`, { responseType: 'blob' });
      window.open(URL.createObjectURL(res.data), '_blank');
    } catch {
      setMessage('No proof file was attached to this submission.');
    }
  }

  async function verify(id) {
    if (!confirm('Confirm you have checked the actual funds/reference and this payment is genuine?')) return;
    try {
      await api.post(`/payments/${id}/verify`);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not verify payment.');
    }
  }

  async function reject(id) {
    const reason = prompt('Reason for rejecting this payment:');
    if (!reason) return;
    try {
      await api.post(`/payments/${id}/reject`, { reason });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not reject payment.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-lg">Payment Verification Queue</h2>
        <p className="text-sm text-ink/50 mt-1">
          Verify the actual funds/reference before confirming — a submission here is a customer's claim, not proof by itself.
        </p>
      </div>

      {message && <p className="text-sm text-red-500">{message}</p>}

      {loading ? (
        <p className="text-ink/50">Loading...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50 flex flex-col items-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          Nothing waiting on verification right now.
        </div>
      ) : (
        <div className="glass-card divide-y divide-ink/5">
          {items.map((p) => (
            <div key={p.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{p.order_number}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Awaiting Verification
                  </span>
                </div>
                <p className="text-sm text-ink/60">{p.customer_name || 'Guest'} · {p.customer_email}</p>
                <p className="text-sm text-ink/70 mt-1">
                  Claims: <span className="font-semibold">N$ {Number(p.amount).toFixed(2)}</span> via {p.method === 'manual_mobile_wallet' ? 'Mobile Wallet' : 'Bank Transfer'}
                  {p.reference && <> · Ref: <span className="font-mono">{p.reference}</span></>}
                </p>
                <p className="text-xs text-ink/40 mt-1">
                  Order total N$ {Number(p.grand_total).toFixed(2)} · already paid N$ {Number(p.amount_paid).toFixed(2)} · submitted {new Date(p.submitted_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.proof_file_path && (
                  <button onClick={() => viewProof(p.id)} className="px-3 py-2 rounded-xl2 glass-card text-xs font-semibold flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> View Proof
                  </button>
                )}
                <button onClick={() => verify(p.id)} className="px-4 py-2 rounded-xl2 bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                </button>
                <button onClick={() => reject(p.id)} className="px-4 py-2 rounded-xl2 bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
