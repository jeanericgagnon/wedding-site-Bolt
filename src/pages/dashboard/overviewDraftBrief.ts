import { buildCoupleDisplayName } from '../../lib/coupleDisplayName';

export const getOverviewFallbackCoupleValue = (
  coupleName1: string | null | undefined,
  coupleName2: string | null | undefined,
): string | null => buildCoupleDisplayName(coupleName1, coupleName2) || null;
