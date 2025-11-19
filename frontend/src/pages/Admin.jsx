import { useEffect, useState } from 'react';

// For Vercel, use relative paths (API routes are at root level via rewrites)
// For local dev, default to localhost:3000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000');

function Admin() {
  const [token, setToken] = useState('');
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState('idle');
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState('');

  const syncTokenFromStorage = () => {
    const stored = window.localStorage.getItem('candle_admin_token') || '';
    setToken(stored);
    if (stored) {
      fetchLeads(stored);
    }
  };

  const fetchLeads = async (tokenOverride = token) => {
    if (!tokenOverride) {
      setStatus('no-token');
      setError('Set ADMIN_TOKEN via localStorage before fetching leads.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/leads`, {
        headers: { Authorization: `Bearer ${tokenOverride}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to fetch leads');
      }
      setLeads(data.leads || []);
      setStatus('loaded');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  useEffect(() => {
    syncTokenFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleString('en-IN', { hour12: true }) : '—';

  return (
    <section className="section-container space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.4em] text-brand-olive">Admin</p>
        <h1 className="font-display text-4xl text-brand-brown">Lead review</h1>
        <p className="text-sm text-brand-olive">
          To load leads, open your browser console and run:
          <code className="ml-2 rounded bg-brand-peach/60 px-2 py-1 text-brand-brown">
            localStorage.setItem(&apos;candle_admin_token&apos;, &apos;YOUR_ADMIN_TOKEN&apos;)
          </code>
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => fetchLeads()}
          className="rounded-full bg-brand-brown px-4 py-2 text-sm font-semibold text-brand-cream hover:bg-brand-olive"
        >
          Refresh leads
        </button>
        <button
          onClick={syncTokenFromStorage}
          className="rounded-full border border-brand-brown px-4 py-2 text-sm font-semibold text-brand-brown hover:bg-brand-brown/10"
        >
          Sync token from storage
        </button>
        <span className="text-sm text-brand-olive">
          Token loaded: {token ? 'Yes' : 'No'}
        </span>
      </div>

      {status === 'no-token' && (
        <div className="rounded-xl border border-dashed border-brand-olive/50 bg-brand-peach/30 p-4 text-sm text-brand-brown">
          Set the token first, then click “Sync token” followed by “Refresh leads.”
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-brand-peach bg-white/80 shadow-sm">
        <table className="min-w-full divide-y divide-brand-peach/60 text-left text-sm">
          <thead className="bg-brand-peach/50 text-brand-brown">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Transcription</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-peach/40 text-brand-olive">
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-brand-olive">
                  {status === 'loading' ? 'Loading leads...' : 'No leads yet.'}
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.leadId}>
                <td className="px-4 py-3 font-semibold text-brand-brown">{lead.name}</td>
                <td className="px-4 py-3">{lead.phone}</td>
                <td className="px-4 py-3 capitalize">{lead.status}</td>
                <td className="px-4 py-3">{formatDate(lead.createdAt)}</td>
                <td className="px-4 py-3">
                  {lead.transcription ? `${lead.transcription.slice(0, 60)}…` : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="text-sm font-semibold text-brand-brown underline"
                    onClick={() =>
                      setSelectedLead((prev) => (prev?.leadId === lead.leadId ? null : lead))
                    }
                  >
                    {selectedLead?.leadId === lead.leadId ? 'Hide details' : 'View details'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <div className="rounded-2xl border border-brand-peach bg-white/90 p-6 shadow-sm">
          <h2 className="font-display text-2xl text-brand-brown">
            Lead details — {selectedLead.name}
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-brand-cream/80 p-4 text-xs text-brand-olive">
            {JSON.stringify(selectedLead, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}

export default Admin;


