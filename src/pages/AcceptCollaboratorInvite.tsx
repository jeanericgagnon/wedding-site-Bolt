import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export const AcceptCollaboratorInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="max-w-xl mx-auto rounded-2xl border border-border-subtle bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary">DayOf collaborator invite</p>
        <h1 className="mt-3 text-3xl font-bold text-text-primary">Accept collaborator invite</h1>
        <p className="mt-3 text-sm text-text-secondary">
          This is the new landing path for planner/coordinator invites. The token is present, but full claim activation is still the next step.
        </p>

        <div className="mt-6 rounded-xl border border-border-subtle bg-surface-subtle/20 px-4 py-4">
          <p className="text-sm font-medium text-text-primary">Invite token</p>
          <p className="mt-2 break-all text-sm text-text-secondary">{token || 'Missing token'}</p>
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
