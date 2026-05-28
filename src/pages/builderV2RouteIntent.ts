export interface BuilderV2RouteIntent {
  shouldOpenExportHandoff: boolean;
  shouldFocusLaunchGate: boolean;
  normalizedSearch: string;
  normalizedHash: string;
}

export function resolveBuilderV2RouteIntent(search: string, hash: string): BuilderV2RouteIntent {
  const params = new URLSearchParams(search);
  const shouldOpenExportHandoff = params.get('publishNow') === '1';

  if (shouldOpenExportHandoff) {
    params.delete('publishNow');
  }

  const normalizedParams = params.toString();
  const normalizedHash = hash.trim();

  return {
    shouldOpenExportHandoff,
    shouldFocusLaunchGate: shouldOpenExportHandoff || normalizedHash === '#launch-confidence',
    normalizedSearch: normalizedParams ? `?${normalizedParams}` : '',
    normalizedHash,
  };
}
