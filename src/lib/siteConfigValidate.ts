export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

type SiteConfigSectionShape = {
  id?: unknown;
  type?: unknown;
  enabled?: unknown;
  props_key?: unknown;
};

type SiteConfigShape = {
  version?: unknown;
  template_id?: unknown;
  couple?: {
    partner1_name?: unknown;
    partner2_name?: unknown;
    display_name?: unknown;
  } | null;
  event?: unknown;
  rsvp?: {
    enabled?: unknown;
  } | null;
  sections?: unknown;
  content?: unknown;
  theme?: unknown;
  meta?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isSectionShape(value: unknown): value is SiteConfigSectionShape {
  return isRecord(value);
}

export function validateSiteConfig(obj: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(obj)) {
    return { ok: false, errors: ['Site config must be an object'] };
  }

  const config = obj as SiteConfigShape;

  if (config.version !== '1') {
    errors.push('Version must be "1"');
  }

  if (!config.template_id || typeof config.template_id !== 'string') {
    errors.push('template_id is required and must be a string');
  }

  if (!config.couple || typeof config.couple !== 'object') {
    errors.push('couple is required');
  } else {
    if (!config.couple.partner1_name) errors.push('couple.partner1_name is required');
    if (!config.couple.partner2_name) errors.push('couple.partner2_name is required');
    if (!config.couple.display_name) errors.push('couple.display_name is required');
  }

  if (!config.event || typeof config.event !== 'object') {
    errors.push('event is required');
  }

  if (!config.rsvp || typeof config.rsvp !== 'object') {
    errors.push('rsvp is required');
  } else {
    if (typeof config.rsvp.enabled !== 'boolean') {
      errors.push('rsvp.enabled must be a boolean');
    }
  }

  if (!Array.isArray(config.sections)) {
    errors.push('sections must be an array');
  } else {
    config.sections.forEach((section, index) => {
      if (!isSectionShape(section)) {
        errors.push(`Section ${index}: must be an object`);
        return;
      }
      if (!section.id) errors.push(`Section ${index}: id is required`);
      if (!section.type) errors.push(`Section ${index}: type is required`);
      if (typeof section.enabled !== 'boolean') {
        errors.push(`Section ${index}: enabled must be a boolean`);
      }
      if (!section.props_key) errors.push(`Section ${index}: props_key is required`);
    });
  }

  if (!config.content || typeof config.content !== 'object') {
    errors.push('content is required and must be an object');
  }

  if (!config.theme || typeof config.theme !== 'object') {
    errors.push('theme is required');
  }

  if (!config.meta || typeof config.meta !== 'object') {
    errors.push('meta is required');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
