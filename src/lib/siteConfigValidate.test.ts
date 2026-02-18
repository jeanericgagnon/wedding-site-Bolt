import { describe, it, expect } from 'vitest';
import { validateSiteConfig } from './siteConfigValidate';

const validConfig = {
  version: '1',
  template_id: 'classic',
  couple: {
    partner1_name: 'Alice',
    partner2_name: 'Bob',
    display_name: 'Alice & Bob',
  },
  event: { weddingDate: '2026-06-15' },
  rsvp: { enabled: true },
  sections: [
    { id: 's1', type: 'hero', enabled: true, props_key: 'hero' },
  ],
  content: {},
  theme: {},
  meta: { createdAt: '2026-01-01' },
};

describe('validateSiteConfig', () => {
  it('accepts a valid config', () => {
    const result = validateSiteConfig(validConfig);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null', () => {
    const result = validateSiteConfig(null);
    expect(result.ok).toBe(false);
  });

  it('rejects non-object', () => {
    const result = validateSiteConfig('string');
    expect(result.ok).toBe(false);
  });

  it('catches wrong version', () => {
    const result = validateSiteConfig({ ...validConfig, version: '2' });
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('Version'))).toBe(true);
  });

  it('catches missing template_id', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { template_id: _, ...rest } = validConfig;
    const result = validateSiteConfig(rest);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('template_id'))).toBe(true);
  });

  it('catches missing couple', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { couple: _, ...rest } = validConfig;
    const result = validateSiteConfig(rest);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('couple'))).toBe(true);
  });

  it('catches missing partner1_name', () => {
    const result = validateSiteConfig({
      ...validConfig,
      couple: { partner2_name: 'Bob', display_name: 'x' },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('partner1_name'))).toBe(true);
  });

  it('catches missing partner2_name', () => {
    const result = validateSiteConfig({
      ...validConfig,
      couple: { partner1_name: 'Alice', display_name: 'x' },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('partner2_name'))).toBe(true);
  });

  it('catches non-array sections', () => {
    const result = validateSiteConfig({ ...validConfig, sections: 'bad' });
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('sections'))).toBe(true);
  });

  it('catches section missing id', () => {
    const result = validateSiteConfig({
      ...validConfig,
      sections: [{ type: 'hero', enabled: true, props_key: 'hero' }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('id'))).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const result = validateSiteConfig({ version: '2', couple: {}, sections: 'bad' });
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
