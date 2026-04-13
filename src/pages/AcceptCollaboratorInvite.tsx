import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const AcceptCollaboratorInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [inviteState, setInviteState] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [inviteInfo, setInviteInfo] = useState<{ invite_email: string; invite_name: string | null; role: string; status: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        if (!cancelled) setInviteState('invalid');
        return;
      }

      const { data, error } = await supabase
        .from('wedding_site_collaborator_invites')
        .select('invite_email, invite_name, role, status')
        .eq('invite_token', token)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data || data.status !== 'pending') {
        setInviteState('invalid');
        return;
      }

      setInviteInfo(data as { invite_email: string; invite_name: string | null; role: string; status: string });
      setInviteState('valid');
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="max-w-xl mx-auto rounded-2xl border border-border-subtle bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary">DayOf collaborator invite</p>
        <h1 className="mt-3 text-3xl font-bold text-text-primary">Accept collaborator invite</h1>
        <p className="mt-3 text-sm text-text-secondary">
          This is the new landing path for planner/coordinator invites. Token validation is now wired. Claim activation is the next step.
        </p>

        <div className="mt-6 rounded-xl border border-border-subtle bg-surface-subtle/20 px-4 py-4">
          <p className="text-sm font-medium text-text-primary">Invite token</p>
          <p className="mt-2 break-all text-sm text-text-secondary">{token || 'Missing token'}</p>
        </div>

        <div className="mt-4 rounded-xl border border-border-subtle bg-surface-subtle/20 px-4 py-4">
          <p className="text-sm font-medium text-text-primary">Invite status</p>
          {inviteState === 'loading' && <p className="mt-2 text-sm text-text-secondary">Checking invite…</p>}
          {inviteState === 'invalid' && <p className="mt-2 text-sm text-error">This invite is missing, invalid, already used, or no longer pending.</p>}
          {inviteState === 'valid' && inviteInfo && (
            <div className="mt-2 text-sm text-text-secondary space-y-1">
              <p><span className="font-medium text-text-primary">Invitee:</span> {inviteInfo.invite_name || inviteInfo.invite_email}</p>
              <p><span className="font-medium text-text-primary">Email:</span> {inviteInfo.invite_email}</p>
              <p><span className="font-medium text-text-primary">Role:</span> {inviteInfo.role}</p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3 text-sm text-text-secondary">
          <p>What this stub proves:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>owners can generate real invite links</li>
            <li>recipients now have a real route to land on</li>
            <li>claim/activation wiring is the next step</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/login" className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
            Sign in to continue
          </Link>
          <Link to="/" className="inline-flex items-center rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-subtle">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AcceptCollaboratorInvite;
