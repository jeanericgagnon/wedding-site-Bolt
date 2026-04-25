import { buildCoupleDisplayName } from '../../lib/coupleDisplayName';

export const buildSiteMembershipLabel = (
  coupleName1: string | null | undefined,
  coupleName2: string | null | undefined,
  siteSlug: string | null | undefined,
): string => buildCoupleDisplayName(coupleName1, coupleName2) || siteSlug?.trim() || 'Wedding site';
