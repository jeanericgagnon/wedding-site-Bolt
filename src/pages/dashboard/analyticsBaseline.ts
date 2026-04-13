export interface AnalyticsBaselineInput {
  totalGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  pendingGuests: number;
  contactableGuests: number;
  registryItemCount: number;
  photoAlbumCount: number;
  activePhotoAlbumCount: number;
  interactiveSuggestionCount: number;
}

export interface AnalyticsBaselineMetric {
  label: string;
  value: string;
  detail: string;
  source: 'measured' | 'derived';
}

function pct(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10) / 10;
}

export function buildAnalyticsBaseline(input: AnalyticsBaselineInput): AnalyticsBaselineMetric[] {
  const respondedGuests = input.confirmedGuests + input.declinedGuests;
  const attendanceRate = input.totalGuests > 0 ? pct(input.confirmedGuests * 100, input.totalGuests) : 0;
  const contactCoverage = input.totalGuests > 0 ? pct(input.contactableGuests * 100, input.totalGuests) : 0;
  return [
    {
      label: 'RSVP response rate',
      value: `${pct(respondedGuests * 100, input.totalGuests)}%`,
      detail: `${respondedGuests} of ${input.totalGuests} guests have responded.`,
      source: 'measured',
    },
    {
      label: 'Attendance rate',
      value: `${attendanceRate}%`,
      detail: `${input.confirmedGuests} of ${input.totalGuests} invited guests are currently marked attending.`,
      source: 'derived',
    },
    {
      label: 'Still waiting',
      value: `${input.pendingGuests}`,
      detail: input.pendingGuests === 0 ? 'No outstanding RSVP backlog right now.' : `${input.pendingGuests} guests still need a reply.`,
      source: 'measured',
    },
    {
      label: 'Contact coverage',
      value: `${contactCoverage}%`,
      detail: `${input.contactableGuests} of ${input.totalGuests} guests have email or phone contact available.`,
      source: 'derived',
    },
    {
      label: 'Registry readiness',
      value: `${input.registryItemCount}`,
      detail: input.registryItemCount === 0 ? 'No registry items are live yet.' : `${input.registryItemCount} registry item${input.registryItemCount === 1 ? '' : 's'} ready for guests.`,
      source: 'measured',
    },
    {
      label: 'Guest photo prompts',
      value: `${input.interactiveSuggestionCount}`,
      detail: input.interactiveSuggestionCount === 0 ? 'No guest suggestions have come in yet.' : `${input.interactiveSuggestionCount} suggestion${input.interactiveSuggestionCount === 1 ? '' : 's'} captured so far.`,
      source: 'measured',
    },
    {
      label: 'Photo collection setup',
      value: `${input.activePhotoAlbumCount}/${input.photoAlbumCount}`,
      detail: input.photoAlbumCount === 0 ? 'No photo albums are ready yet.' : `${input.activePhotoAlbumCount} active album${input.activePhotoAlbumCount === 1 ? '' : 's'} out of ${input.photoAlbumCount} total album${input.photoAlbumCount === 1 ? '' : 's'}.`,
      source: 'measured',
    },
  ];
}
