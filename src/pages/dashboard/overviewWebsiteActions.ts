export function getOverviewWebsiteEditorLabel(isPublished: boolean): string {
  return isPublished ? 'Edit shared website' : 'Edit draft before sharing';
}

export function getOverviewDraftVisibilityNote(): string {
  return 'Sharing the site makes it available to guests at your guest-facing DayOf URL. Until then, keep it in draft or intentional private-preview mode only.';
}

export function getOverviewRegistryReadinessNote(): string {
  return 'Registry items added so far';
}

export function getOverviewOpenWebsiteLabel(isPublished: boolean): string {
  return isPublished ? 'Open shared website' : 'Preview draft website';
}

export function getOverviewSiteActivityLabel(action: 'publish' | 'rollback' | 'save'): string {
  if (action === 'publish') return 'Shared guest-facing site';
  if (action === 'rollback') return 'Restored older version';
  return 'Saved draft';
}
