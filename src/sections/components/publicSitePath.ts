import { resolveWeddingSubdomainSlugFromHostname } from '../../lib/publicSiteSlug';

export function getPublicSiteSlugFromPath(pathname: string): string {
  const [, sitePath = ''] = pathname.split('/site/');
  const [siteSlug = ''] = sitePath.split('/');
  try {
    return decodeURIComponent(siteSlug).trim();
  } catch {
    return siteSlug.trim();
  }
}

export function getPublicSiteSlugFromLocation(pathname: string, hostname: string): string {
  return getPublicSiteSlugFromPath(pathname) || resolveWeddingSubdomainSlugFromHostname(hostname) || '';
}
