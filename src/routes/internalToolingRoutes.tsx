import type { ReactNode } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { BuilderV2Lab, TemplateScrollCapture, VariantPreviewCapture } from './routePages';

type InternalToolingRoutesProps = {
  internalToolingRoutesEnabled: boolean;
  internalToolingRoutesLoading: boolean;
};

function internalToolingFallback(internalToolingRoutesLoading: boolean): ReactNode {
  return internalToolingRoutesLoading
    ? <div className="min-h-screen bg-background" />
    : <Navigate to="/" replace />;
}

export function InternalToolingRoutes({
  internalToolingRoutesEnabled,
  internalToolingRoutesLoading,
}: InternalToolingRoutesProps) {
  const fallback = internalToolingFallback(internalToolingRoutesLoading);

  return (
    <>
      <Route path="/builder-v2-lab" element={internalToolingRoutesEnabled ? <BuilderV2Lab /> : fallback} />
      <Route path="/variant-preview-capture" element={internalToolingRoutesEnabled ? <VariantPreviewCapture /> : fallback} />
      <Route path="/template-scroll-capture" element={internalToolingRoutesEnabled ? <TemplateScrollCapture /> : fallback} />
    </>
  );
}
