import { describe, expect, it } from 'vitest';
import { answerClarifyingQuestion, buildClarifyingAnswerPatchSet } from './aiClarifyingFlow';
import { createEmptyClarifyingPersistence } from './aiClarifyingPersistence';

describe('aiClarifyingFlow', () => {
  it('stores an answered clarifying question and builds a patch set', () => {
    const base = createEmptyClarifyingPersistence();
    base.clarifying.questions = [
      {
        id: 'guest_guidance_children_dress',
        category: 'guest_guidance',
        question: 'What should guests know about dress code and whether children are welcome?',
        expectedAnswerType: 'short_text',
        targetFields: ['faq.dressCode', 'faq.childrenPolicy'],
        affectedSections: ['faq', 'guest-guidance'],
        skippable: true,
        round: 1,
        status: 'pending',
        answer: '',
      },
    ];

    const answered = answerClarifyingQuestion(base, 'guest_guidance_children_dress', 'Black tie optional and adults only.');
    const patchSet = buildClarifyingAnswerPatchSet(answered);

    expect(answered.clarifying.questions[0].status).toBe('answered');
    expect(answered.clarifying.history).toHaveLength(1);
    expect(patchSet['faq.dressCode']).toBe('Black tie optional and adults only.');
    expect(patchSet['faq.childrenPolicy']).toBe('Black tie optional and adults only.');
  });
});
