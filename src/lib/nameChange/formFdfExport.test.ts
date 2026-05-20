import { describe, expect, it } from 'vitest';
import { buildNameChangeFdfExportPlan, buildNameChangeFdfText } from './formFdfExport';
import type { NameChangePopulationDraftPlan } from './formPopulationDraft';

const readyDraftPlan: NameChangePopulationDraftPlan = {
  primaryAction: 'Generate review-only PDF draft payloads.',
  draftPayloadJson: '{}',
  summary: {
    totalForms: 1,
    readyDrafts: 1,
    blockedDrafts: 0,
    guidedOnline: 0,
    assignments: 1,
    blockedFields: 0,
  },
  items: [
    {
      formCode: 'SSA-SS5',
      formLabel: 'SS-5',
      officialRevisionLabel: 'Form SS-5 (12-2024) UF',
      status: 'ready',
      statusLabel: 'Draft payload ready',
      assignments: [
        {
          fieldKey: 'applicant.newLastName',
          officialFieldLabel: 'New last name',
          pdfFieldName: 'Last(Name)\\Field',
          value: 'Jordan',
          source: 'saved_value',
          redactionPolicy: 'none',
        },
      ],
      blockers: [],
      nextAction: 'Generate draft.',
    },
  ],
};

describe('name change FDF export', () => {
  it('exports ready draft assignments as FDF text', () => {
    const plan = buildNameChangeFdfExportPlan(readyDraftPlan);

    expect(plan.summary).toMatchObject({
      readyFdfFiles: 1,
      assignments: 1,
    });
    expect(plan.items[0]).toMatchObject({
      status: 'ready',
      fdfFileName: 'dayof-ssa-ss5-form-ss-5-12-2024-uf.fdf',
      assignmentCount: 1,
    });
    expect(plan.items[0].fdfText).toContain('/T (Last\\(Name\\)\\\\Field)');
    expect(plan.items[0].fdfText).toContain('/V (Jordan)');
    expect(plan.items[0].fillCommandTemplate).toContain('pdftk OFFICIAL_SSA-SS5.pdf fill_form');
  });

  it('escapes PDF literal values in field names and values', () => {
    const fdfText = buildNameChangeFdfText([
      {
        pdfFieldName: 'Line(One)',
        value: 'A\\B\nC',
      },
    ]);

    expect(fdfText).toContain('/T (Line\\(One\\))');
    expect(fdfText).toContain('/V (A\\\\B\\nC)');
  });

  it('does not emit FDF text for blocked sensitive drafts', () => {
    const blockedPlan: NameChangePopulationDraftPlan = {
      ...readyDraftPlan,
      summary: {
        totalForms: 1,
        readyDrafts: 0,
        blockedDrafts: 1,
        guidedOnline: 0,
        assignments: 0,
        blockedFields: 1,
      },
      items: [
        {
          ...readyDraftPlan.items[0],
          status: 'blocked',
          statusLabel: 'Blocked',
          assignments: [],
          blockers: [
            {
              fieldKey: 'supplemental.dateOfBirth',
              officialFieldLabel: 'Date of birth',
              reason: 'Date of birth requires explicit consent before the saved sensitive value can be placed into a draft.',
            },
          ],
        },
      ],
    };

    const plan = buildNameChangeFdfExportPlan(blockedPlan);

    expect(plan.summary).toMatchObject({
      readyFdfFiles: 0,
      blockedForms: 1,
    });
    expect(plan.items[0]).toMatchObject({
      status: 'blocked',
      fdfText: null,
      fdfFileName: null,
    });
    expect(plan.exportPayloadJson).not.toContain('1994-08-14');
  });
});
