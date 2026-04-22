import { describe, expect, it } from 'vitest';
import { createCanonicalContentFromDraft } from './aiCanonicalContent';
import { mapCanonicalContentToSectionSettings } from './aiCanonicalContentMapper';

const canonical = createCanonicalContentFromDraft({
  heroTitle: 'Alex & Jordan',
  heroSubtitle: 'We’re excited to celebrate with you.',
  storyTitle: 'Our Story',
  storyBody: 'We met in college.',
  countdownTitle: 'The Countdown',
  countdownMessage: 'See you soon.',
  venueTitle: 'Venue',
  venueIntro: 'Join us in San Diego.',
  scheduleTitle: 'Schedule',
  scheduleIntro: 'Here’s the flow of the day.',
  galleryTitle: 'Gallery',
  galleryIntro: 'A few favorite moments.',
  rsvpTitle: 'RSVP',
  rsvpIntro: 'Let us know if you can make it.',
  registryTitle: 'Registry',
  registryIntro: 'Your presence is gift enough.',
  faqHeadline: 'FAQ',
  faqIntro: 'A few helpful details.',
  travelTitle: 'Travel',
  travelIntro: 'Travel notes for the weekend.',
  accommodationsTitle: 'Accommodations',
  accommodationsIntro: 'A few places to stay nearby.',
  dressCodeTitle: 'Dress Code',
  dressCodeIntro: 'Wear what feels right for the evening.',
  contactTitle: 'Questions?',
  contactIntro: 'Reach out if you need anything.',
  directionsTitle: 'Directions',
  directionsIntro: 'Here’s how to find us.',
  weddingPartyTitle: 'Wedding Party',
  weddingPartyIntro: 'The people closest to us.',
  eventHeadline: 'San Diego — June 12, 2027',
  rsvpCallToAction: 'Please reply by May 1.',
  ctaHeadline: 'Celebrate with us',
  ctaSubtext: 'We can’t wait to see you.',
});

describe('aiCanonicalContentMapper', () => {
  it('maps canonical registry content to builder registry settings', () => {
    expect(mapCanonicalContentToSectionSettings('registry', canonical)).toEqual({
      title: 'Registry',
      message: 'Your presence is gift enough.',
    });
  });

  it('maps drifted registry section types to builder registry settings', () => {
    expect(mapCanonicalContentToSectionSettings('RegistrySection', canonical)).toEqual({
      title: 'Registry',
      message: 'Your presence is gift enough.',
    });
  });

  it('maps canonical FAQ content to builder faq settings', () => {
    expect(mapCanonicalContentToSectionSettings('faq', canonical)).toEqual({
      headline: 'FAQ',
      subheadline: 'A few helpful details.',
    });
  });
});
