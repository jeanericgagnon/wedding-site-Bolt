import { type ReactNode } from 'react';

interface EventHubRouteViewProps {
  hasSlug: boolean;
  liveContent: ReactNode;
  missingSlugView: ReactNode;
}

export function EventHubRouteView({ hasSlug, liveContent, missingSlugView }: EventHubRouteViewProps) {
  if (!hasSlug) return <>{missingSlugView}</>;
  return <>{liveContent}</>;
}
