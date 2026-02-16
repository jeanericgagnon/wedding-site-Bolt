import type { SiteConfig, SectionConfig } from '../types/siteConfig';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateSiteConfig(obj: any): ValidationResult {
  const errors: string[] = [];

  if (!obj || typeof obj !== 'object') {
    return { ok: false, errors: ['Site config must be an object'] };
  }

  if (obj.version !== '1') {
    errors.push('Version must be "1"');
  }

  if (!obj.template_id || typeof obj.template_id !== 'string') {
    errors.push('template_id is required and must be a string');
  }

  if (!obj.couple || typeof obj.couple !== 'object') {
    errors.push('couple is required');
  } else {
    if (!obj.couple.partner1_name) errors.push('couple.partner1_name is required');
    if (!obj.couple.partner2_name) errors.push('couple.partner2_name is required');
    if (!obj.couple.display_name) errors.push('couple.display_name is required');
  }

  if (!obj.event || typeof obj.event !== 'object') {
    errors.push('event is required');
  }

  if (!obj.rsvp || typeof obj.rsvp !== 'object') {
    errors.push('rsvp is required');
  } else {
    if (typeof obj.rsvp.enabled !== 'boolean') {
      errors.push('rsvp.enabled must be a boolean');
    }
  }

  if (!Array.isArray(obj.sections)) {
    errors.push('sections must be an array');
  } else {
    obj.sections.forEach((section: any, index: number) => {
      if (!section.id) errors.push(`Section ${index}: id is required`);
      if (!section.type) errors.push(`Section ${index}: type is required`);
      if (typeof section.enabled !== 'boolean') {
        errors.push(`Section ${index}: enabled must be a boolean`);
      }
      if (!section.props_key) errors.push(`Section ${index}: props_key is required`);
    });
  }

  if (!obj.content || typeof obj.content !== 'object') {
    errors.push('content is required and must be an object');
  }

  if (!obj.theme || typeof obj.theme !== 'object') {
    errors.push('theme is required');
  }

  if (!obj.meta || typeof obj.meta !== 'object') {
    errors.push('meta is required');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
