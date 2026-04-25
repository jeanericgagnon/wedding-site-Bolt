import { buildCoupleDisplayName } from '../../lib/coupleDisplayName';

export const getMessageTemplateCoupleLabel = (
  coupleFirstName: string | null | undefined,
  coupleSecondName: string | null | undefined,
): string => buildCoupleDisplayName(coupleFirstName, coupleSecondName) || 'our wedding';
