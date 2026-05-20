import { describe, expect, it } from 'vitest';
import type { NameChangeFdfExportPlan } from './formFdfExport';
import { buildNameChangePdfReviewPacketPlan } from './formPdfReviewPacket';
import type { NameChangePopulationDraftPlan } from './formPopulationDraft';
import type { NameChangeFormPopulationPlan } from './formPopulationPlan';

const populationPlan: NameChangeFormPopulationPlan = {
  primaryAction: 'Generate review-only draft outputs.',
  populationPayloadJson: '{}',
  summary: {
    totalForms: 1,
    readyForPopulation: 1,
    needsAdapterMapping: 0,
    guidedOnline: 0,
    needsInput: 0,
    needsSecureSession: 0,
    pdfFillCandidates: 1,
  },
  items: [
    {
      formCode: 'SSA-SS5',
      formLabel: 'SS-5',
      officialUrl: 'https://www.ssa.gov/forms/ss-5.pdf',
      officialRevisionLabel: 'Form SS-5 (12-2024) UF',
      adapterKind: 'official_pdf_fill',
      status: 'ready_for_population',
      statusLabel: 'Ready for population',
      nextAction: 'Generate review-only draft.',
      blockers: [],
      fieldMappings: [],
    },
  ],
};

const draftPlan: NameChangePopulationDraftPlan = {
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
          pdfFieldName: 'LastName',
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

const fdfExportPlan: NameChangeFdfExportPlan = {
  primaryAction: 'Export FDF field data.',
  exportPayloadJson: '{}',
  summary: {
    totalForms: 1,
    readyFdfFiles: 1,
    blockedForms: 0,
    guidedOnline: 0,
    assignments: 1,
  },
  items: [
    {
      formCode: 'SSA-SS5',
      formLabel: 'SS-5',
      officialRevisionLabel: 'Form SS-5 (12-2024) UF',
      status: 'ready',
      statusLabel: 'FDF ready',
      fdfFileName: 'dayof-ssa-ss5-form-ss-5-12-2024-uf.fdf',
      fdfText: '%FDF-1.2',
      fillCommandTemplate: 'pdftk OFFICIAL_SSA-SS5.pdf fill_form dayof-ssa-ss5-form-ss-5-12-2024-uf.fdf output REVIEW_DRAFT_SSA-SS5.pdf flatten',
      assignmentCount: 1,
      blockerCount: 0,
      nextAction: 'Use this FDF with the official downloaded PDF.',
    },
  ],
};

describe('name change PDF review packet', () => {
  it('creates field-level review instructions for safe ready drafts', () => {
    const plan = buildNameChangePdfReviewPacketPlan(populationPlan, draftPlan, fdfExportPlan);

    expect(plan.summary).toMatchObject({
      readyPackets: 1,
      fieldInstructions: 1,
      fieldReviewSteps: 3,
      reviewChecks: 5,
    });
    expect(plan.items[0]).toMatchObject({
      status: 'ready_for_review',
      officialUrl: 'https://www.ssa.gov/forms/ss-5.pdf',
      fdfFileName: 'dayof-ssa-ss5-form-ss-5-12-2024-uf.fdf',
    });
    expect(plan.items[0].fieldInstructions[0]).toMatchObject({
      fieldKey: 'applicant.newLastName',
      officialFieldLabel: 'New last name',
      pdfFieldName: 'LastName',
      value: 'Jordan',
      copyInstruction: 'Put "Jordan" into PDF field "LastName" for New last name.',
    });
    expect(plan.items[0].fieldInstructions[0].reviewSteps).toHaveLength(3);
    expect(plan.items[0].reviewChecklist[1]).toContain('Form SS-5 (12-2024) UF');
  });

  it('keeps blocked sensitive fields out of the review packet payload', () => {
    const blockedDraftPlan: NameChangePopulationDraftPlan = {
      ...draftPlan,
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
          ...draftPlan.items[0],
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

    const plan = buildNameChangePdfReviewPacketPlan(populationPlan, blockedDraftPlan, fdfExportPlan);

    expect(plan.summary).toMatchObject({
      readyPackets: 0,
      blockedPackets: 1,
      fieldInstructions: 0,
    });
    expect(plan.items[0].fieldInstructions).toEqual([]);
    expect(plan.items[0].nextAction).toContain('Date of birth requires explicit consent');
    expect(plan.packetJson).not.toContain('1994-08-14');
  });

  it('creates guided online review steps without FDF output', () => {
    const guidedPopulationPlan: NameChangeFormPopulationPlan = {
      ...populationPlan,
      summary: {
        totalForms: 1,
        readyForPopulation: 0,
        needsAdapterMapping: 0,
        guidedOnline: 1,
        needsInput: 0,
        needsSecureSession: 0,
        pdfFillCandidates: 0,
      },
      items: [
        {
          ...populationPlan.items[0],
          formCode: 'CA-DL-44',
          formLabel: 'California Driver License update',
          officialUrl: 'https://www.dmv.ca.gov/',
          adapterKind: 'guided_online_entry',
          status: 'guided_online',
          statusLabel: 'Guided online',
        },
      ],
    };
    const guidedDraftPlan: NameChangePopulationDraftPlan = {
      ...draftPlan,
      summary: {
        totalForms: 1,
        readyDrafts: 0,
        blockedDrafts: 0,
        guidedOnline: 1,
        assignments: 0,
        blockedFields: 0,
      },
      items: [
        {
          ...draftPlan.items[0],
          formCode: 'CA-DL-44',
          formLabel: 'California Driver License update',
          status: 'guided_online',
          statusLabel: 'Guided online',
          assignments: [],
          nextAction: 'Use guided copy support.',
        },
      ],
    };

    const plan = buildNameChangePdfReviewPacketPlan(guidedPopulationPlan, guidedDraftPlan, fdfExportPlan);

    expect(plan.summary).toMatchObject({
      readyPackets: 0,
      guidedOnline: 1,
    });
    expect(plan.items[0]).toMatchObject({
      status: 'guided_online',
      fdfFileName: null,
      fieldInstructions: [],
    });
    expect(plan.items[0].reviewChecklist[0]).toContain('https://www.dmv.ca.gov/');
  });
});
