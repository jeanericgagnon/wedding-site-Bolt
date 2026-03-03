export type SectionMockData = {
  title: string;
  subtitle?: string;
  names?: string;
  date?: string;
  location?: string;
  body?: string;
};

export const SECTION_MOCK_DATA_BY_TYPE: Record<string, SectionMockData> = {
  hero: {
    title: 'Alex & Jordan',
    subtitle: 'Saturday, June 14, 2026',
    location: 'Napa Valley, CA',
  },
  story: {
    title: 'Our Story',
    body: 'From first coffee to forever — a short timeline of our favorite moments.',
  },
  venue: {
    title: 'Venue',
    location: 'Sunset Garden Estate',
    body: 'Ceremony at 4:00 PM · Reception at 6:00 PM',
  },
  schedule: {
    title: 'Schedule',
    body: 'Welcome Drinks · Ceremony · Cocktail Hour · Reception',
  },
  travel: {
    title: 'Travel',
    body: 'Hotel blocks, airport info, and local transportation tips.',
  },
  registry: {
    title: 'Registry',
    body: 'A few favorite places and a honeymoon fund.',
  },
  faq: {
    title: 'FAQ',
    body: 'Dress code, parking, plus-ones, and children policy.',
  },
  rsvp: {
    title: 'RSVP',
    body: 'Please reply by May 15, 2026.',
  },
  gallery: {
    title: 'Photos',
    body: 'Engagement photos and favorite moments.',
  },
  countdown: {
    title: 'Countdown',
    body: '100 days to go',
  },
  'wedding-party': {
    title: 'Wedding Party',
    body: 'Meet the people standing with us.',
  },
  'dress-code': {
    title: 'Dress Code',
    body: 'Garden Formal · Pastels encouraged',
  },
  accommodations: {
    title: 'Accommodations',
    body: 'Room blocks available until May 1.',
  },
  contact: {
    title: 'Questions?',
    body: 'Reach us or our coordinator any time.',
  },
  'footer-cta': {
    title: 'We can’t wait to celebrate with you',
    body: 'RSVP now',
  },
  custom: {
    title: 'Custom Section',
    body: 'Preview placeholder content.',
  },
  quotes: {
    title: 'Quotes & Wishes',
    body: 'A few notes from people we love.',
  },
  menu: {
    title: 'Menu',
    body: 'Seasonal dinner with vegetarian and gluten-free options.',
  },
  music: {
    title: 'Music',
    body: 'Ceremony, cocktail, and dance-floor playlists.',
  },
  directions: {
    title: 'Directions',
    body: 'Parking, shuttle, and map links.',
  },
  video: {
    title: 'Video',
    body: 'Our save-the-date film.',
  },
};
