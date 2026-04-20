import { buildNameChangeCanonicalCase } from './canonical';
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
    key: 'passport-timing-risk',
    label: 'Passport timing risk reviewed',
    stage: 'institutional',
    description: 'Travel-facing passport timing should be reviewed when passport updates are relevant.',
  },
];

export function evaluateNameChangeRequirements(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeRequirementSnapshot {
  const canonicalCase = buildNameChangeCanonicalCase(profile, documents, extractedFields);
  const legalProofKind = canonicalCase.legalBasis === 'marriage' ? 'marriage_certificate' : 'court_order';
  const legalProof = canonicalCase.documents[legalProofKind];
  const identityCoverageKinds: NameChangeDocumentKind[] = ['current_drivers_license', 'current_passport', 'social_security_card'];
  const hasIdentityCoverage = identityCoverageKinds.some((kind) => canonicalCase.documents[kind].intakeStatus !== 'not_started');
  const hasTravelIdentitySupport = ['current_passport', 'current_drivers_license'].some((kind) => canonicalCase.documents[kind as NameChangeDocumentKind].intakeStatus !== 'not_started');

  const results: NameChangeRequirementResult[] = [
    {
      key: 'legal-proof-document',
      label: 'Legal proof document on file',
      stage: 'proof',
      status: legalProof.intakeStatus === 'reviewed' ? 'satisfied' : legalProof.intakeStatus === 'uploaded' ? 'attention' : 'missing',
      reason: legalProof.intakeStatus === 'reviewed'
        ? `The ${legalProofKind.replace(/_/g, ' ')} is reviewed and ready for downstream use.`
        : legalProof.intakeStatus === 'uploaded'
          ? `The ${legalProofKind.replace(/_/g, ' ')} exists but still needs review.`
          : `No ${legalProofKind.replace(/_/g, ' ')} is currently in the intake workspace.`,
    },
    {
      key: 'identity-document-coverage',
      label: 'Identity document coverage',
      stage: 'identity',
      status: hasIdentityCoverage ? 'satisfied' : 'missing',
      reason: hasIdentityCoverage
        ? 'At least one current identity document is represented in the case intake.'
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
      key: 'expedited-travel-sequencing',
      label: 'Expedited travel sequencing ready',
      stage: 'institutional',
      status: canonicalCase.urgencyLevel === 'expedited' && canonicalCase.lifeContext.travelBookedSoon
        ? (canonicalCase.identity.passportNeedsUpdate && hasTravelIdentitySupport ? 'attention' : 'missing')
        : 'satisfied',
      reason: canonicalCase.urgencyLevel === 'expedited' && canonicalCase.lifeContext.travelBookedSoon
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
