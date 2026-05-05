import { resolveActiveSiteForUser } from './activeSite';

export const resolvePrimaryWeddingSiteId = async (userId: string): Promise<string | null> => {
  const activeSite = await resolveActiveSiteForUser(userId);
  return activeSite?.id || null;
};
