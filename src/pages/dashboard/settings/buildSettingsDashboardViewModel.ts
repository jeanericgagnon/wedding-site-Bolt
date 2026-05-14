import { getAllTemplates } from '../../../templates/registry';
import {
  buildWeddingIdentityExportKit,
  buildWeddingIdentityPrintAssets,
  buildWeddingIdentityStoryGraphic,
  buildWeddingIdentityStyleKit,
  type WeddingIdentityExportKit,
  type WeddingIdentityPrintAsset,
  type WeddingIdentityStoryGraphic,
  type WeddingIdentityStyleKit,
} from '../../../lib/weddingIdentityExports';
import { buildPublicSiteUrl } from '../../../lib/publicSiteSlug';
import { PLANNER_ROLE_OPTIONS, type PlannerAccessRole } from '../../../lib/plannerAccess';
import { getSettingsTabs, type SettingsTab } from './SettingsNavigation';
import type { SiteLanguageCode } from './settingsDashboardTypes';

type BuildSettingsDashboardViewModelArgs = {
  coupleNames: string;
  currentTemplate: string;
  defaultLanguage: SiteLanguageCode;
  settingsRole: PlannerAccessRole;
  siteSlug: string;
  venueName: string | null;
  weddingDate: string | null;
};

export type SettingsDashboardViewModel = {
  currentTemplateName: string;
  plannerRoleOptions: typeof PLANNER_ROLE_OPTIONS;
  publicSiteUrl: string;
  tabs: SettingsTab[];
  weddingIdentityExportKit: WeddingIdentityExportKit;
  weddingIdentityPrintAssets: WeddingIdentityPrintAsset[];
  weddingIdentityStoryGraphic: WeddingIdentityStoryGraphic | null;
  weddingIdentityStyleKit: WeddingIdentityStyleKit;
};

export function buildSettingsDashboardViewModel({
  coupleNames,
  currentTemplate,
  defaultLanguage,
  settingsRole,
  siteSlug,
  venueName,
  weddingDate,
}: BuildSettingsDashboardViewModelArgs): SettingsDashboardViewModel {
  const derivedPublicSiteUrl = buildPublicSiteUrl(siteSlug);
  const currentTemplateName = getAllTemplates().find((template) => template.id === currentTemplate)?.name ?? 'Current site theme';

  return {
    currentTemplateName,
    plannerRoleOptions: PLANNER_ROLE_OPTIONS.filter((option) => option.value !== 'owner'),
    publicSiteUrl: derivedPublicSiteUrl,
    tabs: getSettingsTabs(settingsRole),
    weddingIdentityExportKit: buildWeddingIdentityExportKit({
      coupleNames,
      publicSiteUrl: derivedPublicSiteUrl,
      templateId: currentTemplate,
      weddingDate,
      venueName,
      templateName: currentTemplateName,
      defaultLanguage,
    }),
    weddingIdentityPrintAssets: buildWeddingIdentityPrintAssets({
      coupleNames,
      publicSiteUrl: derivedPublicSiteUrl,
      templateId: currentTemplate,
      weddingDate,
      venueName,
      templateName: currentTemplateName,
      defaultLanguage,
    }),
    weddingIdentityStoryGraphic: buildWeddingIdentityStoryGraphic({
      coupleNames,
      publicSiteUrl: derivedPublicSiteUrl,
      templateId: currentTemplate,
      weddingDate,
      venueName,
      templateName: currentTemplateName,
      defaultLanguage,
    }),
    weddingIdentityStyleKit: buildWeddingIdentityStyleKit({
      coupleNames,
      publicSiteUrl: derivedPublicSiteUrl,
      templateId: currentTemplate,
      weddingDate,
      venueName,
      templateName: currentTemplateName,
      defaultLanguage,
    }),
  };
}
