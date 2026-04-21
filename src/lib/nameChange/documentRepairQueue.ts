import type {
  NameChangeDocumentContractStatus,
  NameChangeGuidedAction,
  NameChangeDocumentIntakeSnapshot,
  NameChangeDocumentKind,
  NameChangeTargetExecutionSnapshot,
  NameChangeExtractionFieldKey,
} from './types';

export interface NameChangeDocumentRepairQueueItem {
  kind: NameChangeDocumentKind;
  label: string;
  severity: 'blocking' | 'attention';
  score: number;
  impactSummary: string;
  payoffSummary: string;
  nextActions: NameChangeGuidedAction[];
  impactedTargets: string[];
  impactedFields: Array<{
    fieldKey: string;
    label: string;
    targetLabel: string;
    severity: 'blocking' | 'attention';
  }>;
  blockingRiskCount: number;
  attentionRiskCount: number;
  metadataMissing: string[];
  missingExtractionFields: string[];
  intakeStatus: NameChangeDocumentContractStatus['intakeStatus'];
  required: boolean;
}

export function buildNameChangeDocumentRepairQueue(
  intake: NameChangeDocumentIntakeSnapshot,
  executionSnapshots: NameChangeTargetExecutionSnapshot[],
): NameChangeDocumentRepairQueueItem[] {
  const queue: Array<NameChangeDocumentRepairQueueItem | null> = intake.documents
    .map((document): NameChangeDocumentRepairQueueItem | null => {
      const impactedTargets = new Set<string>();
      const impactedFields = new Map<string, {
        fieldKey: string;
        label: string;
        targetLabel: string;
        severity: 'blocking' | 'attention';
      }>();
      let blockingRiskCount = 0;
      let attentionRiskCount = 0;

      executionSnapshots.forEach((snapshot) => {
        snapshot.fieldRisks.forEach((risk) => {
          if (risk.sourceDocumentKind !== document.kind) return;
          impactedTargets.add(snapshot.targetLabel);
          impactedFields.set(`${snapshot.targetKey}:${risk.fieldKey}`, {
            fieldKey: risk.fieldKey,
            label: risk.label,
            targetLabel: snapshot.targetLabel,
            severity: risk.severity,
          });
          if (risk.severity === 'blocking') blockingRiskCount += 1;
          else attentionRiskCount += 1;
        });
      });

      const hasRepairNeed = document.intakeStatus === 'not_started'
        ? document.required
        : document.metadataMissing.length > 0 || document.missingExtractionFields.length > 0;

      if (!hasRepairNeed && blockingRiskCount === 0 && attentionRiskCount === 0) return null;

      const severity: 'blocking' | 'attention' = document.required && (
        document.intakeStatus === 'not_started' ||
        blockingRiskCount > 0 ||
        document.metadataMissing.length > 0
      )
        ? 'blocking'
        : 'attention';

      const issueBits: string[] = [];
      const nextActions: NameChangeGuidedAction[] = [];
      if (document.intakeStatus === 'not_started') issueBits.push('not started');
      if (document.metadataMissing.length > 0) issueBits.push(`${document.metadataMissing.length} metadata gaps`);
      if (document.missingExtractionFields.length > 0) issueBits.push(`${document.missingExtractionFields.length} extraction gaps`);
      if (blockingRiskCount > 0) issueBits.push(`${blockingRiskCount} blocking field risks`);
      if (attentionRiskCount > 0) issueBits.push(`${attentionRiskCount} attention field risks`);

      if (document.intakeStatus === 'not_started') {
        nextActions.push({
          category: 'document',
          label: `Add ${document.label.toLowerCase()} to intake`,
          detail: 'Capture baseline metadata so this document can support downstream packets.',
        });
      }
      if (document.metadataMissing.length > 0) {
        nextActions.push({
          category: 'document',
          label: `Fill metadata for ${document.label.toLowerCase()}`,
          detail: `Missing metadata: ${document.metadataMissing.join(', ')}.`,
        });
      }
      if (document.missingExtractionFields.length > 0) {
        nextActions.push({
          category: 'document',
          label: `Capture extraction fields for ${document.label.toLowerCase()}`,
          detail: `Missing extraction fields: ${document.missingExtractionFields.join(', ')}.`,
        });
      }
      if (blockingRiskCount > 0 && impactedTargets.size > 0) {
        nextActions.push({
          category: 'packet',
          label: `Rebuild packet trust for ${[...impactedTargets].slice(0, 3).join(', ')}`,
          detail: 'Refresh document-backed packet fields after this document is cleaned up.',
        });
      }
      if (impactedFields.size > 0) {
        const fieldPreview = [...impactedFields.values()].slice(0, 3).map((field) => `${field.label} (${field.targetLabel})`).join(', ');
        nextActions.push({
          category: 'review',
          label: 'Recheck impacted packet fields',
          detail: `${fieldPreview}.`,
        });
      }

      const score =
        (severity === 'blocking' ? 100 : 0) +
        (document.required ? 30 : 0) +
        (blockingRiskCount * 10) +
        (attentionRiskCount * 4) +
        (document.metadataMissing.length * 3) +
        (document.missingExtractionFields.length * 2) +
        (document.intakeStatus === 'not_started' ? 15 : 0);

      const payoffBits: string[] = [];
      if (blockingRiskCount > 0) payoffBits.push(`removes ${blockingRiskCount} blocking field risk${blockingRiskCount === 1 ? '' : 's'}`);
      if (attentionRiskCount > 0) payoffBits.push(`clears ${attentionRiskCount} attention field risk${attentionRiskCount === 1 ? '' : 's'}`);
      if (impactedTargets.size > 0) payoffBits.push(`helps ${impactedTargets.size} target${impactedTargets.size === 1 ? '' : 's'}`);
      if (payoffBits.length === 0 && document.required && document.intakeStatus === 'not_started') {
        payoffBits.push('restores a missing required artifact');
      }

      return {
        kind: document.kind,
        label: document.label,
        severity,
        score,
        impactSummary: issueBits.join(' · '),
        payoffSummary: payoffBits.join(' · '),
        nextActions,
        impactedTargets: [...impactedTargets],
        impactedFields: [...impactedFields.values()],
        blockingRiskCount,
        attentionRiskCount,
        metadataMissing: document.metadataMissing,
        missingExtractionFields: document.missingExtractionFields as NameChangeExtractionFieldKey[],
        intakeStatus: document.intakeStatus,
        required: document.required,
      };
    });

  return queue
    .filter((item): item is NameChangeDocumentRepairQueueItem => item !== null)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}
