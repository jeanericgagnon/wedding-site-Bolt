export function getOverviewWebsiteEditorLabel(isPublished: boolean): string {
  return isPublished ? 'Edit live website' : 'Edit draft before sharing';
}

export function getOverviewDraftVisibilityNote(): string {
  return 'Sharing the live site makes it available to guests at your guest-facing DayOf URL. Until then, keep it in draft or intentional private-preview mode only.';
}
