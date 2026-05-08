import React from 'react';

type VaultContributeRouteStep = 'loading' | 'hub' | 'form' | 'success' | 'error' | 'invalid';

interface VaultContributeRouteViewProps {
  step: VaultContributeRouteStep;
  loadingView: React.ReactNode;
  invalidView: React.ReactNode;
  hubView: React.ReactNode;
  successView: React.ReactNode;
  errorView: React.ReactNode;
  formView: React.ReactNode;
}

export function VaultContributeRouteView({
  step,
  loadingView,
  invalidView,
  hubView,
  successView,
  errorView,
  formView,
}: VaultContributeRouteViewProps) {
  if (step === 'loading') return <>{loadingView}</>;
  if (step === 'invalid') return <>{invalidView}</>;
  if (step === 'hub') return <>{hubView}</>;
  if (step === 'success') return <>{successView}</>;
  if (step === 'error') return <>{errorView}</>;
  return <>{formView}</>;
}
