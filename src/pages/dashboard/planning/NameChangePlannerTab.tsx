import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileCheck2, FileStack, Lock, MapPinned, Sparkles } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { buildNameChangeBankExecutionSnapshot } from '../../../lib/nameChange/bankFlow';
import { buildNameChangeAutofillPrepSnapshot } from '../../../lib/nameChange/autofill';
import { buildNameChangeCourtesyExecutionSnapshot } from '../../../lib/nameChange/courtesyFlow';
import { buildNameChangeDocumentIntakeSnapshot } from '../../../lib/nameChange/documentContract';
import { buildNameChangeDmvExecutionSnapshot } from '../../../lib/nameChange/dmvFlow';
import { buildNameChangeEmployerExecutionSnapshot } from '../../../lib/nameChange/employerFlow';
import { buildNameChangeInsuranceExecutionSnapshot } from '../../../lib/nameChange/insuranceFlow';
import { buildNameChangeLicenseExecutionSnapshot } from '../../../lib/nameChange/licenseFlow';
import { buildNameChangeMedicalExecutionSnapshot } from '../../../lib/nameChange/medicalFlow';
import { buildNameChangePassportExecutionSnapshot } from '../../../lib/nameChange/passportFlow';
import { NAME_CHANGE_FORM_REGISTRY, NAME_CHANGE_INSTITUTION_LIBRARY } from '../../../lib/nameChange/registry';
import { evaluateNameChangeRequirements } from '../../../lib/nameChange/requirements';
import { bulkUpdateNameChangeReminderStatus, deriveNameChangeReminderAttention, summarizeNameChangeReminderAttention, summarizeNameChangeReminders, updateNameChangeReminderStatus } from '../../../lib/nameChange/reminders';
import { buildNameChangeSsaExecutionSnapshot } from '../../../lib/nameChange/ssaFlow';
import { buildNameChangeTsaExecutionSnapshot } from '../../../lib/nameChange/tsaFlow';
import { buildNameChangeUtilitiesExecutionSnapshot } from '../../../lib/nameChange/utilitiesFlow';
import { buildNameChangeVoterExecutionSnapshot } from '../../../lib/nameChange/voterFlow';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeReminderInput,
  NameChangeTargetExecutionSnapshot,
} from '../../../lib/nameChange/types';

interface ExecutionCardConfig {
  key: string;
  anchorId?: string;
  title: string;
  description: string;
  readyLabel: string;
  notReadyLabel: string;
  sequenceTitle: string;
  payloadTitle: string;
  payloadDescription: string;
  snapshot: NameChangeTargetExecutionSnapshot;
}

interface ReminderPostureCardConfig {
  key: string;
  title: string;
  value: string;
  detail: string;
  tone?: 'warning' | 'primary' | 'danger' | 'neutral';
}

interface ExecutionCardSectionConfig {
  key: string;
  title: string;
  description: string;
  cards: ExecutionCardConfig[];
}

interface ExecutionSectionSummary {
  key: string;
  title: string;
  description: string;
  cards: ExecutionCardConfig[];
  readyCount: number;
  blockedCount: number;
  attentionCount: number;
  postureLabel: string;
  postureDetail: string;
  postureTone: 'danger' | 'warning' | 'primary' | 'neutral';
  highestRiskCardKey: string | null;
  highestRiskCard: string;
  nextActionLabel: string;
  nextActionDetail: string;
  staleReminderOverlap: number;
  reminderKeys: string[];
  staleReminderKeys: string[];
}

const EXECUTION_SECTION_STEP_IDS: Record<string, string[]> = {
  'core-government': ['federal-ssa', 'state-dmv', 'federal-passport'],
  'work-identity': ['institutions-rollout'],
  institutional: ['institutions-rollout'],
  cleanup: ['institutions-rollout'],
};

interface Props {
  draft: NameChangeCaseInput;
  documents: NameChangeDocumentInput[];
  extractedFields: NameChangeExtractedFieldInput[];
  plan: NameChangePlan;
  reminders: NameChangeReminderInput[];
  saving: boolean;
  onDraftChange: (updates: Partial<NameChangeCaseInput>) => void;
  onStructuredIntakeChange: (key: string, value: unknown) => void;
  onDocumentsChange: (documents: NameChangeDocumentInput[]) => void;
  onExtractedFieldsChange: (fields: NameChangeExtractedFieldInput[]) => void;
  onRemindersChange: (reminders: NameChangeReminderInput[], context?: { action: 'single-update' | 'bulk-update' | 'schedule-stale' }) => void;
  onStepExecutionStatusChange: (stepId: string, executionStatus: 'todo' | 'in_progress' | 'complete') => void;
  onStepExecutionNoteChange: (stepId: string, note: string) => void;
  onSave: () => Promise<void>;
}

const documentOptions: Array<{ key: NameChangeDocumentInput['document_kind']; label: string }> = [
  { key: 'marriage_certificate', label: 'Certified marriage certificate' },
  { key: 'court_order', label: 'Court order' },
  { key: 'current_drivers_license', label: 'Current California license / ID' },
  { key: 'current_passport', label: 'Current passport' },
  { key: 'social_security_card', label: 'Social Security card' },
  { key: 'birth_certificate', label: 'Birth certificate' },
  { key: 'proof_of_address', label: 'Proof of address' },
];

const fieldTemplates: Array<{ key: NameChangeExtractedFieldInput['field_key']; label: string }> = [
  { key: 'first_name', label: 'Current first name' },
  { key: 'last_name', label: 'Current last name' },
  { key: 'spouse_last_name', label: 'Spouse last name' },
  { key: 'issuance_date', label: 'Document issue date' },
  { key: 'county', label: 'County' },
];

function ensureDocument(documents: NameChangeDocumentInput[], kind: NameChangeDocumentInput['document_kind'], label: string): NameChangeDocumentInput[] {
  if (documents.some((document) => document.document_kind === kind)) return documents;
  return [
    ...documents,
    {
      document_kind: kind,
      display_name: label,
      storage_mode: 'metadata_only',
      intake_status: 'uploaded',
      file_name_masked: `${kind.replace(/_/g, '-')}-•••.pdf`,
      issuing_authority: null,
      issued_on: null,
      expires_on: null,
      extraction_confidence: 0.92,
      extracted_snapshot: null,
    },
  ];
}

const ExecutionSnapshotCard: React.FC<ExecutionCardConfig> = ({
  anchorId,
  title,
  description,
  readyLabel,
  notReadyLabel,
  sequenceTitle,
  payloadTitle,
  payloadDescription,
  snapshot,
}) => (
  <Card>
    <div id={anchorId} className="scroll-mt-24" />
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs ${snapshot.ready ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
        {snapshot.ready ? readyLabel : notReadyLabel}
      </span>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {snapshot.checklist.map((item) => (
        <div key={item.label} className="rounded-xl border border-border-subtle p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-text-primary">{item.label}</p>
            <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'ready' ? 'bg-success/10 text-success' : item.status === 'attention' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
              {item.status}
            </span>
          </div>
          <p className="mt-3 text-sm text-text-secondary">{item.reason}</p>
        </div>
      ))}
    </div>

    <div className="mt-4 rounded-xl border border-border-subtle p-4">
      <h4 className="text-sm font-semibold text-text-primary">{sequenceTitle}</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {snapshot.sequence.dependencies.map((dependency) => (
          <div key={dependency.key} className="rounded-xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">{dependency.label}</p>
              <span className={`rounded-full px-2 py-1 text-xs ${dependency.status === 'satisfied' ? 'bg-success/10 text-success' : dependency.status === 'attention' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                {dependency.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">{dependency.reason}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {snapshot.autofillFields.map((field) => (
        <div key={field.targetField} className="rounded-xl border border-border-subtle p-4">
          <p className="text-sm font-semibold text-text-primary">{field.label}</p>
          <p className="mt-2 text-sm text-text-secondary">{field.value.value ?? 'Missing'}</p>
          <p className="mt-2 text-xs text-text-secondary">{field.targetField} · {field.value.source} · {field.value.confidence}</p>
        </div>
      ))}
    </div>

    <div className="mt-4 rounded-xl border border-border-subtle p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">{payloadTitle}</h4>
          <p className="text-xs text-text-secondary">{payloadDescription}</p>
        </div>
        <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
          {snapshot.formPayload.summary.ready} ready · {snapshot.formPayload.summary.missing} missing · {snapshot.formPayload.summary.extractedBacked} extracted-backed
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {snapshot.formPayload.fields.map((field) => (
          <div key={field.fieldKey} className="rounded-xl border border-border-subtle p-4">
            <p className="text-sm font-semibold text-text-primary">{field.label}</p>
            <p className="mt-2 text-sm text-text-secondary">{field.value ?? 'Missing'}</p>
            <p className="mt-2 text-xs text-text-secondary">{field.fieldKey} · {field.source} · {field.confidence}</p>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

const ReminderPostureCard: React.FC<ReminderPostureCardConfig> = ({ title, value, detail, tone = 'neutral' }) => {
  const toneClass = tone === 'danger'
    ? 'border-danger/20 bg-danger/5'
    : tone === 'warning'
      ? 'border-warning/20 bg-warning/5'
      : tone === 'primary'
        ? 'border-primary/20 bg-primary/5'
        : 'border-border-subtle bg-white/60';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide text-text-tertiary">{title}</p>
      <p className="mt-2 text-sm font-semibold text-text-primary">{value}</p>
      <p className="mt-2 text-xs text-text-secondary">{detail}</p>
    </div>
  );
};

export const NameChangePlannerTab: React.FC<Props> = ({
  draft,
  documents,
  extractedFields,
  plan,
  reminders,
  saving,
  onDraftChange,
  onStructuredIntakeChange,
  onDocumentsChange,
  onExtractedFieldsChange,
  onRemindersChange,
  onStepExecutionStatusChange,
  onStepExecutionNoteChange,
  onSave,
}) => {
  const [showAdmin, setShowAdmin] = useState(false);
  const stepCounts = useMemo(() => ({
    ready: plan.steps.filter((step) => step.status === 'ready').length,
    blocked: plan.steps.filter((step) => step.status === 'blocked').length,
    later: plan.steps.filter((step) => step.status === 'later').length,
  }), [plan.steps]);
  const effectiveReminders = useMemo(() => reminders, [reminders]);
  const requirementSnapshot = useMemo(() => evaluateNameChangeRequirements(draft, documents, extractedFields), [draft, documents, extractedFields]);
  const documentIntakeSnapshot = useMemo(() => buildNameChangeDocumentIntakeSnapshot(draft, documents, extractedFields), [draft, documents, extractedFields]);
  const autofillPrepSnapshot = useMemo(() => buildNameChangeAutofillPrepSnapshot(draft, documents, extractedFields), [draft, documents, extractedFields]);
  const bankExecutionSnapshot = useMemo(() => buildNameChangeBankExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const courtesyExecutionSnapshot = useMemo(() => buildNameChangeCourtesyExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const insuranceExecutionSnapshot = useMemo(() => buildNameChangeInsuranceExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const licenseExecutionSnapshot = useMemo(() => buildNameChangeLicenseExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const medicalExecutionSnapshot = useMemo(() => buildNameChangeMedicalExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const voterExecutionSnapshot = useMemo(() => buildNameChangeVoterExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const tsaExecutionSnapshot = useMemo(() => buildNameChangeTsaExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const utilitiesExecutionSnapshot = useMemo(() => buildNameChangeUtilitiesExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const ssaExecutionSnapshot = useMemo(() => buildNameChangeSsaExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const dmvExecutionSnapshot = useMemo(() => buildNameChangeDmvExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const passportExecutionSnapshot = useMemo(() => buildNameChangePassportExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const employerExecutionSnapshot = useMemo(() => buildNameChangeEmployerExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const reminderSummary = useMemo(() => summarizeNameChangeReminders(effectiveReminders), [effectiveReminders]);
  const reminderAttention = useMemo(() => deriveNameChangeReminderAttention(effectiveReminders, plan), [effectiveReminders, plan]);
  const reminderAttentionSummary = useMemo(() => summarizeNameChangeReminderAttention(reminderAttention, {
    hasRecentStart: plan.summary.hasRecentStart,
    hasRecentCompletion: plan.summary.hasRecentCompletion,
  }), [reminderAttention, plan.summary.hasRecentCompletion, plan.summary.hasRecentStart]);
  const reminderPostureCards = useMemo<ReminderPostureCardConfig[]>(() => {
    if (reminderAttention.length === 0) return [];

    return [
      {
        key: 'risk-lane',
        title: 'Dominant risk lane',
        value: reminderAttentionSummary.dominantRiskLane,
        detail: `${reminderAttentionSummary.critical} critical · ${reminderAttentionSummary.elevated} elevated · ${reminderAttentionSummary.normal} normal`,
        tone: reminderAttentionSummary.critical > 0 ? 'danger' : reminderAttentionSummary.elevated > 0 ? 'warning' : 'neutral',
      },
      {
        key: 'actionability',
        title: 'Attention posture',
        value: reminderAttentionSummary.attentionPosture,
        detail: `${reminderAttentionSummary.actionableNow} actionable now · ${reminderAttentionSummary.blockedByUntouchedStep} blocked by untouched step`,
        tone: reminderAttentionSummary.attentionPosture === 'blocked-heavy' ? 'warning' : 'primary',
      },
      {
        key: 'stale',
        title: 'Stale pressure',
        value: `${reminderAttentionSummary.stale} stale`,
        detail: `${reminderAttentionSummary.staleTodo} untouched stale · ${reminderAttentionSummary.staleInProgress} stale but moving`,
        tone: reminderAttentionSummary.stale > 0 ? 'warning' : 'neutral',
      },
      {
        key: 'aging',
        title: 'Aging without execution',
        value: reminderAttentionSummary.agingWithoutExecution ? 'yes' : 'no',
        detail: `${reminderAttentionSummary.agingWithoutExecutionLane} · ${reminderAttentionSummary.agingWithoutExecutionPosture}`,
        tone: reminderAttentionSummary.agingWithoutExecution ? 'warning' : 'neutral',
      },
    ];
  }, [reminderAttention.length, reminderAttentionSummary]);
  const executionSections = useMemo<ExecutionCardSectionConfig[]>(() => {
    const coreGovernmentCards: ExecutionCardConfig[] = [
      {
        key: 'ssa',
        title: 'Guided execution: SSA first',
        description: 'First real guided execution slice. Uses canonical case truth, intake contract, requirements, and autofill prep to judge SS-5 readiness.',
        readyLabel: 'ready for SS-5 prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'SSA sequencing dependencies',
        payloadTitle: 'SS-5 form payload snapshot',
        payloadDescription: 'Structured downstream form contract for the first real execution target.',
        snapshot: ssaExecutionSnapshot,
      },
      {
        key: 'dmv',
        title: 'Guided execution: California DMV next',
        description: 'Second guided execution slice. Reuses the same canonical/intake/autofill layers to judge DMV readiness after SSA.',
        readyLabel: 'ready for DL-44 prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'DMV sequencing dependencies',
        payloadTitle: 'DMV form payload snapshot',
        payloadDescription: 'Structured downstream form contract for the California DMV execution target.',
        snapshot: dmvExecutionSnapshot,
      },
    ];

    if (draft.passport_needs_update) {
      coreGovernmentCards.push(
        {
          key: 'passport',
          title: 'Guided execution: passport follow-through',
          description: 'Third guided execution slice. Reuses the shared execution builder for passport packet prep once SSA is underway.',
          readyLabel: `ready for ${passportExecutionSnapshot.recommendedFormCode} prep`,
          notReadyLabel: 'not ready',
          sequenceTitle: 'Passport sequencing dependencies',
          payloadTitle: 'Passport form payload snapshot',
          payloadDescription: 'Structured downstream form contract for the passport execution target.',
          snapshot: passportExecutionSnapshot,
        },
      );
    }

    const workIdentityCards: ExecutionCardConfig[] = [];

    if (draft.employment_status === 'employed' || draft.employment_status === 'self_employed') {
      workIdentityCards.push(
        {
          key: 'employer',
          title: 'Guided execution: employer / payroll follow-through',
          description: 'Institutional execution slice for payroll / HR updates after SSA is complete and primary ID is moving.',
          readyLabel: 'ready for HR packet prep',
          notReadyLabel: 'not ready',
          sequenceTitle: 'Employer sequencing dependencies',
          payloadTitle: 'Employer packet snapshot',
          payloadDescription: 'Structured downstream packet for payroll / HR updates.',
          snapshot: employerExecutionSnapshot,
        },
        {
          key: 'licenses',
          title: 'Guided execution: professional licenses / certifications',
          description: 'Employment-linked execution slice for professional licenses and certifications once primary ID is moving.',
          readyLabel: 'ready for license packet prep',
          notReadyLabel: 'not ready',
          sequenceTitle: 'Professional-license sequencing dependencies',
          payloadTitle: 'Professional-license packet snapshot',
          payloadDescription: 'Structured downstream packet for professional license and certification updates.',
          snapshot: licenseExecutionSnapshot,
        },
      );
    }

    const institutionCards: ExecutionCardConfig[] = [
      {
        key: 'banks',
        title: 'Guided execution: banks / credit cards',
        description: 'Institutional execution slice for bank and card account updates once primary photo ID is moving.',
        readyLabel: 'ready for bank packet prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Bank sequencing dependencies',
        payloadTitle: 'Bank packet snapshot',
        payloadDescription: 'Structured downstream packet for bank and credit-card account updates.',
        snapshot: bankExecutionSnapshot,
      },
      {
        key: 'insurance',
        title: 'Guided execution: insurance follow-through',
        description: 'Institutional execution slice for health, auto, renters, and life insurance once primary photo ID is moving.',
        readyLabel: 'ready for insurance packet prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Insurance sequencing dependencies',
        payloadTitle: 'Insurance packet snapshot',
        payloadDescription: 'Structured downstream packet for insurance policyholder updates.',
        snapshot: insuranceExecutionSnapshot,
      },
      {
        key: 'medical',
        title: 'Guided execution: medical providers / insurance cards',
        description: 'Healthcare execution slice for provider rosters, patient portals, and member-card records once primary photo ID is moving.',
        readyLabel: 'ready for medical record prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Medical/provider sequencing dependencies',
        payloadTitle: 'Medical/provider packet snapshot',
        payloadDescription: 'Structured downstream packet for provider, patient-portal, and insurance-card record updates.',
        snapshot: medicalExecutionSnapshot,
      },
      {
        key: 'utilities',
        title: 'Guided execution: utilities / lease / landlord records',
        description: 'Household-admin execution slice for utilities, lease portals, and landlord records once primary photo ID is moving.',
        readyLabel: 'ready for utilities/lease prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Utilities/lease sequencing dependencies',
        payloadTitle: 'Utilities/lease packet snapshot',
        payloadDescription: 'Structured downstream packet for utilities, lease, and landlord record updates.',
        snapshot: utilitiesExecutionSnapshot,
      },
      {
        key: 'courtesy',
        title: 'Guided execution: courtesy / social identity sync',
        description: 'Tail-end cleanup slice for display names, loyalty profiles, and other lower-stakes account identity updates.',
        readyLabel: 'ready for courtesy sync',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Courtesy/social sync dependencies',
        payloadTitle: 'Courtesy/social sync packet snapshot',
        payloadDescription: 'Structured downstream packet for display-name and lightweight social/account identity updates.',
        snapshot: courtesyExecutionSnapshot,
      },
    ];

    const cleanupCards: ExecutionCardConfig[] = [
      {
        key: 'voter',
        title: 'Guided execution: California voter registration',
        description: 'California-specific post-DMV execution slice for voter registration follow-through.',
        readyLabel: 'ready for voter update prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Voter sequencing dependencies',
        payloadTitle: 'Voter packet snapshot',
        payloadDescription: 'Structured downstream packet for California voter registration updates.',
        snapshot: voterExecutionSnapshot,
      },
    ];

    if (draft.passport_needs_update) {
      cleanupCards.push({
        key: 'tsa',
        title: 'Guided execution: TSA / travel profiles',
        description: 'Travel-facing execution slice for TSA PreCheck and loyalty/travel profile follow-through once passport work is underway.',
        readyLabel: 'ready for travel profile prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'TSA / travel sequencing dependencies',
        payloadTitle: 'TSA / travel packet snapshot',
        payloadDescription: 'Structured downstream packet for TSA PreCheck and travel profile updates.',
        snapshot: tsaExecutionSnapshot,
      });
    }

    return [
      {
        key: 'core-government',
        title: 'Core government path',
        description: 'The federal/state backbone. This is the sequence that makes the rest of the name-change system easier instead of messier.',
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
        description: 'The long-tail admin lanes where mismatched records get annoying fast if they lag behind the identity backbone.',
        cards: institutionCards,
      },
      {
        key: 'cleanup',
        title: 'Cleanup and tail-end identity sync',
        description: 'Lower-volume but still real updates that round out the workflow once the major lanes are already in motion.',
        cards: cleanupCards,
      },
    ].filter((section) => section.cards.length > 0);
  }, [
    bankExecutionSnapshot,
    courtesyExecutionSnapshot,
    dmvExecutionSnapshot,
    draft.employment_status,
    draft.passport_needs_update,
    employerExecutionSnapshot,
    insuranceExecutionSnapshot,
    licenseExecutionSnapshot,
    medicalExecutionSnapshot,
    passportExecutionSnapshot,
    ssaExecutionSnapshot,
    tsaExecutionSnapshot,
    utilitiesExecutionSnapshot,
    voterExecutionSnapshot,
  ]);
  const executionSectionSummaries = useMemo<ExecutionSectionSummary[]>(() => (
    executionSections.map((section) => {
      const readyCount = section.cards.filter((card) => card.snapshot.ready).length;
      const blockedCount = section.cards.filter((card) => !card.snapshot.ready).length;
      const attentionCount = section.cards.reduce((sum, card) => sum + card.snapshot.checklist.filter((item) => item.status === 'attention').length, 0);
      const highestRiskCardConfig = section.cards.reduce((current, card) => {
        const blockerCount = card.snapshot.blockers.length;
        const currentBlockerCount = current?.snapshot.blockers.length ?? -1;
        if (blockerCount > currentBlockerCount) return card;

        const cardAttention = card.snapshot.checklist.filter((item) => item.status === 'attention').length;
        const currentAttention = current ? current.snapshot.checklist.filter((item) => item.status === 'attention').length : -1;
        return cardAttention > currentAttention ? card : current;
      }, null as ExecutionCardConfig | null);
      const highestRiskCardKey = highestRiskCardConfig?.key ?? null;
      const highestRiskCard = highestRiskCardConfig?.title ?? 'No major risk in this section';
      const nextActionLabel = highestRiskCardConfig?.snapshot.ready
        ? `Push ${highestRiskCardConfig.title.replace('Guided execution: ', '')} forward`
        : `Clear ${highestRiskCardConfig?.title.replace('Guided execution: ', '') ?? 'the top blocker'}`;
      const nextActionDetail = highestRiskCardConfig
        ? (highestRiskCardConfig.snapshot.blockers[0]
          ?? highestRiskCardConfig.snapshot.checklist.find((item) => item.status === 'attention')?.reason
          ?? 'Review the highest-risk card and move the next dependent step.')
        : 'No immediate action needed in this section.';
      const relatedStepIds = EXECUTION_SECTION_STEP_IDS[section.key] ?? [];
      const sectionReminderItems = reminderAttention.filter((item) => relatedStepIds.includes(item.dependsOnStepId));
      const staleReminderKeys = sectionReminderItems.filter((item) => item.isStale).map((item) => item.reminderKey);
      const reminderKeys = sectionReminderItems.map((item) => item.reminderKey);
      const staleReminderOverlap = staleReminderKeys.length;
      const posture = blockedCount === section.cards.length
        ? {
            postureLabel: 'blocked',
            postureDetail: 'Every card in this section still has blockers, so this lane needs setup or dependency clearing before it can really move.',
            postureTone: 'danger' as const,
          }
        : readyCount === section.cards.length && attentionCount === 0
          ? {
              postureLabel: 'mostly done',
              postureDetail: 'Everything in this section is ready and there is not much loose attention left here.',
              postureTone: 'primary' as const,
            }
          : readyCount > 0
            ? {
                postureLabel: 'moving',
                postureDetail: 'Some cards are already ready while others still need cleanup, so this section can move now without pretending it is finished.',
                postureTone: 'warning' as const,
              }
            : {
                postureLabel: 'cleanup only',
                postureDetail: 'This section is lower-stakes tail work with light dependencies, so it is mostly about cleanup once the bigger lanes settle.',
                postureTone: 'neutral' as const,
              };

      return {
        ...section,
        readyCount,
        blockedCount,
        attentionCount,
        ...posture,
        highestRiskCardKey,
        highestRiskCard,
        nextActionLabel,
        nextActionDetail,
        staleReminderOverlap,
        reminderKeys,
        staleReminderKeys,
      };
    })
  ), [executionSections, reminderAttention]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card padding="sm">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Path</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{plan.summary.legalPathLabel}</p>
          <p className="mt-2 text-xs text-text-secondary">Case status: {draft.workflow_status.replace('_', ' ')}</p>
          <p className="mt-2 text-xs text-text-secondary">Next best action: {plan.summary.nextBestAction}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Workflow health</p>
          <p className="mt-2 text-sm text-text-primary">{stepCounts.ready} ready · {stepCounts.blocked} blocked · {stepCounts.later} later</p>
          <p className="mt-2 text-xs text-text-secondary">Execution: {plan.summary.executionCounts?.todo ?? 0} todo · {plan.summary.executionCounts?.in_progress ?? 0} in progress · {plan.summary.executionCounts?.complete ?? 0} complete</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{plan.summary.readinessPercent}% intake-ready</p>
          <p className="mt-2 text-xs text-text-secondary">Federal-first, California-second, institutions after primary ID.</p>
        </Card>
        <Card padding="sm" className="border-primary/20 bg-primary/5">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-primary">Privacy rule</p>
              <p className="mt-2 text-sm text-text-primary">Raw uploads are optional. Structured fields are the truth.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Case setup</h3>
            <p className="mt-1 text-sm text-text-secondary">This is the engine input. Keep it lean and structured.</p>
          </div>
          <Button size="sm" onClick={() => void onSave()} disabled={saving}>{saving ? 'Saving…' : 'Save planner case'}</Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Current first name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.current_first_name} onChange={(e) => onDraftChange({ current_first_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Current last name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.current_last_name} onChange={(e) => onDraftChange({ current_last_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Target first name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.target_first_name} onChange={(e) => onDraftChange({ target_first_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Target last name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.target_last_name} onChange={(e) => onDraftChange({ target_last_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Spouse last name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={String(draft.structured_intake.spouseLastName ?? '')} onChange={(e) => onStructuredIntakeChange('spouseLastName', e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Marriage date</span>
            <input type="date" className="w-full rounded-lg border border-border px-3 py-2" value={draft.marriage_date ?? ''} onChange={(e) => onDraftChange({ marriage_date: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">California county</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.county_residence ?? ''} onChange={(e) => onDraftChange({ county_residence: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Legal basis</span>
            <select className="w-full rounded-lg border border-border px-3 py-2" value={draft.legal_basis} onChange={(e) => onDraftChange({ legal_basis: e.target.value as NameChangeCaseInput['legal_basis'] })}>
              <option value="marriage">Marriage</option>
              <option value="court_order">Court order</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Urgency</span>
            <select className="w-full rounded-lg border border-border px-3 py-2" value={draft.urgency_level} onChange={(e) => onDraftChange({ urgency_level: e.target.value as NameChangeCaseInput['urgency_level'] })}>
              <option value="standard">Standard</option>
              <option value="expedited">Expedited</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Employment status</span>
            <select className="w-full rounded-lg border border-border px-3 py-2" value={draft.employment_status} onChange={(e) => onDraftChange({ employment_status: e.target.value as NameChangeCaseInput['employment_status'] })}>
              <option value="employed">Employed</option>
              <option value="self_employed">Self-employed</option>
              <option value="not_employed">Not employed</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            { label: 'Has passport', checked: draft.has_us_passport, key: 'has_us_passport' },
            { label: 'Passport needs update', checked: draft.passport_needs_update, key: 'passport_needs_update' },
            { label: 'Has CA Real ID / license', checked: draft.has_real_id_license, key: 'has_real_id_license' },
            { label: 'Travel booked soon', checked: Boolean(draft.structured_intake.travelBookedSoon), key: 'travelBookedSoon', source: 'structured' },
            { label: 'Wants doc intake help', checked: draft.structured_intake.wantsDocumentIntakeHelp !== false, key: 'wantsDocumentIntakeHelp', source: 'structured' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.source === 'structured'
                  ? onStructuredIntakeChange(item.key, e.target.checked)
                  : onDraftChange({ [item.key]: e.target.checked } as Partial<NameChangeCaseInput>)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </Card>

      {(plan.summary.missingInputs.length > 0 || plan.summary.cautionNotes.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {plan.summary.missingInputs.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <h3 className="text-lg font-semibold text-text-primary">Intake gaps to close</h3>
              <p className="mt-1 text-sm text-text-secondary">These are the missing pieces keeping the planner from being cleanly actionable.</p>
              <ul className="mt-3 space-y-2 text-sm text-text-primary">
                {plan.summary.missingInputs.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </Card>
          )}

          {plan.summary.cautionNotes.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-text-primary">Planner notes</h3>
              <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                {plan.summary.cautionNotes.map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </Card>
          )}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Canonical case requirements</h3>
            <p className="text-sm text-text-secondary">Early skeleton for the real name-change system contract: canonical case truth plus requirement evaluation.</p>
          </div>
          <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
            {requirementSnapshot.summary.satisfied} satisfied · {requirementSnapshot.summary.attention} attention · {requirementSnapshot.summary.missing} missing
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {requirementSnapshot.results.map((result) => (
            <div key={result.key} className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{result.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{result.stage}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${result.status === 'satisfied' ? 'bg-success/10 text-success' : result.status === 'attention' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                  {result.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{result.reason}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Document intake contract</h3>
            <p className="text-sm text-text-secondary">Real system slice for required documents, extraction expectations, and autofill-readiness prep.</p>
          </div>
          <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
            {documentIntakeSnapshot.summary.requiredReady} required ready · {documentIntakeSnapshot.summary.requiredMissing} required missing · {documentIntakeSnapshot.summary.extractionGaps} extraction gaps
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {documentIntakeSnapshot.documents.map((document) => (
            <div key={document.kind} className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{document.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{document.required ? 'required' : 'optional'} · {document.preferredForAutofill ? 'autofill-preferred' : 'supporting'}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${document.intakeStatus === 'reviewed' ? 'bg-success/10 text-success' : document.intakeStatus === 'uploaded' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                  {document.intakeStatus}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">Captured fields: {document.capturedExtractionFields.length > 0 ? document.capturedExtractionFields.join(', ') : 'none yet'}</p>
              <p className="mt-2 text-xs text-text-secondary">Missing extraction fields: {document.missingExtractionFields.length > 0 ? document.missingExtractionFields.join(', ') : 'none'}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Autofill prep snapshot</h3>
            <p className="text-sm text-text-secondary">First real form/autofill-prep slice: canonical values plus extracted-field-backed candidates for downstream execution.</p>
          </div>
          <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
            {autofillPrepSnapshot.summary.ready} ready · {autofillPrepSnapshot.summary.missing} missing · {autofillPrepSnapshot.summary.extractedBacked} extracted-backed
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {autofillPrepSnapshot.fields.map((field) => (
            <div key={field.targetField} className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{field.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{field.targetField}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${field.value.confidence === 'high' ? 'bg-success/10 text-success' : field.value.confidence === 'medium' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                  {field.value.confidence}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-primary">{field.value.value ?? 'Missing'}</p>
              <p className="mt-2 text-xs text-text-secondary">Source: {field.value.source}{field.value.sourceDocumentKind ? ` · ${field.value.sourceDocumentKind}` : ''}{field.value.sourceFieldKey ? ` · ${field.value.sourceFieldKey}` : ''}</p>
            </div>
          ))}
        </div>
      </Card>

      {executionSectionSummaries.map((section) => (
        <div key={section.key} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
            <p className="text-sm text-text-secondary">{section.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs ${section.postureTone === 'danger' ? 'bg-danger/10 text-danger' : section.postureTone === 'warning' ? 'bg-warning/10 text-warning' : section.postureTone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>
                {section.postureLabel}
              </span>
              <span className="text-xs text-text-secondary">{section.postureDetail}</span>
            </div>
          </div>

          {(section.reminderKeys.length > 0 || section.staleReminderKeys.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {section.highestRiskCardKey && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById(`execution-card-${section.highestRiskCardKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  Focus highest-risk card
                </Button>
              )}
              {section.staleReminderKeys.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemindersChange(
                    bulkUpdateNameChangeReminderStatus(effectiveReminders, section.staleReminderKeys, 'scheduled'),
                    { action: 'schedule-stale' },
                  )}
                >
                  Schedule {section.staleReminderKeys.length} stale reminder{section.staleReminderKeys.length === 1 ? '' : 's'}
                </Button>
              )}
              {section.reminderKeys.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemindersChange(
                    bulkUpdateNameChangeReminderStatus(effectiveReminders, section.reminderKeys, 'dismissed'),
                    { action: 'bulk-update' },
                  )}
                >
                  Dismiss {section.reminderKeys.length} section reminder{section.reminderKeys.length === 1 ? '' : 's'}
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border-subtle bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Section readiness</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.readyCount} ready · {section.blockedCount} blocked</p>
              <p className="mt-2 text-xs text-text-secondary">Cards in this section that can move now vs still need work.</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Attention load</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.attentionCount} attention markers</p>
              <p className="mt-2 text-xs text-text-secondary">Checklist items that are not outright blocked but still need eyes.</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Highest-risk card</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.highestRiskCard}</p>
              <p className="mt-2 text-xs text-text-secondary">The card in this section carrying the most blockers / unresolved attention.</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Stale reminder overlap</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.staleReminderOverlap} stale overlaps</p>
              <p className="mt-2 text-xs text-text-secondary">How much stale reminder pressure seems to be pooling around this section.</p>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary">Section next action</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{section.nextActionLabel}</p>
                <p className="mt-2 text-xs text-text-secondary">{section.nextActionDetail}</p>
              </div>
              {section.highestRiskCardKey && (
                <Button
                  size="sm"
                  onClick={() => document.getElementById(`execution-card-${section.highestRiskCardKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  Open next action
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {section.cards.map(({ key, ...card }) => (
              <ExecutionSnapshotCard key={key} anchorId={`execution-card-${key}`} {...card} />
            ))}
          </div>
        </div>
      ))}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex items-center gap-2">
            <FileStack className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Document intake accelerator</h3>
              <p className="text-sm text-text-secondary">Optional metadata only. No raw-document dependency in the engine.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {documentOptions.map((option) => {
              const present = documents.some((document) => document.document_kind === option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => present
                    ? onDocumentsChange(documents.filter((document) => document.document_kind !== option.key))
                    : onDocumentsChange(ensureDocument(documents, option.key, option.label))}
                  className={`rounded-full border px-3 py-1.5 text-sm ${present ? 'border-primary bg-primary/10 text-primary' : 'border-border-subtle text-text-secondary'}`}
                >
                  {present ? 'Added · ' : 'Add · '}{option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            {documents.length === 0 ? (
              <p className="text-sm text-text-tertiary">No document metadata yet. That is fine — the planner can still work off manual structured fields.</p>
            ) : documents.map((document) => (
              <div key={document.document_kind} className="rounded-xl border border-border-subtle p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{document.display_name}</p>
                    <p className="text-xs text-text-secondary">{document.storage_mode === 'metadata_only' ? 'Metadata only' : 'No file stored'}</p>
                  </div>
                  <span className="rounded-full bg-success/10 px-2 py-1 text-xs text-success">{document.intake_status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Structured extracted fields</h3>
              <p className="text-sm text-text-secondary">The source of truth the engine actually reads.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {fieldTemplates.map((template) => {
              const current = extractedFields.find((field) => field.field_key === template.key);
              return (
                <label key={template.key} className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-text-secondary">{template.label}</span>
                  <input
                    className="w-full rounded-lg border border-border px-3 py-2"
                    value={current?.field_value_masked ?? ''}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      const rest = extractedFields.filter((field) => field.field_key !== template.key);
                      onExtractedFieldsChange(nextValue.trim()
                        ? [
                            ...rest,
                            {
                              field_key: template.key,
                              field_label: template.label,
                              field_value_masked: nextValue,
                              source_type: 'manual',
                              is_verified: true,
                            },
                          ]
                        : rest);
                    }}
                    placeholder="Masked or structured value"
                  />
                </label>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Engine-generated workflow</h3>
            <p className="text-sm text-text-secondary">Registry-driven steps, not a static checklist.</p>
          </div>
        </div>

        {plan.summary.blockers.length > 0 && (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Current blockers</p>
                <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                  {plan.summary.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {plan.steps.map((step) => (
            <div key={step.id} className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-tertiary">{step.phase}</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{step.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">{step.description}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${step.status === 'ready' ? 'bg-success/10 text-success' : step.status === 'blocked' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>{step.status}</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
                <div>
                  <p className="font-medium text-text-primary">Timing</p>
                  <p className="mt-1 text-text-secondary">{step.timing}</p>
                </div>
                <div>
                  <p className="font-medium text-text-primary">Evidence</p>
                  <ul className="mt-1 space-y-1 text-text-secondary">{step.evidenceNeeded.map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
                <div>
                  <p className="font-medium text-text-primary">Forms / institutions</p>
                  <ul className="mt-1 space-y-1 text-text-secondary">
                    {step.forms.map((form) => <li key={form.code}>• {form.code} — {form.title}</li>)}
                    {step.institutions.map((institution) => <li key={institution}>• {institution}</li>)}
                  </ul>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">Execution: {step.executionStatus ?? 'todo'}</span>
                {step.executionStatus !== 'in_progress' && step.status !== 'blocked' && (
                  <Button variant="ghost" size="sm" onClick={() => onStepExecutionStatusChange(step.id, 'in_progress')}>Mark in progress</Button>
                )}
                {step.executionStatus !== 'complete' && step.status !== 'blocked' && (
                  <Button variant="ghost" size="sm" onClick={() => onStepExecutionStatusChange(step.id, 'complete')}>Mark complete</Button>
                )}
                {step.executionStatus !== 'todo' && (
                  <Button variant="ghost" size="sm" onClick={() => onStepExecutionStatusChange(step.id, 'todo')}>Reset</Button>
                )}
              </div>
              <div className="mt-3 grid gap-2">
                <label className="text-xs font-medium text-text-secondary">Execution note</label>
                <textarea
                  className="min-h-[84px] w-full rounded-lg border border-border px-3 py-2 text-sm"
                  value={step.executionNote ?? ''}
                  onChange={(e) => onStepExecutionNoteChange(step.id, e.target.value)}
                  placeholder="Add what was submitted, confirmed, or still blocked here"
                />
                {(step.executionUpdatedAt || step.completedAt) && (
                  <p className="text-xs text-text-secondary">
                    {step.executionUpdatedAt ? `Updated ${new Date(step.executionUpdatedAt).toLocaleString()}` : ''}
                    {step.executionUpdatedAt && step.completedAt ? ' · ' : ''}
                    {step.completedAt ? `Completed ${new Date(step.completedAt).toLocaleString()}` : ''}
                  </p>
                )}
              </div>
              {step.blockers.length > 0 && <p className="mt-3 text-xs text-warning">Blocked by: {step.blockers.join(' · ')}</p>}
            </div>
          ))}
        </div>
      </Card>

      {(plan.summary.recentExecutionActivity?.length ?? 0) > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Recent execution activity</h3>
              <p className="text-sm text-text-secondary">Latest name-change workflow updates captured from step execution notes and status changes.</p>
              <p className="mt-2 text-xs text-text-secondary">{plan.summary.activitySourceCounts?.step ?? 0} step updates · {plan.summary.activitySourceCounts?.reminder ?? 0} reminder actions</p>
              <p className="mt-1 text-xs text-text-secondary">Latest movement posture: {plan.summary.latestMovementPosture ?? 'mixed'}</p>
              <p className="mt-1 text-xs text-text-secondary">Dominant movement lane: {plan.summary.dominantMovementLane ?? 'mixed'}</p>
              {plan.summary.mixedMovementReason && <p className="mt-1 text-xs text-text-secondary">Mixed movement reason: {plan.summary.mixedMovementReason}</p>}
              {plan.summary.mixedMovementReason && <p className="mt-1 text-xs text-text-secondary">Mixed window still shows untouched risk: {plan.summary.mixedMovementHasUntouchedRisk ? 'yes' : 'no'}</p>}
              {plan.summary.mixedMovementReason && <p className="mt-1 text-xs text-text-secondary">Mixed window reminder-heavy: {plan.summary.mixedMovementReminderHeavy ? 'yes' : 'no'}</p>}
              <p className="mt-1 text-xs text-text-secondary">Reminder churn risk: {plan.summary.reminderChurnRisk ?? 'low'}</p>
              <p className="mt-1 text-xs text-text-secondary">Recent completion: {plan.summary.hasRecentCompletion ? 'yes' : 'no'}</p>
              <p className="mt-1 text-xs text-text-secondary">Recent start: {plan.summary.hasRecentStart ? 'yes' : 'no'}</p>
              <p className="mt-1 text-xs text-text-secondary">Untouched risk still visible: {plan.summary.hasRecentUntouchedRisk ? 'yes' : 'no'}</p>
              <p className="mt-1 text-xs text-text-secondary">Zero recent step movement: {plan.summary.hasZeroRecentStepMovement ? 'yes' : 'no'}</p>
            </div>
            <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
              {plan.summary.recentExecutionActivity?.length ?? 0} recent updates
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {plan.summary.recentExecutionActivity?.map((item) => (
              <div key={`${item.stepId}-${item.timestamp}`} className="rounded-xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                    <p className="mt-1 text-xs text-text-secondary">{new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{item.source}</span>
                    <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{item.executionStatus}</span>
                  </div>
                </div>
                {item.note && <p className="mt-3 text-sm text-text-secondary">{item.note}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {reminderAttention.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Reminder attention needed</h3>
              <p className="text-sm text-text-secondary">Open reminders still tied to incomplete workflow steps.</p>
              <p className="mt-2 text-xs text-text-secondary">{reminderAttentionSummary.highUrgency} high urgency · {reminderAttentionSummary.actionablePriority} actionable priority · {reminderAttentionSummary.blockedAndStale} blocked + stale</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/70 px-2 py-1 text-xs text-text-secondary">{reminderAttention.length} attention item{reminderAttention.length === 1 ? '' : 's'}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemindersChange(bulkUpdateNameChangeReminderStatus(effectiveReminders, reminderAttention.map((item) => item.reminderKey), 'scheduled'), { action: 'bulk-update' })}
              >
                Schedule all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemindersChange(bulkUpdateNameChangeReminderStatus(effectiveReminders, reminderAttention.map((item) => item.reminderKey), 'dismissed'), { action: 'bulk-update' })}
              >
                Dismiss all
              </Button>
              {reminderAttentionSummary.stale > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemindersChange(bulkUpdateNameChangeReminderStatus(effectiveReminders, reminderAttention.filter((item) => item.isStale).map((item) => item.reminderKey), 'scheduled'), { action: 'schedule-stale' })}
                >
                  Schedule stale
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {reminderPostureCards.map(({ key, ...card }) => (
              <ReminderPostureCard key={key} {...card} />
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-warning/20 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Actionable split</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{reminderAttentionSummary.actionablePriority} priority · {reminderAttentionSummary.actionableNormal} normal</p>
              <p className="mt-2 text-xs text-text-secondary">{reminderAttentionSummary.actionableAndStale} actionable + stale · posture {reminderAttentionSummary.actionableFreshPosture}</p>
            </div>
            <div className="rounded-xl border border-warning/20 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Stale actionable split</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{reminderAttentionSummary.actionableStalePriority} priority · {reminderAttentionSummary.actionableStaleNormal} normal</p>
              <p className="mt-2 text-xs text-text-secondary">Posture {reminderAttentionSummary.staleActionablePosture}</p>
            </div>
            <div className="rounded-xl border border-warning/20 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Blocked stale split</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{reminderAttentionSummary.blockedStalePriority} priority · {reminderAttentionSummary.blockedStaleNormal} normal</p>
              <p className="mt-2 text-xs text-text-secondary">Posture {reminderAttentionSummary.blockedStalePosture} · stale priority {reminderAttentionSummary.stalePriority}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {reminderAttention.map((item) => (
              <div key={item.reminderKey} className="rounded-xl border border-warning/20 bg-white/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">Depends on {item.dependentStepTitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.priorityTier && <span className={`rounded-full px-2 py-1 text-xs ${item.priorityTier === 'critical' ? 'bg-danger/10 text-danger' : item.priorityTier === 'elevated' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>{item.priorityTier}</span>}
                    {item.actionability && <span className={`rounded-full px-2 py-1 text-xs ${item.actionability === 'blocked_by_untouched_step' ? 'bg-surface-subtle text-text-secondary' : 'bg-primary/10 text-primary'}`}>{item.actionability === 'blocked_by_untouched_step' ? 'blocked' : 'actionable'}</span>}
                    {item.isStale && <span className="rounded-full bg-warning/10 px-2 py-1 text-xs text-warning">stale</span>}
                    <span className={`rounded-full px-2 py-1 text-xs ${item.urgency === 'high' ? 'bg-warning/10 text-warning' : item.urgency === 'medium' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>{item.urgency}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-text-secondary">Step is still {item.dependentStepExecutionStatus.replace('_', ' ')} · reminder is {item.reminderStatus}</p>
                <p className="mt-2 text-xs font-medium text-text-primary">Follow-up target: {item.suggestedOffsetDays} day{item.suggestedOffsetDays === 1 ? '' : 's'} after the triggering step</p>
                <p className="mt-2 text-xs text-text-secondary">Last workflow touch: {item.lastTouchedAt ? new Date(item.lastTouchedAt).toLocaleString() : 'No execution updates yet'}</p>
                <div className="mt-3 flex gap-2">
                  {item.reminderStatus !== 'scheduled' && (
                    <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, item.reminderKey, 'scheduled'), { action: 'single-update' })}>Schedule</Button>
                  )}
                  {item.reminderStatus !== 'dismissed' && (
                    <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, item.reminderKey, 'dismissed'), { action: 'single-update' })}>Dismiss</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {effectiveReminders.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Suggested follow-up reminders</h3>
              <p className="text-sm text-text-secondary">Scaffolding for planner/admin follow-up timing based on the generated workflow.</p>
              <p className="mt-2 text-xs text-text-secondary">{reminderSummary.pending} pending · {reminderSummary.highUrgencyOpen} high-urgency open</p>
            </div>
            <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{effectiveReminders.length} reminders</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {effectiveReminders.map((reminder) => (
              <div key={reminder.reminder_key} className="rounded-xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{reminder.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">Depends on: {reminder.depends_on_step_id}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${reminder.urgency === 'high' ? 'bg-warning/10 text-warning' : reminder.urgency === 'medium' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>
                    {reminder.urgency}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{reminder.reason}</p>
                <p className="mt-3 text-xs font-medium text-text-primary">Target follow-up: {reminder.suggested_offset_days} day{reminder.suggested_offset_days === 1 ? '' : 's'} after the triggering step</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{reminder.status}</span>
                  <div className="flex gap-2">
                    {reminder.status !== 'scheduled' && (
                      <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, reminder.reminder_key, 'scheduled'), { action: 'single-update' })}>Schedule</Button>
                    )}
                    {reminder.status !== 'dismissed' && (
                      <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, reminder.reminder_key, 'dismissed'), { action: 'single-update' })}>Dismiss</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Rules + registry review</h3>
            <p className="text-sm text-text-secondary">Basic admin tooling for this phase: review what drives the engine.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAdmin((value) => !value)}>{showAdmin ? 'Hide review' : 'Show review'}</Button>
        </div>

        {showAdmin && (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-text-primary">Seeded forms ({NAME_CHANGE_FORM_REGISTRY.length})</p>
              </div>
              <div className="mt-3 space-y-3">
                {NAME_CHANGE_FORM_REGISTRY.map((form) => (
                  <div key={form.code} className="rounded-lg bg-surface-subtle/50 p-3">
                    <p className="text-sm font-medium text-text-primary">{form.code} — {form.title}</p>
                    <p className="mt-1 text-xs text-text-secondary">{form.authority} · {form.jurisdiction}</p>
                    <p className="mt-1 text-xs text-text-secondary">Triggers: {form.appliesWhen.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-text-primary">Institution library ({NAME_CHANGE_INSTITUTION_LIBRARY.length})</p>
              </div>
              <div className="mt-3 space-y-3">
                {NAME_CHANGE_INSTITUTION_LIBRARY.map((institution) => (
                  <div key={institution.key} className="rounded-lg bg-surface-subtle/50 p-3">
                    <p className="text-sm font-medium text-text-primary">{institution.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">Category: {institution.category}</p>
                    <p className="mt-1 text-xs text-text-secondary">{institution.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
