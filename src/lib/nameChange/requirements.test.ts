import { describe, expect, it } from 'vitest';
import { buildNameChangeCanonicalCase } from './canonical';
import { evaluateNameChangeRequirements } from './requirements';
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
      travelBookedSoon: true,
      wantsDocumentIntakeHelp: true,
    },
    latest_plan_summary: null,
    ...overrides,
  };
}

describe('name change canonical case', () => {
  it('builds canonical names and document coverage from case input', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-marriage',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-passport',
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const canonical = buildNameChangeCanonicalCase(makeCase(), documents, extractedFields);
    expect(canonical.currentName.full).toBe('Alex Marie Rivera');
    expect(canonical.targetName.full).toBe('Alex Marie Jordan');
    expect(canonical.documents.marriage_certificate.intakeStatus).toBe('reviewed');
    expect(canonical.documents.marriage_certificate.extractedFieldKeys).toEqual(['spouse_last_name']);
    expect(canonical.documents.current_passport.intakeStatus).toBe('uploaded');
    expect(canonical.documents.current_passport.extractedFieldKeys).toEqual(['issuance_date']);
    expect(canonical.lifeContext.travelBookedSoon).toBe(true);
  });
});

describe('name change requirements skeleton', () => {
  it('marks core requirements satisfied/attention/missing from canonical case truth', () => {
    const documents: NameChangeDocumentInput[] = [
      {
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
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];

    const snapshot = evaluateNameChangeRequirements(makeCase(), documents, []);
    expect(snapshot.summary).toEqual({
      satisfied: 13,
      missing: 0,
      attention: 1,
    });
    expect(snapshot.results.find((result) => result.key === 'passport-timing-risk')).toMatchObject({ status: 'attention' });
  });

  it('downgrades legal proof and identity coverage when metadata is too thin for downstream use', () => {
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

    const snapshot = evaluateNameChangeRequirements(makeCase(), documents, []);
    expect(snapshot.results.find((result) => result.key === 'legal-proof-document')).toMatchObject({
      status: 'attention',
      reason: 'The marriage certificate is reviewed, but metadata is still missing: masked filename, issuing authority, issued date, extraction confidence.',
    });
    expect(snapshot.results.find((result) => result.key === 'identity-document-coverage')).toMatchObject({
      status: 'attention',
      reason: 'Identity documents exist in intake, but metadata is still too thin for confident downstream use.',
    });
  });

  it('treats reviewed legal proof as execution-ready when verified extraction stays linked through a canonical upload alias', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'reviewed-marriage-123',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'San Diego County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'uploads/marriage certificate.pdf?download=1',
        field_key: 'certificate_number',
        field_label: 'Certificate number',
        field_value_masked: 'MC-123',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = evaluateNameChangeRequirements(makeCase(), documents, extractedFields);
    expect(snapshot.results.find((result) => result.key === 'legal-proof-document')).toMatchObject({
      status: 'satisfied',
    });
  });

  it('flags missing legal proof and identity coverage when intake is thin', () => {
    const snapshot = evaluateNameChangeRequirements(makeCase({ county_residence: null, marriage_state: null }), [], []);
    expect(snapshot.results.find((result) => result.key === 'legal-proof-document')).toMatchObject({ status: 'missing' });
    expect(snapshot.results.find((result) => result.key === 'identity-document-coverage')).toMatchObject({ status: 'missing' });
    expect(snapshot.results.find((result) => result.key === 'county-context')).toMatchObject({ status: 'missing' });
  });

  it('escalates passport timing risk to missing when travel is booked soon but travel identity support is missing', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];

    const snapshot = evaluateNameChangeRequirements(makeCase(), documents, []);
    expect(snapshot.results.find((result) => result.key === 'passport-timing-risk')).toMatchObject({
      status: 'missing',
      reason: 'Travel is already booked, but no current passport or Real ID support is represented in intake yet.',
    });
  });

  it('flags expedited travel sequencing when urgent travel needs the fast path', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];

    const snapshot = evaluateNameChangeRequirements(
      makeCase({ urgency_level: 'expedited' }),
      documents,
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'expedited-travel-sequencing')).toMatchObject({
      status: 'attention',
      reason: 'This is an expedited travel case, so passport/TSA sequencing should be treated as an active fast-path, not routine follow-through.',
    });
  });

  it('marks passport eligibility path missing for non-citizen passport follow-through', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];

    const snapshot = evaluateNameChangeRequirements(
      makeCase({ is_us_citizen: false }),
      documents,
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'passport-eligibility-path')).toMatchObject({
      status: 'missing',
      reason: 'Current passport follow-through is not modeled for non-citizen or passport-ineligible cases yet.',
    });
  });

  it('marks launch state alignment missing when the modeled downstream state path is not California', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ launch_state: 'texas' as never }),
      [],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'launch-state-alignment')).toMatchObject({
      status: 'missing',
      reason: 'Current modeled downstream state execution assumes California, but launch state is texas.',
    });
  });

  it('marks legal-basis path alignment missing when the case is not marriage-based', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'legal-basis-path-alignment')).toMatchObject({
      status: 'missing',
      reason: 'Current guided execution slices are modeled for marriage-based name changes, but legal basis is court_order.',
    });
  });

  it('marks court-order path readiness missing when no court-order proof is represented', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-path-readiness')).toMatchObject({
      status: 'missing',
      reason: 'Court-order path is selected, but no court-order proof is represented in intake yet.',
    });
  });

  it('marks court-order path readiness as attention once proof and identity coverage exist', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
        {
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
      ],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-path-readiness')).toMatchObject({
      status: 'attention',
      reason: 'Court-order proof exists and identity coverage is present, but downstream court-order execution slices are still not fully modeled.',
    });
  });

  it('marks court-order jurisdiction context missing when county context is absent', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never, county_residence: null }),
      [],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-jurisdiction-context')).toMatchObject({
      status: 'missing',
      reason: 'County context is still missing, so court-order jurisdiction review cannot be grounded yet.',
    });
  });

  it('marks court-order reference extraction missing when proof exists but no verified extracted target-name or reference fields are present', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
        {
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
      ],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'missing',
      reason: 'Court-order proof is in intake, but no verified target-name or case-reference extraction is represented yet.',
    });
  });

  it('marks court-order reference extraction satisfied when reviewed proof carries verified target legal name plus case number and signed date', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
        {
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'Alex',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'last_name',
          field_label: 'Last name',
          field_value_masked: 'Jordan',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'case_number',
          field_label: 'Case number',
          field_value_masked: '24-CV-1188',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'court_order_date',
          field_label: 'Court order date',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'satisfied',
      reason: 'Court-order target legal name and case reference extraction are present for the modeled review path.',
    });
  });

  it('marks court-order reference extraction attention when proof is uploaded but not reviewed yet', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'Alex',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'last_name',
          field_label: 'Last name',
          field_value_masked: 'Jordan',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'case_number',
          field_label: 'Case number',
          field_value_masked: '24-CV-1188',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'court_order_date',
          field_label: 'Court order date',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'attention',
      reason: 'Court-order extraction exists, but the proof document still needs review before downstream use is grounded.',
    });
  });

  it('marks court-order reference extraction attention when target legal name and case number are grounded but signed date is still missing', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'Alex',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'last_name',
          field_label: 'Last name',
          field_value_masked: 'Jordan',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'case_number',
          field_label: 'Case number',
          field_value_masked: '24-CV-1188',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'attention',
      reason: 'Court-order target legal name and case number are verified, but the signed date still needs grounded extraction before downstream use is fully trusted.',
    });
  });

  it('marks court-order reference extraction attention when target legal name and signed date are grounded but case number is still missing', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'Alex',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'last_name',
          field_label: 'Last name',
          field_value_masked: 'Jordan',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-court-order',
          field_key: 'court_order_date',
          field_label: 'Court order date',
          field_value_masked: '2026-04-05',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'attention',
      reason: 'Court-order target legal name and signed date are verified, but the case number still needs grounded extraction before downstream use is fully trusted.',
    });
  });

  it('keeps court-order reference extraction missing when an unlinked extract claims a case number', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
        {
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
      ],
      [
        {
          field_key: 'case_number',
          field_label: 'Case number',
          field_value_masked: '24-CV-1188',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'missing',
      reason: 'Court-order proof is in intake, but no verified target-name or case-reference extraction is represented yet.',
    });
  });

  it('keeps court-order reference extraction missing when only manual fallback reference values exist', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [
        {
          field_key: 'case #',
          field_label: 'Case #',
          field_value_masked: '24-cv - 1188',
          source_type: 'manual',
          is_verified: true,
        },
        {
          field_key: 'signed dt',
          field_label: 'Signed dt',
          field_value_masked: 'Executed on Friday, April 5, 2026 1:30 PM PST',
          source_type: 'manual',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'missing',
      reason: 'Court-order proof is in intake, but no verified target-name or case-reference extraction is represented yet.',
    });
  });

  it('marks court-order reference extraction attention when only target last name is verified', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'last_name',
          field_label: 'Last name',
          field_value_masked: 'Jordan',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'attention',
      reason: 'Court-order target last name is verified, but the target first name still needs grounded extraction before downstream use is fully trusted.',
    });
  });

  it('does not escalate canonical extraction alignment from unverified extracted values alone', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase(),
      [
        {
          id: 'doc-passport',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [
        {
          document_id: 'doc-passport',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'Alicia',
          source_type: 'document_extract',
          is_verified: false,
        },
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'canonical-extraction-alignment')).toMatchObject({
      status: 'satisfied',
      reason: 'Structured case truth and extracted document values are aligned across the currently modeled fields.',
    });
  });

  it('marks court-order reference extraction attention when linked target-name data exists but is still unverified', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          id: 'doc-court-order',
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
        {
          document_kind: 'current_drivers_license',
          display_name: 'Driver license',
          storage_mode: 'metadata_only',
          intake_status: 'uploaded',
        },
      ],
      [
        {
          document_id: 'doc-court-order',
          field_key: 'first_name',
          field_label: 'First name',
          field_value_masked: 'Alex',
          source_type: 'document_extract',
          is_verified: false,
        },
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'attention',
      reason: 'Court-order reference data exists, but it is still unverified so downstream use is not grounded yet.',
    });
  });

  it('requires a marriage certificate when the legal basis is marriage', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase(),
      [
        {
          document_kind: 'court_order_name_change',
          display_name: 'Court order',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'legal-proof-document')).toMatchObject({
      status: 'missing',
      reason: 'No marriage certificate is represented in intake yet for the modeled legal basis.',
    });
  });

  it('requires a court order when the legal basis is court order', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ legal_basis: 'court_order' as never }),
      [
        {
          document_kind: 'marriage_certificate',
          display_name: 'Marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'legal-proof-document')).toMatchObject({
      status: 'missing',
      reason: 'No court-order proof is represented in intake yet for the modeled legal basis.',
    });
  });

  it('flags out-of-state marriage handling as attention when California launch has the certificate in intake', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ marriage_state: 'Nevada' }),
      [
        {
          document_kind: 'marriage_certificate',
          display_name: 'Marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'marriage-jurisdiction-alignment')).toMatchObject({
      status: 'attention',
      reason: 'Marriage occurred in Nevada, so california follow-through should expect out-of-state certificate handling.',
    });
  });

  it('blocks out-of-state marriage handling when the certificate is not represented in intake', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ marriage_state: 'Nevada' }),
      [],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'marriage-jurisdiction-alignment')).toMatchObject({
      status: 'missing',
      reason: 'Marriage occurred in Nevada, but no marriage certificate is represented in intake for out-of-state certificate handling.',
    });
  });

  it('requires grounded certificate reference fields for out-of-state marriage follow-through', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ marriage_state: 'Nevada' }),
      [
        {
          id: 'doc-marriage',
          document_kind: 'marriage_certificate',
          display_name: 'Marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [],
    );

    expect(snapshot.results.find((result) => result.key === 'out-of-state-marriage-certificate-grounding')).toMatchObject({
      status: 'missing',
      reason: 'Marriage certificate is present, but no grounded county or certificate-number extraction is represented yet for out-of-state follow-through.',
    });
  });

  it('satisfies out-of-state marriage certificate grounding once county and certificate number are verified on the certificate', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase({ marriage_state: 'Nevada' }),
      [
        {
          id: 'doc-marriage',
          document_kind: 'marriage_certificate',
          display_name: 'Marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [
        {
          document_id: 'doc-marriage',
          field_key: 'county',
          field_label: 'County',
          field_value_masked: 'Clark',
          source_type: 'document_extract',
          is_verified: true,
        },
        {
          document_id: 'doc-marriage',
          field_key: 'certificate_number',
          field_label: 'Certificate number',
          field_value_masked: 'MC-123',
          source_type: 'document_extract',
          is_verified: true,
        },
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'out-of-state-marriage-certificate-grounding')).toMatchObject({
      status: 'satisfied',
      reason: 'Verified marriage-certificate county and certificate-number extraction are present for out-of-state follow-through.',
    });
  });

  it('flags canonical/extraction conflicts as attention instead of silently trusting them', () => {
    const snapshot = evaluateNameChangeRequirements(
      makeCase(),
      [
        {
          id: 'doc-marriage',
          document_kind: 'marriage_certificate',
          display_name: 'Marriage certificate',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
        {
          id: 'doc-passport',
          document_kind: 'current_passport',
          display_name: 'Passport',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
        },
      ],
      [
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
      ],
    );

    expect(snapshot.results.find((result) => result.key === 'canonical-extraction-alignment')).toMatchObject({
      status: 'attention',
      reason: 'Structured case truth conflicts with extracted document values in 2 places: Current first name vs passport extraction, Target last name vs marriage certificate spouse surname.',
    });
  });
});
