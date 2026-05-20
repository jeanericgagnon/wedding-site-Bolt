import { type ReactNode } from 'react';

interface SiteViewRouteViewProps {
  comingSoon: ReactNode;
  error: string | null;
  fallback: ReactNode;
  inviteOnlyGate: ReactNode;
  liveContent: ReactNode;
  loading: boolean;
  passwordGate: ReactNode;
  privacyGate: 'loading' | 'open' | 'password_required' | 'invite_only' | 'unlocked';
  ready: boolean;
  useComingSoon: boolean;
}

export function SiteViewRouteView({
  comingSoon,
  error,
  fallback,
  inviteOnlyGate,
  liveContent,
  loading,
  passwordGate,
  privacyGate,
  ready,
  useComingSoon,
}: SiteViewRouteViewProps) {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading wedding site...</p>
        </div>
      </div>
    );
  }

  if (useComingSoon) return <>{comingSoon}</>;
  if (privacyGate === 'password_required') return <>{passwordGate}</>;
  if (privacyGate === 'invite_only') return <>{inviteOnlyGate}</>;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-surface border border-border-subtle rounded-xl p-6 text-center">
          <div className="w-14 h-14 text-error mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-text-primary mb-2">Something went wrong</h1>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) return <>{fallback}</>;
  return <>{liveContent}</>;
}
