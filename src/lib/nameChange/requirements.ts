import { buildNameChangeCanonicalCase } from './canonical';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { buildNameChangeExtractionContractSnapshot, hasAnyLinkedDocumentFieldValue, hasVerifiedLinkedDocumentFieldValue } from './extractionContract';
import { buildNameChangeSnapshotBackedExtractedFields } from './intakeDraft';
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
    key: 'case-legal-name-completeness',
    label: 'Case legal-name setup is complete',
    stage: 'proof',
    description: 'Current and target legal-name fields should be complete before downstream packets and sequencing are treated as reliable.',
  },
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
    key: 'out-of-state-marriage-certificate-grounding',
    label: 'Out-of-state marriage certificate grounding',
    stage: 'proof',
    description: 'Out-of-state marriage follow-through should carry grounded certificate reference fields from the certificate itself.',
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
    description: 'Court-order review should have verified target-name plus case-reference extraction before downstream use is treated as grounded.',
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
  const mergedExtractedFields = buildNameChangeSnapshotBackedExtractedFields(documents, extractedFields);
  const canonicalCase = buildNameChangeCanonicalCase(profile, documents, mergedExtractedFields);
  const intakeSnapshot = buildNameChangeDocumentIntakeSnapshot(profile, documents, mergedExtractedFields);
  const extractionSnapshot = buildNameChangeExtractionContractSnapshot(profile, documents, mergedExtractedFields);
  const legalProofKind = canonicalCase.legalBasis === 'marriage' ? 'marriage_certificate' : 'court_order';
  const legalProof = canonicalCase.documents[legalProofKind];
  const legalProofContract = intakeSnapshot.documents.find((document) => document.kind === legalProofKind);
  const identityCoverageKinds: NameChangeDocumentKind[] = ['current_drivers_license', 'current_passport', 'social_security_card'];
  const hasIdentityCoverage = identityCoverageKinds.some((kind) => canonicalCase.documents[kind].intakeStatus !== 'not_started');
  const hasIdentityMetadataReady = intakeSnapshot.documents.some((document) => identityCoverageKinds.includes(document.kind) && document.metadataMissing.length === 0 && document.intakeStatus !== 'not_started');
  const hasTravelIdentitySupport = ['current_passport', 'current_drivers_license'].some((kind) => canonicalCase.documents[kind as NameChangeDocumentKind].intakeStatus !== 'not_started');
  const hasCourtOrderProof = canonicalCase.documents.court_order.intakeStatus !== 'not_started';
  const hasAnyCourtOrderCaseNumber = hasAnyLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'case_number');
  const hasAnyCourtOrderSignedDate = hasAnyLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'court_order_date');
  const hasAnyCourtOrderTargetFirstName = hasAnyLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'first_name');
  const hasAnyCourtOrderTargetLastName = hasAnyLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'last_name');
  const hasAnyCourtOrderReferenceExtraction = hasAnyCourtOrderCaseNumber || hasAnyCourtOrderSignedDate || hasAnyCourtOrderTargetFirstName || hasAnyCourtOrderTargetLastName;
  const hasVerifiedCourtOrderCaseNumber = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'case_number');
  const hasVerifiedCourtOrderSignedDate = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'court_order_date');
  const hasVerifiedCourtOrderTargetFirstName = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'first_name');
  const hasVerifiedCourtOrderTargetMiddleName = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'middle_name');
  const hasVerifiedCourtOrderTargetLastName = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'last_name');
  const needsVerifiedCourtOrderTargetMiddleName = Boolean(canonicalCase.targetName.middle || canonicalCase.currentName.middle);
  const hasVerifiedCourtOrderTargetNameExtraction = hasVerifiedCourtOrderTargetFirstName
    && hasVerifiedCourtOrderTargetLastName
    && (!needsVerifiedCourtOrderTargetMiddleName || hasVerifiedCourtOrderTargetMiddleName);
  const hasVerifiedCourtOrderReferenceFields = hasVerifiedCourtOrderCaseNumber || hasVerifiedCourtOrderSignedDate;
  const hasVerifiedCourtOrderReferenceExtraction = hasVerifiedCourtOrderTargetNameExtraction && hasVerifiedCourtOrderReferenceFields;
  const needsOutOfStateMarriageCertificateGrounding = canonicalCase.legalBasis === 'marriage'
    && canonicalCase.launchState === 'california'
    && Boolean(canonicalCase.legalContext.marriageState)
    && canonicalCase.legalContext.marriageState !== 'California';
  const hasAnyOutOfStateMarriageCertificateGrounding = hasAnyLinkedDocumentFieldValue(documents, mergedExtractedFields, 'marriage_certificate', 'certificate_number')
    || hasAnyLinkedDocumentFieldValue(documents, mergedExtractedFields, 'marriage_certificate', 'county');
  const hasVerifiedOutOfStateMarriageCertificateNumber = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'marriage_certificate', 'certificate_number');
  const hasVerifiedOutOfStateMarriageCertificateCounty = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'marriage_certificate', 'county');
  const hasVerifiedOutOfStateMarriageCertificateGrounding = hasVerifiedOutOfStateMarriageCertificateNumber && hasVerifiedOutOfStateMarriageCertificateCounty;
  const legalBasisLabel = canonicalCase.legalBasis === 'court_order' ? 'court-order proof' : legalProofKind.replace(/_/g, ' ');
  const hasReviewedCourtOrderProof = legalProof.intakeStatus === 'reviewed';
  const hasCurrentMiddleNameInPlay = Boolean(canonicalCase.currentName.middle || canonicalCase.targetName.middle);
  const hasTargetMiddleNameInPlay = Boolean(canonicalCase.targetName.middle || canonicalCase.currentName.middle);
  const missingCaseLegalNameFields = [
    !canonicalCase.currentName.first ? 'current first name' : null,
    hasCurrentMiddleNameInPlay && !canonicalCase.currentName.middle ? 'current middle name' : null,
    !canonicalCase.currentName.last ? 'current last name' : null,
    !canonicalCase.targetName.first ? 'target first name' : null,
    hasTargetMiddleNameInPlay && !canonicalCase.targetName.middle ? 'target middle name' : null,
    !canonicalCase.targetName.last ? 'target last name' : null,
  ].filter((field): field is string => Boolean(field));

  const results: NameChangeRequirementResult[] = [
    {
      key: 'case-legal-name-completeness',
      label: 'Case legal-name setup is complete',
      stage: 'proof',
      status: missingCaseLegalNameFields.length === 0 ? 'satisfied' : 'missing',
      reason: missingCaseLegalNameFields.length === 0
        ? 'Current and target legal name fields are populated for the modeled case.'
        : `Case setup is still missing ${missingCaseLegalNameFields.join(', ')}.`,
    },
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
      key: 'out-of-state-marriage-certificate-grounding',
      label: 'Out-of-state marriage certificate grounding',
      stage: 'proof',
      status: !needsOutOfStateMarriageCertificateGrounding
        ? 'satisfied'
        : canonicalCase.documents.marriage_certificate.intakeStatus === 'not_started'
          ? 'missing'
          : hasVerifiedOutOfStateMarriageCertificateGrounding
            ? canonicalCase.documents.marriage_certificate.intakeStatus === 'reviewed' ? 'satisfied' : 'attention'
            : hasAnyOutOfStateMarriageCertificateGrounding
              ? 'attention'
              : 'missing',
      reason: !needsOutOfStateMarriageCertificateGrounding
        ? 'Out-of-state marriage certificate grounding is not needed for the current path.'
        : canonicalCase.documents.marriage_certificate.intakeStatus === 'not_started'
          ? `Marriage occurred in ${canonicalCase.legalContext.marriageState}, but no marriage certificate is represented in intake for grounded out-of-state certificate follow-through.`
          : hasVerifiedOutOfStateMarriageCertificateGrounding
            ? canonicalCase.documents.marriage_certificate.intakeStatus === 'reviewed'
              ? 'Verified marriage-certificate county and certificate-number extraction are present for out-of-state follow-through.'
              : 'Marriage-certificate reference extraction is present, but document review is still incomplete for grounded out-of-state follow-through.'
            : hasAnyOutOfStateMarriageCertificateGrounding
              ? 'Marriage certificate is present, but verified county and certificate-number extraction are still incomplete for out-of-state follow-through.'
              : 'Marriage certificate is present, but no grounded county or certificate-number extraction is represented yet for out-of-state follow-through.',
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
            ? hasVerifiedCourtOrderCaseNumber && hasVerifiedCourtOrderSignedDate
              ? hasReviewedCourtOrderProof ? 'satisfied' : 'attention'
              : 'attention'
            : hasAnyCourtOrderReferenceExtraction
              ? 'attention'
              : 'missing',
      reason: canonicalCase.legalBasis !== 'court_order'
        ? 'Court-order reference extraction is not needed for marriage-based cases.'
        : !hasCourtOrderProof
          ? 'Court-order path is selected, but no court-order proof is represented in intake yet.'
          : hasVerifiedCourtOrderReferenceExtraction
            ? hasVerifiedCourtOrderCaseNumber && hasVerifiedCourtOrderSignedDate
              ? hasReviewedCourtOrderProof
                ? 'Court-order target legal name and case reference extraction are present for the modeled review path.'
                : 'Court-order extraction exists, but the proof document still needs review before downstream use is grounded.'
              : hasVerifiedCourtOrderCaseNumber
                ? 'Court-order target legal name and case number are verified, but the signed date still needs grounded extraction before downstream use is fully trusted.'
                : 'Court-order target legal name and signed date are verified, but the case number still needs grounded extraction before downstream use is fully trusted.'
            : hasAnyCourtOrderReferenceExtraction
              ? !hasVerifiedCourtOrderTargetFirstName && hasVerifiedCourtOrderTargetLastName
                ? 'Court-order target last name is verified, but the target first name still needs grounded extraction before downstream use is fully trusted.'
                : hasVerifiedCourtOrderTargetFirstName && !hasVerifiedCourtOrderTargetLastName
                  ? 'Court-order target first name is verified, but the target last name still needs grounded extraction before downstream use is fully trusted.'
                  : needsVerifiedCourtOrderTargetMiddleName && hasVerifiedCourtOrderTargetFirstName && hasVerifiedCourtOrderTargetLastName && !hasVerifiedCourtOrderTargetMiddleName
                    ? 'Court-order target first and last name are verified, but the target middle name still needs grounded extraction before downstream use is fully trusted.'
                    : hasVerifiedCourtOrderTargetNameExtraction && !hasVerifiedCourtOrderReferenceFields
                      ? 'Court-order target legal name is verified, but the case number or signed date still needs grounded extraction before downstream use is fully trusted.'
                      : 'Court-order reference data exists, but it is still unverified so downstream use is not grounded yet.'
              : 'Court-order proof is in intake, but no verified target-name or case-reference extraction is represented yet.',
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
