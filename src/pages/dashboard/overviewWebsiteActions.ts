export function getOverviewWebsiteEditorLabel(isPublished: boolean): string {
  return isPublished ? 'Edit live website' : 'Edit draft before sharing';
}
