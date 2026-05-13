import { type ReactNode } from 'react';

interface EventRsvpRouteViewProps {
  error: string;
  errorView: ReactNode;
  liveContent: ReactNode;
  loading: boolean;
  loadingView: ReactNode;
}

export function EventRsvpRouteView({
  error,
  errorView,
  liveContent,
  loading,
  loadingView,
}: EventRsvpRouteViewProps) {
  if (loading) return <>{loadingView}</>;
  if (error) return <>{errorView}</>;
  return <>{liveContent}</>;
}
