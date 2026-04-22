import { AiCanonicalSectionContent } from './aiCanonicalContent';

export const mapCanonicalContentToSectionSettings = (
  type: string,
  canonical: AiCanonicalSectionContent
): Record<string, string> | null => {
  const normalizedType = type.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  switch (normalizedType) {
    case 'hero':
      return {
        title: canonical.hero.title,
        subtitle: canonical.hero.subtitle,
        headline: canonical.hero.title,
      };
    case 'story':
      return {
        title: canonical.story.title,
        storyText: canonical.story.body,
      };
    case 'countdown':
      return {
        title: canonical.countdown.title,
        message: canonical.countdown.message,
      };
    case 'venue':
      return {
        title: canonical.venue.title,
        subtitle: canonical.venue.intro,
      };
    case 'schedule':
      return {
        title: canonical.schedule.title,
        subtitle: canonical.schedule.intro,
      };
    case 'gallery':
      return {
        title: canonical.gallery.title,
        subtitle: canonical.gallery.intro,
      };
    case 'rsvp':
      return {
        title: canonical.rsvp.title,
        subtitle: canonical.rsvp.intro,
        buttonLabel: canonical.rsvp.callToAction,
      };
    case 'registry':
    case 'registrysection':
      return {
        title: canonical.registry.title,
        message: canonical.registry.intro,
      };
    case 'faq':
      return {
        headline: canonical.faq.title,
        subheadline: canonical.faq.intro,
      };
    case 'travel':
      return {
        headline: canonical.travel.title,
        intro: canonical.travel.intro,
      };
    case 'accommodations':
      return {
        headline: canonical.accommodations.title,
        generalNote: canonical.accommodations.intro,
      };
    case 'weddingParty':
      return {
        headline: canonical.weddingParty.title,
        subheadline: canonical.weddingParty.intro,
      };
    case 'dress-code':
      return {
        title: canonical.dressCode.title,
        description: canonical.dressCode.intro,
      };
    case 'directions':
      return {
        title: canonical.directions.title,
        headline: canonical.directions.title,
        description: canonical.directions.intro,
      };
    case 'contact':
      return {
        title: canonical.contact.title,
        introText: canonical.contact.intro,
      };
    case 'footer-cta':
      return {
        headline: canonical.footerCta.headline,
        subtext: canonical.footerCta.subtext,
      };
    default:
      return null;
  }
};
