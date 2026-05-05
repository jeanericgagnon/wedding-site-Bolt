import { describe, expect, it } from 'vitest';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import itJson from './it.json';
import de from './de.json';
import pt from './pt.json';

const resources = { en, es, fr, it: itJson, de, pt };

const flattenKeys = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key));
};

describe('i18n resources', () => {
  it('keeps guest-facing language packs aligned with English keys', () => {
    const expectedKeys = flattenKeys(en).sort();

    Object.entries(resources).forEach(([language, resource]) => {
      expect(flattenKeys(resource).sort(), language).toEqual(expectedKeys);
    });
  });

  it('keeps upload access wording guest-facing instead of technical', () => {
    Object.entries(resources).forEach(([language, resource]) => {
      const upload = resource.photo_upload;
      expect(upload.token_label.toLowerCase(), language).not.toContain('token');
      expect(upload.token_placeholder.toLowerCase(), language).not.toContain('token');
      expect(upload.token_required.toLowerCase(), language).not.toContain('token');
    });
  });
});
