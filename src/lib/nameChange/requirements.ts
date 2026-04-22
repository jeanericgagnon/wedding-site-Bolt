import { buildNameChangeCanonicalCase } from './canonical';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { buildNameChangeExtractionContractSnapshot, hasAnyDocumentLinkedFieldValue, hasVerifiedDocumentLinkedFieldValue } from './extractionContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeDocumentKind,
  NameChangeExtractedFieldInput,
  NameChangeRequirementDefinition,
  NameChangeRequirementResult,
  NameChangeRequirementSnapshot,
} from './types';

export const NAME_CHANGE_REQUIREMENT_DEFINITIONS: NameChangeRequirementDefinition[] = [
  {
    key: 'legal-proof-document',
    label: 'Legal proof document on file',
    stage: 'proof',
    description: 'The correct legal proof document should exist before government updates move.',
  },
  {
    key: 'identity-document-coverage',
    label: 'Identity document coverage',
    stage: 'identity',
    description: 'At least one current identity document should be in the intake workspace.',
  },
  {
    key: 'county-context',
    label: 'County / jurisdiction context',
    stage: 'government',
    description: 'County and state context should exist before local sequencing is treated as reliable.',
  },
  {
    key: 'launch-state-alignment',
    label: 'Launch-state alignment',
    stage: 'government',
    description: 'Downstream state-specific execution should stay aligned with the currently modeled launch state.',
  },
  {
    key: 'marriage-jurisdiction-alignment',
    label: 'Marriage jurisdiction alignment',
    stage: 'government',
    description: 'California-modeled marriage follow-through should acknowledge when the marriage certificate comes from another state.',
  },
  {
    key: 'legal-basis-path-alignment',
    label: 'Legal-basis path alignment',
    stage: 'government',
    description: 'The currently modeled guided execution path should stay honest about whether it is marriage-based or court-order-based.',
  },
  {
    key: 'court-order-path-readiness',
    label: 'Court-order path readiness',
    stage: 'government',
    description: 'Court-order cases should expose whether proof and identity support are present for grounded review.',
  },
  {
    key: 'court-order-jurisdiction-context',
    label: 'Court-order jurisdiction context',
    stage: 'government',
    description: 'Court-order review needs county context before jurisdiction guidance is treated as grounded.',
  },
  {
    key: 'court-order-reference-extraction',
    label: 'Court-order reference extraction',
    stage: 'proof',
    description: 'Court-order review should have a verified case number or signed-date extraction before downstream use is treated as grounded.',
  },
  {
    key: 'passport-timing-risk',
    label: 'Passport timing risk reviewed',
    stage: 'institutional',
    description: 'Travel-facing passport timing should be reviewed when passport updates are relevant.',
  },
  {
    key: 'canonical-extraction-alignment',
    label: 'Canonical vs extracted values aligned',
    stage: 'proof',
    description: 'Structured case truth should not quietly disagree with extracted document values that downstream packets rely on.',
  },
];

export function evaluateNameChangeRequirements(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeRequirementSnapshot {
  const canonicalCase = buildNameChangeCanonicalCase(profile, documents, extractedFields);
  const intakeSnapshot = buildNameChangeDocumentIntakeSnapshot(profile, documents, extractedFields);
  const extractionSnapshot = buildNameChangeExtractionContractSnapshot(profile, documents, extractedFields);
  const legalProofKind = canonicalCase.legalBasis === 'marriage' ? 'marriage_certificate' : 'court_order';
  const legalProof = canonicalCase.documents[legalProofKind];
  const legalProofContract = intakeSnapshot.documents.find((document) => document.kind === legalProofKind);
  const identityCoverageKinds: NameChangeDocumentKind[] = ['current_drivers_license', 'current_passport', 'social_security_card'];
  const hasIdentityCoverage = identityCoverageKinds.some((kind) => canonicalCase.documents[kind].intakeStatus !== 'not_started');
  const hasIdentityMetadataReady = intakeSnapshot.documents.some((document) => identityCoverageKinds.includes(document.kind) && document.metadataMissing.length === 0 && document.intakeStatus !== 'not_started');
  const hasTravelIdentitySupport = ['current_passport', 'current_drivers_license'].some((kind) => canonicalCase.documents[kind as NameChangeDocumentKind].intakeStatus !== 'not_started');
  const hasCourtOrderProof = canonicalCase.documents.court_order.intakeStatus !== 'not_started';
  const hasAnyCourtOrderReferenceExtraction = hasAnyDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'case_number')
    || hasAnyDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'court_order_date');
  const hasVerifiedCourtOrderReferenceExtraction = hasVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'case_number')
    || hasVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'court_order_date');
  const legalBasisLabel = canonicalCase.legalBasis === 'court_order' ? 'court-order proof' : legalProofKind.replace(/_/g, ' ');

  const results: NameChangeRequirementResult[] = [
    {
      key: 'legal-proof-document',
      label: 'Legal proof document on file',
      stage: 'proof',
      status: legalProof.intakeStatus === 'reviewed'
        ? (legalProofContract && legalProofContract.metadataMissing.length > 0 ? 'attention' : 'satisfied')
        : legalProof.intakeStatus === 'uploaded' ? 'attention' : 'missing',
      reason: legalProof.intakeStatus === 'reviewed'
        ? (legalProofContract && legalProofContract.metadataMissing.length > 0
          ? `The ${legalBasisLabel} is reviewed, but metadata is still missing: ${legalProofContract.metadataMissing.join(', ')}.`
          : `The ${legalBasisLabel} is reviewed and ready for downstream use.`)
        : legalProof.intakeStatus === 'uploaded'
          ? `The ${legalBasisLabel} exists but still needs review.`
          : `No ${legalBasisLabel} is represented in intake yet for the modeled legal basis.`,
    },
    {
      key: 'identity-document-coverage',
      label: 'Identity document coverage',
      stage: 'identity',
      status: hasIdentityCoverage
        ? (hasIdentityMetadataReady ? 'satisfied' : 'attention')
        : 'missing',
      reason: hasIdentityCoverage
        ? (hasIdentityMetadataReady
          ? 'At least one current identity document is represented in the case intake with enough metadata for downstream use.'
          : 'Identity documents exist in intake, but metadata is still too thin for confident downstream use.')
        : 'No current passport, driver license, or social security card has been represented in the case intake yet.',
    },
    {
      key: 'county-context',
      label: 'County / jurisdiction context',
      stage: 'government',
      status: canonicalCase.countyResidence && canonicalCase.legalContext.marriageState ? 'satisfied' : 'missing',
      reason: canonicalCase.countyResidence && canonicalCase.legalContext.marriageState
        ? `County ${canonicalCase.countyResidence} and state ${canonicalCase.legalContext.marriageState} are present.`
        : 'County residence and/or marriage state context is still incomplete.',
    },
    {
      key: 'launch-state-alignment',
      label: 'Launch-state alignment',
      stage: 'government',
      status: canonicalCase.launchState === 'california' ? 'satisfied' : 'missing',
      reason: canonicalCase.launchState === 'california'
        ? 'Current modeled downstream state execution matches the California launch scope.'
        : `Current modeled downstream state execution assumes California, but launch state is ${canonicalCase.launchState}.`,
    },
    {
      key: 'marriage-jurisdiction-alignment',
      label: 'Marriage jurisdiction alignment',
      stage: 'government',
      status: canonicalCase.legalBasis !== 'marriage' || !canonicalCase.legalContext.marriageState || canonicalCase.legalContext.marriageState === 'California'
        ? 'satisfied'
        : canonicalCase.documents.marriage_certificate.intakeStatus === 'not_started'
          ? 'missing'
          : 'attention',
      reason: canonicalCase.legalBasis !== 'marriage' || !canonicalCase.legalContext.marriageState || canonicalCase.legalContext.marriageState === 'California'
        ? 'Current marriage jurisdiction matches the modeled California follow-through path.'
        : canonicalCase.documents.marriage_certificate.intakeStatus === 'not_started'
          ? `Marriage occurred in ${canonicalCase.legalContext.marriageState}, but no marriage certificate is represented in intake for out-of-state certificate handling.`
          : `Marriage occurred in ${canonicalCase.legalContext.marriageState}, so california follow-through should expect out-of-state certificate handling.`,
    },
    {
      key: 'legal-basis-path-alignment',
      label: 'Legal-basis path alignment',
      stage: 'government',
      status: canonicalCase.legalBasis === 'marriage' ? 'satisfied' : 'missing',
      reason: canonicalCase.legalBasis === 'marriage'
        ? 'Current guided execution slices match a marriage-based name change path.'
        : `Current guided execution slices are modeled for marriage-based name changes, but legal basis is ${canonicalCase.legalBasis}.`,
    },
    {
      key: 'court-order-path-readiness',
      label: 'Court-order path readiness',
      stage: 'government',
      status: canonicalCase.legalBasis !== 'court_order'
        ? 'satisfied'
        : !hasCourtOrderProof
          ? 'missing'
          : hasIdentityCoverage
            ? 'attention'
            : 'missing',
      reason: canonicalCase.legalBasis !== 'court_order'
        ? 'Court-order path readiness is not needed for marriage-based cases.'
        : !hasCourtOrderProof
          ? 'Court-order path is selected, but no court-order proof is represented in intake yet.'
          : hasIdentityCoverage
            ? 'Court-order proof exists and identity coverage is present, but downstream court-order execution slices are still not fully modeled.'
            : 'Court-order proof exists, but identity coverage is still too thin for grounded court-order follow-through.',
    },
    {
      key: 'court-order-jurisdiction-context',
      label: 'Court-order jurisdiction context',
      stage: 'government',
      status: canonicalCase.legalBasis !== 'court_order'
        ? 'satisfied'
        : canonicalCase.countyResidence
          ? 'satisfied'
          : 'missing',
      reason: canonicalCase.legalBasis !== 'court_order'
        ? 'Court-order jurisdiction review is not needed for marriage-based cases.'
        : canonicalCase.countyResidence
          ? `County ${canonicalCase.countyResidence} is present for grounded court-order jurisdiction review.`
          : 'County context is still missing, so court-order jurisdiction review cannot be grounded yet.',
    },
    {
      key: 'court-order-reference-extraction',
      label: 'Court-order reference extraction',
      stage: 'proof',
      status: canonicalCase.legalBasis !== 'court_order'
        ? 'satisfied'
        : !hasCourtOrderProof
          ? 'missing'
          : hasVerifiedCourtOrderReferenceExtraction
            ? 'satisfied'
            : hasAnyCourtOrderReferenceExtraction
              ? 'attention'
              : 'missing',
      reason: canonicalCase.legalBasis !== 'court_order'
        ? 'Court-order reference extraction is not needed for marriage-based cases.'
        : !hasCourtOrderProof
          ? 'Court-order path is selected, but no court-order proof is represented in intake yet.'
          : hasVerifiedCourtOrderReferenceExtraction
            ? 'Court-order reference extraction is present for the modeled review path.'
            : hasAnyCourtOrderReferenceExtraction
              ? 'Court-order reference data exists, but it is still unverified so downstream use is not grounded yet.'
              : 'Court-order proof is in intake, but no verified case-number or signed-date extraction is represented yet.',
    },
    {
      key: 'passport-timing-risk',
      label: 'Passport timing risk reviewed',
      stage: 'institutional',
      status: canonicalCase.identity.passportNeedsUpdate && canonicalCase.lifeContext.travelBookedSoon
        ? hasTravelIdentitySupport ? 'attention' : 'missing'
        : 'satisfied',
      reason: canonicalCase.identity.passportNeedsUpdate && canonicalCase.lifeContext.travelBookedSoon
        ? hasTravelIdentitySupport
          ? 'Travel is already booked and passport updates still need to be sequenced carefully.'
          : 'Travel is already booked, but no current passport or Real ID support is represented in intake yet.'
        : 'No immediate travel-facing passport timing risk is currently flagged.',
    },
    {
      key: 'canonical-extraction-alignment',
      label: 'Canonical vs extracted values aligned',
      stage: 'proof',
      status: extractionSnapshot.conflicts.length === 0 ? 'satisfied' : 'attention',
      reason: extractionSnapshot.conflicts.length === 0
        ? 'Structured case truth and extracted document values are aligned across the currently modeled fields.'
        : `Structured case truth conflicts with extracted document values in ${extractionSnapshot.conflicts.length} place${extractionSnapshot.conflicts.length === 1 ? '' : 's'}: ${extractionSnapshot.conflicts.map((conflict) => conflict.label).join(', ')}.`,
    },
    {
      key: 'expedited-travel-sequencing',
      label: 'Expedited travel sequencing ready',
      stage: 'institutional',
      status: canonicalCase.lifeContext.urgencyLevel === 'expedited' && canonicalCase.lifeContext.travelBookedSoon
        ? (canonicalCase.identity.passportNeedsUpdate && hasTravelIdentitySupport ? 'attention' : 'missing')
        : 'satisfied',
      reason: canonicalCase.lifeContext.urgencyLevel === 'expedited' && canonicalCase.lifeContext.travelBookedSoon
        ? (canonicalCase.identity.passportNeedsUpdate && hasTravelIdentitySupport
          ? 'This is an expedited travel case, so passport/TSA sequencing should be treated as an active fast-path, not routine follow-through.'
          : 'This is an expedited travel case, but travel-facing identity support is still too thin to run a safe fast-path.')
        : 'No expedited travel sequencing override is currently needed.',
    },
    {
      key: 'passport-eligibility-path',
      label: 'Passport eligibility path is clear',
      stage: 'institutional',
      status: canonicalCase.identity.passportNeedsUpdate
        ? (canonicalCase.identity.isUsCitizen ? 'satisfied' : 'missing')
        : 'satisfied',
      reason: canonicalCase.identity.passportNeedsUpdate
        ? (canonicalCase.identity.isUsCitizen
          ? 'Current modeled passport path matches a U.S.-citizen passport update flow.'
          : 'Current passport follow-through is not modeled for non-citizen or passport-ineligible cases yet.')
        : 'No passport eligibility path review is currently needed.',
    },
  ];

  return {
    canonicalCase,
    results,
    summary: {
      satisfied: results.filter((result) => result.status === 'satisfied').length,
      missing: results.filter((result) => result.status === 'missing').length,
      attention: results.filter((result) => result.status === 'attention').length,
    },
  };
}
