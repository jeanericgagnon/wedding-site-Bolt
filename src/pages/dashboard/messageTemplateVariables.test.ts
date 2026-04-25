import { describe, expect, it } from 'vitest';
import { getMessageTemplateCoupleLabel } from './messageTemplateVariables';

describe('getMessageTemplateCoupleLabel', () => {
  it('keeps outbound template couple labels truthful when one persisted name is whitespace only', () => {
    expect(getMessageTemplateCoupleLabel('   ', ' Alex ')).toBe('Alex');
  });

  it('falls back cleanly when both persisted names are blank', () => {
    expect(getMessageTemplateCoupleLabel('   ', '')).toBe('our wedding');
  });
});
