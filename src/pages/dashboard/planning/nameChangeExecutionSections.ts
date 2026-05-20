import type { ExecutionCardConfig, ExecutionCardSectionConfig } from './nameChangePlannerUi';

type ExecutionSnapshot = ExecutionCardConfig['snapshot'];

export function buildNameChangeExecutionSections(args: {
  employmentStatus: string | null | undefined;
  passportNeedsUpdate: boolean;
  bankExecutionSnapshot: ExecutionSnapshot;
  courtesyExecutionSnapshot: ExecutionSnapshot;
  dmvExecutionSnapshot: ExecutionSnapshot;
  employerExecutionSnapshot: ExecutionSnapshot;
  insuranceExecutionSnapshot: ExecutionSnapshot;
  licenseExecutionSnapshot: ExecutionSnapshot;
  medicalExecutionSnapshot: ExecutionSnapshot;
  passportExecutionSnapshot: ExecutionSnapshot;
  ssaExecutionSnapshot: ExecutionSnapshot;
  tsaExecutionSnapshot: ExecutionSnapshot;
  utilitiesExecutionSnapshot: ExecutionSnapshot;
  voterExecutionSnapshot: ExecutionSnapshot;
}): ExecutionCardSectionConfig[] {
  const coreGovernmentCards: ExecutionCardConfig[] = [
    {
      key: 'ssa',
      title: 'Social Security first',
      description: 'Start here so federal records, payroll, and tax details stay aligned.',
      readyLabel: 'ready for SS-5 prep',
      notReadyLabel: 'not ready',
      sequenceTitle: 'What should happen first',
      payloadTitle: 'SS-5 form details',
      payloadDescription: 'The saved details to keep ready for the Social Security update.',
      snapshot: args.ssaExecutionSnapshot,
    },
    {
      key: 'dmv',
      title: 'California DMV next',
      description: 'Handle California ID next once Social Security is moving.',
      readyLabel: 'ready for DL-44 prep',
      notReadyLabel: 'not ready',
      sequenceTitle: 'What should happen first',
      payloadTitle: 'DMV form details',
      payloadDescription: 'The saved details to keep ready for the California DMV update.',
      snapshot: args.dmvExecutionSnapshot,
    },
  ];

  if (args.passportNeedsUpdate) {
    coreGovernmentCards.push({
      key: 'passport',
      title: 'Passport follow-through',
      description: 'Keep travel documents aligned once the core ID steps are underway.',
      readyLabel: `ready for ${args.passportExecutionSnapshot.recommendedFormCode} prep`,
      notReadyLabel: 'not ready',
      sequenceTitle: 'What should happen first',
      payloadTitle: 'Passport form details',
      payloadDescription: 'The saved details to keep ready for the passport update.',
      snapshot: args.passportExecutionSnapshot,
    });
  }

  const workIdentityCards: ExecutionCardConfig[] = [];

  if (args.employmentStatus === 'employed' || args.employmentStatus === 'self_employed') {
    workIdentityCards.push(
      {
        key: 'employer',
        title: 'Employer and payroll follow-through',
        description: 'Payroll and HR updates to handle after Social Security and primary ID are moving.',
        readyLabel: 'ready for HR packet prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'What should happen first',
        payloadTitle: 'Employer update details',
        payloadDescription: 'The details to keep ready for payroll and HR updates.',
        snapshot: args.employerExecutionSnapshot,
      },
      {
        key: 'licenses',
        title: 'Professional licenses and certifications',
        description: 'Professional license and certification updates to handle once primary ID is moving.',
        readyLabel: 'ready for license packet prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'What should happen first',
        payloadTitle: 'Professional license update details',
        payloadDescription: 'The details to keep ready for professional license and certification updates.',
        snapshot: args.licenseExecutionSnapshot,
      },
    );
  }

  const institutionCards: ExecutionCardConfig[] = [
    {
      key: 'banks',
      title: 'Banks and credit cards',
      description: 'Bank and card account updates to handle once your primary photo ID is moving.',
      readyLabel: 'ready for bank packet prep',
      notReadyLabel: 'not ready',
      sequenceTitle: 'What should happen first',
      payloadTitle: 'Bank update details',
      payloadDescription: 'The details to keep ready for bank and credit-card updates.',
      snapshot: args.bankExecutionSnapshot,
    },
    {
      key: 'insurance',
      title: 'Insurance follow-through',
      description: 'Health, auto, renters, and life insurance updates to handle once your primary photo ID is moving.',
      readyLabel: 'ready for insurance packet prep',
      notReadyLabel: 'not ready',
      sequenceTitle: 'What should happen first',
      payloadTitle: 'Insurance update details',
      payloadDescription: 'The details to keep ready for insurance policyholder updates.',
      snapshot: args.insuranceExecutionSnapshot,
    },
    {
      key: 'medical',
      title: 'Medical offices and insurance cards',
      description: 'Healthcare records, patient portals, and member cards to handle once your primary photo ID is moving.',
      readyLabel: 'ready for medical record prep',
      notReadyLabel: 'not ready',
      sequenceTitle: 'What should happen first',
      payloadTitle: 'Medical update details',
      payloadDescription: 'The details to keep ready for care-office, patient-portal, and insurance-card updates.',
      snapshot: args.medicalExecutionSnapshot,
    },
    {
      key: 'utilities',
      title: 'Utilities, lease, and landlord records',
      description: 'Household records to handle once your primary photo ID is moving.',
      readyLabel: 'ready for utilities/lease prep',
      notReadyLabel: 'not ready',
      sequenceTitle: 'What should happen first',
      payloadTitle: 'Household record details',
      payloadDescription: 'The details to keep ready for utilities, lease, and landlord updates.',
      snapshot: args.utilitiesExecutionSnapshot,
    },
    {
      key: 'courtesy',
      title: 'Courtesy and social identity updates',
      description: 'Tail-end cleanup slice for display names, loyalty profiles, and other lower-stakes account identity updates.',
      readyLabel: 'ready for courtesy sync',
      notReadyLabel: 'not ready',
      sequenceTitle: 'Courtesy/social sync dependencies',
      payloadTitle: 'Courtesy update details',
      payloadDescription: 'The details to keep ready for display-name and lightweight account updates.',
      snapshot: args.courtesyExecutionSnapshot,
    },
  ];

  const cleanupCards: ExecutionCardConfig[] = [
    {
      key: 'voter',
      title: 'California voter registration',
      description: 'California-specific voter registration follow-through after DMV updates.',
      readyLabel: 'ready for voter update prep',
      notReadyLabel: 'not ready',
      sequenceTitle: 'What should happen first',
      payloadTitle: 'Voter update details',
      payloadDescription: 'The details to keep ready for California voter registration updates.',
      snapshot: args.voterExecutionSnapshot,
    },
  ];

  if (args.passportNeedsUpdate) {
    cleanupCards.push({
      key: 'tsa',
      title: 'TSA and travel profiles',
      description: 'TSA PreCheck and loyalty profile updates to handle once passport work is underway.',
      readyLabel: 'ready for travel profile prep',
      notReadyLabel: 'not ready',
      sequenceTitle: 'What should happen first',
      payloadTitle: 'Travel profile details',
      payloadDescription: 'The details to keep ready for TSA PreCheck and travel profile updates.',
      snapshot: args.tsaExecutionSnapshot,
    });
  }

  return [
    {
      key: 'core-government',
      title: 'Core government path',
      description: 'The federal and state path. This is the order that makes the rest of the name-change process easier instead of messier.',
      cards: coreGovernmentCards,
    },
    {
      key: 'work-identity',
      title: 'Work identity follow-through',
      description: 'Employment-linked updates that usually matter once the government path and primary ID are actually moving.',
      cards: workIdentityCards,
    },
    {
      key: 'institutional',
      title: 'Institutional follow-through',
      description: 'The record updates that get annoying fast if they lag behind your main identity changes.',
      cards: institutionCards,
    },
    {
      key: 'cleanup',
      title: 'Cleanup and tail-end identity sync',
      description: 'Lower-volume but still real updates that round things out once the major pieces are already moving.',
      cards: cleanupCards,
    },
  ].filter((section) => section.cards.length > 0);
}
