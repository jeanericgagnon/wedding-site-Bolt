export function resolveCurrentSearchParams(searchParams?: URLSearchParams): URLSearchParams {
  if (searchParams) return searchParams;
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}
