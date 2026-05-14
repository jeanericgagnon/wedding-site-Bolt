import { useMemo } from 'react';
import { getSafePublicWebUrl } from '../../../sections/publicLinks';
import { buildSettingsDashboardViewModel } from './buildSettingsDashboardViewModel';
import type { SiteLanguageCode } from './settingsDashboardTypes';
import type { PlannerAccessRole } from '../../../lib/plannerAccess';

type Args = {
  coupleNames: string;
  currentTemplate: string;
  defaultLanguage: SiteLanguageCode;
  musicPlaylistUrl: string;
  navigate: (href: string, options?: { replace?: boolean }) => void;
  settingsRole: PlannerAccessRole;
  signOut: () => Promise<void>;
  siteSlug: string;
  venueName: string | null;
  weddingDate: string | null;
};

export function useSettingsDashboardRouteSupport({
  coupleNames,
  currentTemplate,
  defaultLanguage,
  musicPlaylistUrl,
  navigate,
  settingsRole,
  signOut,
  siteSlug,
  venueName,
  weddingDate,
}: Args) {
  const safeMusicPlaylistUrl = getSafePublicWebUrl(musicPlaylistUrl);

  const {
    plannerRoleOptions,
    publicSiteUrl,
    tabs,
    weddingIdentityExportKit,
    weddingIdentityPrintAssets,
    weddingIdentityStoryGraphic,
    weddingIdentityStyleKit,
  } = useMemo(
    () =>
      buildSettingsDashboardViewModel({
        coupleNames,
        currentTemplate,
        defaultLanguage,
        settingsRole,
        siteSlug,
        venueName,
        weddingDate,
      }),
    [coupleNames, currentTemplate, defaultLanguage, settingsRole, siteSlug, venueName, weddingDate],
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return {
    handleLogout,
    plannerRoleOptions,
    publicSiteUrl,
    safeMusicPlaylistUrl,
    tabs,
    weddingIdentityExportKit,
    weddingIdentityPrintAssets,
    weddingIdentityStoryGraphic,
    weddingIdentityStyleKit,
  };
}
