import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Search, UserX, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../api/axios.js';

const STATUSES = ['', 'pending', 'subscribed', 'unsubscribed'];

export default function ManageNewsletter() {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deactivatingId, setDeactivatingId] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/newsletter/subscribers', { params: { status: status || undefined, search: search || undefined, limit: 100 } })
      .then((r) => { setItems(r.data.data.items); setCount(r.data.data.subscribed_count); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function handleSendTestEmail() {
    setTestingEmail(true);
    setTestResult(null);
    try {
      const r = await api.post('/newsletter/test-email');
      setTestResult({ ok: r.data?.data?.sent, message: r.data?.message, detail: r.data?.data?.detail, driver: r.data?.data?.mail_driver, to: r.data?.data?.to });
    } catch (err) {
      setTestResult({ ok: false, message: err.response?.data?.message || 'Could not reach the server to send a test email.', detail: null });
    } finally {
      setTestingEmail(false);
    }
  }

  const handleDeactivate = async (subscriber) => {
    if (!window.confirm(`Deactivate ${subscriber.email}? They will stop receiving AIMsisters emails.`)) return;
    setDeactivatingId(subscriber.id);
    try {
      await api.post(`/newsletter/${subscriber.id}/deactivate`);
      load();
    } catch {
      // no-op — list stays as-is, user can retry
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="font-display font-semibold text-lg">Newsletter Subscribers</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="pl-9 pr-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary w-full sm:w-64"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl2 border border-ink/10 focus:outline-none focus:ring-2 focus:ring-secondary">
            {STATUSES.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : 'All'}</option>)}
          </select>
        </div>
      </div>

      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-brand-gradient-soft flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs text-ink/50">Active subscribers</p>
          </div>
        </div>
        <button
          onClick={handleSendTestEmail}
          disabled={testingEmail}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-glass hover:opacity-90 transition disabled:opacity-60"
        >
          {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {testingEmail ? 'Sending...' : 'Send Test Email'}
        </button>
      </div>

      {/* Sends a real email to your own account address using the exact
          same delivery path every subscriber email goes through - the
          fastest way to confirm right now whether SMTP/Brevo is actually
          working, without needing server/log access. Never claims success
          unless the mail provider actually accepted it. */}
      {testResult && (
        <div className={`glass-card p-5 flex items-start gap-3 border ${testResult.ok ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
          {testResult.ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${testResult.ok ? 'text-emerald-700' : 'text-red-600'}`}>{testResult.message}</p>
            {testResult.to && <p className="text-xs text-ink/50 mt-1">To: {testResult.to} &middot; Driver: {testResult.driver}</p>}
            {testResult.detail && (
              <p className="text-xs text-ink/60 mt-2 font-mono bg-white/60 rounded-lg px-3 py-2 break-all">{testResult.detail}</p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-ink/50">Loading subscribers...</p>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center text-ink/50">No subscribers match this filter.</div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-ink/10">
                <th className="p-4">Email</th>
                <th className="p-4">Language</th>
                <th className="p-4">Status</th>
                <th className="p-4">Subscribed</th>
                <th className="p-4">Unsubscribed</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-ink/5 hover:bg-white/50">
                  <td className="p-4 font-medium">{s.email}</td>
                  <td className="p-4 text-ink/60">{s.language}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-ink/10 capitalize">{s.status}</span>
                  </td>
                  <td className="p-4 text-ink/40 text-xs">{s.subscribed_at?.slice(0, 10) || '—'}</td>
                  <td className="p-4 text-ink/40 text-xs">{s.unsubscribed_at?.slice(0, 10) || '—'}</td>
                  <td className="p-4 text-right">
                    {s.status === 'subscribed' && (
                      <button
                        onClick={() => handleDeactivate(s)}
                        disabled={deactivatingId === s.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        {deactivatingId === s.id ? 'Deactivating...' : 'Deactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
