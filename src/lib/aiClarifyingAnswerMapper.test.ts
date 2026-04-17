import { describe, expect, it } from 'vitest';
import { mapClarifyingAnswerToFieldPatch, mergeClarifyingFieldPatches } from './aiClarifyingAnswerMapper';

describe('aiClarifyingAnswerMapper', () => {
  it('maps a stored clarifying answer into field patches', () => {
    const patch = mapClarifyingAnswerToFieldPatch({
      id: 'guest_guidance_children_dress',
      category: 'guest_guidance',
      question: 'What should guests know about dress code and whether children are welcome?',
      expectedAnswerType: 'short_text',
      targetFields: ['faq.dressCode', 'faq.childrenPolicy'],
      affectedSections: ['faq', 'guest-guidance'],
      skippable: true,
      round: 1,
      status: 'answered',
      answer: 'Black tie optional and adults only.',
    });

    expect(patch['faq.dressCode']).toBe('Black tie optional and adults only.');
    expect(patch['faq.childrenPolicy']).toBe('Black tie optional and adults only.');
  });

  it('merges multiple field patches', () => {
    const merged = mergeClarifyingFieldPatches([
      { 'faq.dressCode': 'Black tie optional' },
      { 'travel.transport': 'Shuttle from hotel' },
    ]);

    expect(merged['faq.dressCode']).toBe('Black tie optional');
    expect(merged['travel.transport']).toBe('Shuttle from hotel');
  });
});
