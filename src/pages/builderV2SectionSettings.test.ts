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

  it('reads wedding-party side headings from structured title blocks', () => {
    const fields = buildBuilderV2SectionSettingFields('wedding-party', [
      { id: 'eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: 'Meet the crew' } },
      { id: 'bridal', type: 'title', data: { text: 'Partner One Crew', subtitle: 'bridal-title' } },
      { id: 'groom', type: 'title', data: { text: 'Partner Two Crew', subtitle: 'groom-title' } },
    ]);

    expect(fields).toEqual([
      { key: 'showTitle', label: 'Show title', kind: 'boolean', value: true },
      { key: 'eyebrow', label: 'Eyebrow', kind: 'text', value: 'Meet the crew' },
      { key: 'bridalTitle', label: 'Partner one heading', kind: 'text', value: 'Partner One Crew' },
      { key: 'groomTitle', label: 'Partner two heading', kind: 'text', value: 'Partner Two Crew' },
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
    const blocks = updateBuilderV2SectionSetting('contact', [
      { id: 'eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: 'Old' } },
    ], 'eyebrow', 'New');

    expect(blocks).toEqual([
      { id: 'eyebrow', type: 'qna', data: { question: 'Eyebrow', answer: 'New' } },
    ]);
  });

  it('creates missing settings at the front of the block list', () => {
    const blocks = updateBuilderV2SectionSetting('video', [], 'background', 'soft');
    expect(blocks[0]).toEqual({
      id: 'setting-background',
      type: 'qna',
      content: 'Background',
      data: { question: 'Background', answer: 'soft' },
    });
  });

  it('removes text settings when cleared', () => {
    const blocks = updateBuilderV2SectionSetting('video', [
      { id: 'bg', type: 'qna', data: { question: 'Background', answer: 'soft' } },
      { id: 'other', type: 'text', data: { text: 'keep' } },
    ], 'background', '');

    expect(blocks).toEqual([
      { id: 'other', type: 'text', data: { text: 'keep' } },
    ]);
  });

  it('updates and clears wedding-party side heading settings through title blocks', () => {
    const updated = updateBuilderV2SectionSetting('wedding-party', [
      { id: 'bridal', type: 'title', data: { text: 'Old Crew', subtitle: 'bridal-title' } },
      { id: 'other', type: 'photo', data: { title: 'Avery', subtitle: 'bridal-party' } },
    ], 'bridalTitle', 'Partner One Crew');

    expect(updated).toEqual([
      { id: 'bridal', type: 'title', data: { text: 'Partner One Crew', subtitle: 'bridal-title' } },
      { id: 'other', type: 'photo', data: { title: 'Avery', subtitle: 'bridal-party' } },
    ]);

    const cleared = updateBuilderV2SectionSetting('wedding-party', updated, 'bridalTitle', '');
    expect(cleared).toEqual([
      { id: 'other', type: 'photo', data: { title: 'Avery', subtitle: 'bridal-party' } },
    ]);
  });
});
