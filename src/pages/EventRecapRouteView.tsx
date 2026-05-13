import { type ReactNode } from 'react';

interface EventRecapRouteViewProps {
  content: ReactNode;
  error: ReactNode;
  hasData: boolean;
  loading: ReactNode;
  loadingState: boolean;
}

export function EventRecapRouteView({
  content,
  error,
  hasData,
  loading,
  loadingState,
}: EventRecapRouteViewProps) {
  if (loadingState) return <>{loading}</>;
  if (!hasData) return <>{error}</>;
  return <>{content}</>;
}
