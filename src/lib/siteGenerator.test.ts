import { describe, expect, it } from 'vitest';
import { generateSiteConfig, type OnboardingData } from './siteGenerator';

const buildInput = (overrides: Partial<OnboardingData> = {}): OnboardingData => ({
  couple_name_1: 'Alex',
  couple_name_2: 'Jordan',
  template: 'minimal',
  ...overrides,
});

function getGeneratedContent(config: ReturnType<typeof generateSiteConfig>) {
  return config.content as {
    hero: { headline: string; subheadline: string };
    rsvp: { deadline_text: string };
  };
}

describe('generateSiteConfig', () => {
  it('keeps a single partner name truthful in generated display copy', () => {
    const config = generateSiteConfig(buildInput({ couple_name_2: '' }));
    const content = getGeneratedContent(config);

    expect(config.couple.display_name).toBe('Alex');
    expect(content.hero.headline).toBe('Alex');
  });

  it('adds the shared last name without leaving a broken ampersand', () => {
    const config = generateSiteConfig(buildInput({ couple_name_2: '', couple_last_name: 'Smith' }));
    const content = getGeneratedContent(config);

    expect(config.couple.display_name).toBe('Alex Smith');
    expect(content.hero.headline).toBe('Alex Smith');
  });

  it('guards invalid persisted onboarding dates instead of baking Invalid Date into generated copy', () => {
    const config = generateSiteConfig(buildInput({
      wedding_date: 'not-a-date',
      rsvp_deadline: 'still-not-a-date',
    }));
    const content = getGeneratedContent(config);

    expect(content.hero.subheadline).toBe("We're getting married on the wedding day.");
    expect(content.rsvp.deadline_text).toBe('Please reply by the wedding day');
    expect(content.hero.subheadline).not.toContain('Invalid Date');
    expect(content.rsvp.deadline_text).not.toContain('Invalid Date');
  });
});
