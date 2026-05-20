import { describe, expect, it } from 'vitest';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { buildNameChangeDocumentRepairQueue } from './documentRepairQueue';
import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput } from './types';

function makeCase(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    workflow_status: 'draft',
    launch_state: 'california',
    legal_basis: 'marriage',
    current_first_name: 'Alex',
    current_middle_name: 'Marie',
    current_last_name: 'Rivera',
    target_first_name: 'Alex',
    target_middle_name: 'Marie',
    target_last_name: 'Jordan',
    email: null,
    phone_last4: null,
    county_residence: 'San Diego',
    marriage_state: 'California',
    marriage_date: '2026-04-05',
    urgency_level: 'standard',
    has_us_passport: true,
    passport_needs_update: true,
    has_real_id_license: true,
    is_us_citizen: true,
    employment_status: 'employed',
    change_reasons: ['marriage'],
    structured_intake: {
      spouseLastName: 'Jordan',
      travelBookedSoon: false,
      wantsDocumentIntakeHelp: true,
    },
    latest_plan_summary: null,
    ...overrides,
  };
}

describe('name change document repair queue', () => {
  it('prioritizes required docs with thin metadata and linked blocking field risks', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: 'passport-•••.pdf',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan-Smith',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const intake = buildNameChangeDocumentIntakeSnapshot(makeCase(), documents, extractedFields);
    const snapshots = [
      buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, extractedFields),
      buildNameChangeTargetExecutionSnapshot('passport', makeCase(), documents, extractedFields),
    ];

    const queue = buildNameChangeDocumentRepairQueue(intake, snapshots);
    const marriageCertificateItem = queue.find((item) => item.kind === 'marriage_certificate');
    expect(marriageCertificateItem).toMatchObject({
      kind: 'marriage_certificate',
      severity: 'blocking',
    });
    expect(marriageCertificateItem?.impactSummary).toContain('metadata gaps');
    expect(marriageCertificateItem?.payoffSummary).toContain('removes');
    expect(marriageCertificateItem?.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'document',
        label: expect.stringContaining('Fill metadata'),
      }),
      expect.objectContaining({
        category: 'document',
        label: 'Capture county + certificate number + issuing authority for certified marriage certificate',
      }),
    ]));
  });

  it('surfaces required not-started docs even before field lineage exists', () => {
    const intake = buildNameChangeDocumentIntakeSnapshot(makeCase(), [], []);
    const queue = buildNameChangeDocumentRepairQueue(intake, [
      buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), [], []),
    ]);

    expect(queue).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'marriage_certificate',
        severity: 'blocking',
        intakeStatus: 'not_started',
        payoffSummary: expect.stringContaining('restores a missing required artifact'),
        nextActions: expect.arrayContaining([
          expect.objectContaining({
            category: 'document',
            label: 'Add certified marriage certificate to intake',
          }),
        ]),
      }),
    ]));
  });

  it('uses guided-action urgency to break close repair-score ties', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: 'passport-•••.pdf',
      },
      {
        document_kind: 'proof_of_address',
        display_name: 'Proof of address',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];

    const intake = buildNameChangeDocumentIntakeSnapshot(makeCase(), documents, []);
    const queue = buildNameChangeDocumentRepairQueue(intake, []);
    expect(queue[0]?.score).toBeGreaterThanOrEqual(queue[1]?.score ?? 0);
    expect(queue[0]?.nextActions[0]?.category).toBeDefined();
  });

  it('prioritizes canonical-conflict repair on the source document', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'San Diego County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
      {
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-marriage',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan-Smith',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-passport',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alicia',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const intake = buildNameChangeDocumentIntakeSnapshot(makeCase(), documents, extractedFields);
    const queue = buildNameChangeDocumentRepairQueue(intake, [
      buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, extractedFields),
    ]);

    expect(queue).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'marriage_certificate',
        canonicalConflictCount: 1,
        impactSummary: expect.stringContaining('canonical conflict'),
        payoffSummary: expect.stringContaining('resolves 1 canonical conflict'),
        nextActions: expect.arrayContaining([
          expect.objectContaining({
            category: 'document',
            label: 'Resolve canonical conflicts for certified marriage certificate',
          }),
        ]),
      }),
      expect.objectContaining({
        kind: 'current_passport',
        canonicalConflictCount: 1,
      }),
    ]));
  });

  it('gives a concrete out-of-state marriage certificate grounding repair action', () => {
    const profile = makeCase({ marriage_state: 'Nevada' });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'Clark County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
    ];

    const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, []);
    const queue = buildNameChangeDocumentRepairQueue(intake, [
      buildNameChangeTargetExecutionSnapshot('passport', profile, documents, []),
    ]);

    const marriageCertificateItem = queue.find((item) => item.kind === 'marriage_certificate');
    expect(marriageCertificateItem).toMatchObject({
      kind: 'marriage_certificate',
      impactedTargets: ['U.S. Passport'],
      payoffSummary: 'removes 6 document gaps · helps 1 target',
    });
    expect(marriageCertificateItem?.missingExtractionFields).toEqual(expect.arrayContaining(['county', 'certificate_number']));
    expect(marriageCertificateItem?.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'document',
        label: 'Capture county + certificate number for certified marriage certificate',
        detail: 'Out-of-state marriage follow-through needs grounded county and certificate-number extraction from the marriage certificate.',
      }),
    ]));
    expect(marriageCertificateItem?.nextActions[0]).toMatchObject({
      category: 'document',
      label: 'Capture county + certificate number for certified marriage certificate',
      documentKind: 'marriage_certificate',
    });
  });

  it('narrows marriage certificate repair action when only one out-of-state reference field is missing', () => {
    const profile = makeCase({ marriage_state: 'Nevada' });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'Clark County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-marriage',
        field_key: 'certificate_number',
        field_label: 'Certificate number',
        field_value_masked: 'MC-123',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, extractedFields);
    const queue = buildNameChangeDocumentRepairQueue(intake, [
      buildNameChangeTargetExecutionSnapshot('tsa', profile, documents, extractedFields),
    ]);

    const marriageCertificateItem = queue.find((item) => item.kind === 'marriage_certificate');
    expect(marriageCertificateItem).toMatchObject({
      kind: 'marriage_certificate',
      impactedTargets: ['TSA PreCheck / travel profiles'],
      payoffSummary: 'removes 5 document gaps · helps 1 target',
    });
    expect(marriageCertificateItem?.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'document',
        label: 'Capture county for certified marriage certificate',
        detail: 'Out-of-state marriage follow-through still needs grounded county extraction from the marriage certificate.',
      }),
    ]));
    expect(marriageCertificateItem?.nextActions[0]).toMatchObject({
      category: 'document',
      label: 'Capture county for certified marriage certificate',
      documentKind: 'marriage_certificate',
    });
  });

  it('pulls issuing authority into the top repair action when out-of-state marriage proof is still missing it', () => {
    const profile = makeCase({ marriage_state: 'Nevada' });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
    ];

    const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, []);
    const queue = buildNameChangeDocumentRepairQueue(intake, [
      buildNameChangeTargetExecutionSnapshot('passport', profile, documents, []),
    ]);

    const marriageCertificateItem = queue.find((item) => item.kind === 'marriage_certificate');
    expect(marriageCertificateItem?.nextActions[0]).toMatchObject({
      category: 'document',
      label: 'Capture county + certificate number + issuing authority for certified marriage certificate',
      detail: 'Out-of-state marriage follow-through needs grounded county, certificate-number extraction, and issuing-authority metadata from the marriage certificate.',
      documentKind: 'marriage_certificate',
    });
  });
});
