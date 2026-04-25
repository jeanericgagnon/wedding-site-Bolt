import { buildCoupleDisplayName } from './coupleDisplayName';

export interface WelcomeNoteInput {
  partner1Name: string;
  partner2Name: string;
  city?: string;
  venue?: string;
  useCasePacks?: string[];
}

export function buildWelcomeNoteDraft(input: WelcomeNoteInput): string {
  const names = buildCoupleDisplayName(input.partner1Name, input.partner2Name) || 'We';
  const packs = new Set(input.useCasePacks ?? []);

  let middle = 'We are so happy to celebrate this season with the people we love most.';

  if (packs.has('destination')) {
    middle = `We are so happy to welcome you${input.city ? ` to ${input.city}` : ''} for a full celebration weekend with the people we love most.`;
  } else if (packs.has('bilingual')) {
    middle = 'We are so happy to celebrate with family and friends across both sides of our community, and we want this space to feel easy to follow for everyone.';
  } else if (packs.has('interfaith')) {
    middle = 'We are so happy to celebrate with the people we love most, and to honor the traditions and family stories that brought us here.';
  }

  const closing = input.venue?.trim()
    ? `We cannot wait to gather with you at ${input.venue.trim()}.`
    : 'We cannot wait to celebrate with you.';

  return `${names} ${middle} ${closing}`.replace(/\s+/g, ' ').trim();
}
