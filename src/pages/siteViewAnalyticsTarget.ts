export function resolveSiteViewAnalyticsTarget(searchParams: URLSearchParams) {
  if (searchParams.get('entry') === 'qr') return '/site/qr';
  if (searchParams.has('token') || searchParams.has('invite_token') || searchParams.has('passwordSession')) return '/site/invite';
  return '/site';
}
