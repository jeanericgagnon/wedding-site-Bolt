import { describe, expect, it } from 'vitest';
import { generateSiteConfig, type OnboardingData } from './siteGenerator';

const buildInput = (overrides: Partial<OnboardingData> = {}): OnboardingData => ({
  couple_name_1: 'Alex',
  couple_name_2: 'Jordan',
  template: 'minimal',
  ...overrides,
});

describe('generateSiteConfig', () => {
  it('keeps a single partner name truthful in generated display copy', () => {
    const config = generateSiteConfig(buildInput({ couple_name_2: '' }));

    expect(config.couple.display_name).toBe('Alex');
    expect(config.content.hero.headline).toBe('Alex');
  });

  it('adds the shared last name without leaving a broken ampersand', () => {
    const config = generateSiteConfig(buildInput({ couple_name_2: '', couple_last_name: 'Smith' }));

    expect(config.couple.display_name).toBe('Alex Smith');
    expect(config.content.hero.headline).toBe('Alex Smith');
  });

  it('guards invalid persisted onboarding dates instead of baking Invalid Date into generated copy', () => {
    const config = generateSiteConfig(buildInput({
      wedding_date: '2027-02-30',
      rsvp_deadline: '2027-02-31',
    }));

    expect(config.content.hero.subheadline).toBe("We're getting married.");
    expect(config.content.rsvp.deadline_text).toBe('RSVP timing will be added once it is set.');
    expect(config.content.hero.subheadline).not.toContain('Invalid Date');
    expect(config.content.rsvp.deadline_text).not.toContain('Invalid Date');
    expect(config.content.hero.subheadline).not.toContain('March');
    expect(config.content.rsvp.deadline_text).not.toContain('March');
  });

  it('uses finished-feeling fallback copy for sparse public site sections', () => {
    const config = generateSiteConfig(buildInput());
    const serialized = JSON.stringify(config.content);

    expect(config.content.details.venue_name).toBe('Venue details are being finalized.');
    expect(config.content.details.ceremony_time).toBe('Time to follow');
    expect(config.content.travel.transportation).toBe('Travel details will be added if guests need them.');
    expect(serialized).not.toMatch(/shared here|coming soon|placeholder/i);
  });
});
