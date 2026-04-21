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
      satisfied: 6,
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

  it('marks court-order reference extraction missing when proof exists but no verified extracted reference fields are present', () => {
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
      reason: 'Court-order proof is in intake, but no verified case-number or signed-date extraction is represented yet.',
    });
  });

  it('marks court-order reference extraction satisfied when verified extracted reference fields exist', () => {
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
      status: 'satisfied',
      reason: 'Court-order reference extraction is present for the modeled review path.',
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
});
