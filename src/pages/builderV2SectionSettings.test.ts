import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2SectionSettingFields,
  getBuilderV2NamedSettingBoolean,
  getBuilderV2NamedSettingValue,
  updateBuilderV2SectionSetting,
} from './builderV2SectionSettings';

describe('builderV2SectionSettings', () => {
  it('reads section setting fields for long-tail sections', () => {
    const fields = buildBuilderV2SectionSettingFields('music', [
      { id: 'eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: 'The Soundtrack' } },
      { id: 'request', type: 'qna', data: { question: 'Show request note', answer: 'false' } },
    ]);

    expect(fields).toEqual([
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text', value: 'The Soundtrack' },
      { key: 'showRequestNote', label: 'Show request note', kind: 'boolean', value: false },
    ]);
  });

  it('defaults missing boolean settings to true', () => {
    const fields = buildBuilderV2SectionSettingFields('dress-code', []);
    expect(fields.find((field) => field.key === 'showTitle')?.value).toBe(true);
  });

  it('can read named values and booleans directly', () => {
    const blocks = [
      { id: 'one', type: 'qna', data: { question: 'Eyebrow', answer: 'Need help?' } },
      { id: 'two', type: 'qna', data: { question: 'Show title', answer: 'false' } },
    ];

    expect(getBuilderV2NamedSettingValue(blocks, 'Eyebrow')).toBe('Need help?');
    expect(getBuilderV2NamedSettingBoolean(blocks, 'Show title')).toBe(false);
  });

  it('upserts existing settings in place', () => {
    const blocks = updateBuilderV2SectionSetting([
      { id: 'eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: 'Old' } },
    ], 'Eyebrow', 'New');

    expect(blocks).toEqual([
      { id: 'eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: 'New' } },
    ]);
  });

  it('creates missing settings at the front of the block list', () => {
    const blocks = updateBuilderV2SectionSetting([], 'Background', 'soft');
    expect(blocks[0]).toEqual({
      id: 'setting-background',
      type: 'qna',
      content: 'Background',
      data: { question: 'Background', answer: 'soft' },
    });
  });

  it('removes text settings when cleared', () => {
    const blocks = updateBuilderV2SectionSetting([
      { id: 'bg', type: 'qna', data: { question: 'Background', answer: 'soft' } },
      { id: 'other', type: 'text', data: { text: 'keep' } },
    ], 'Background', '');

    expect(blocks).toEqual([
      { id: 'other', type: 'text', data: { text: 'keep' } },
    ]);
  });
});
