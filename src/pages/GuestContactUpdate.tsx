import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const GuestContactUpdate: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'pending' | 'confirmed' | 'declined' | ''>('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const canSubmit = useMemo(() => !!email.trim() || !!phone.trim() || !!rsvpStatus, [email, phone, rsvpStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('submit-contact-request', {
        body: {
          token,
          email: email.trim() || null,
          phone: phone.trim() || null,
          rsvp_status: rsvpStatus || null,
          sms_consent: smsConsent,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult({ ok: true, message: 'Thanks! Your info was updated successfully.' });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Unable to submit update.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-semibold text-text-primary">Update your contact info</h1>
        <p className="text-sm text-text-secondary">You can share your email, phone number, and RSVP status.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Email (optional)</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-subtle" placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-subtle" placeholder="(555) 123-4567" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">RSVP (optional)</label>
            <select value={rsvpStatus} onChange={(e) => setRsvpStatus(e.target.value as any)} className="w-full px-3 py-2 border border-border rounded-lg bg-surface-subtle">
              <option value="">No change</option>
              <option value="confirmed">Attending</option>
              <option value="declined">Can’t attend</option>
              <option value="pending">Not sure yet</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)} />
            I agree to receive wedding updates by SMS (if phone provided).
          </label>

          <button type="submit" disabled={!canSubmit || loading} className="w-full px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50">
            {loading ? 'Saving…' : 'Submit update'}
          </button>
        </form>

        {result && (
          <p className={`text-sm ${result.ok ? 'text-success' : 'text-error'}`}>{result.message}</p>
        )}
      </div>
    </div>
  );
};

export default GuestContactUpdate;