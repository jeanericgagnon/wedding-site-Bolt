import type {
  NameChangeDocumentContractStatus,
  NameChangeGuidedAction,
  NameChangeDocumentIntakeSnapshot,
  NameChangeDocumentKind,
  NameChangeTargetExecutionSnapshot,
  NameChangeExtractionFieldKey,
} from './types';
import { getNameChangeGuidedActionWeight } from './executionPrioritization';

export interface NameChangeDocumentRepairQueueItem {
  kind: NameChangeDocumentKind;
  label: string;
  severity: 'blocking' | 'attention';
  score: number;
  impactSummary: string;
  payoffSummary: string;
  nextActions: NameChangeGuidedAction[];
  impactedTargets: string[];
  canonicalConflictCount: number;
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

function getDocumentRepairActionPriority(action: NameChangeGuidedAction) {
  const categoryWeight = getNameChangeGuidedActionWeight(action.category) * 100;

  if (action.category === 'document') {
    if (action.label.startsWith('Capture ')) return categoryWeight + 30;
    if (action.label.startsWith('Resolve ')) return categoryWeight + 20;
    if (action.label.startsWith('Fill ')) return categoryWeight + 10;
  }

  return categoryWeight;
}

function prioritizeDocumentRepairActions(actions: NameChangeGuidedAction[]) {
  return [...actions].sort((left, right) => getDocumentRepairActionPriority(right) - getDocumentRepairActionPriority(left));
}

function buildExtractionRepairAction(
  document: Pick<NameChangeDocumentRepairQueueItem, 'kind' | 'label'>,
  actionableMissingExtractionFields: NameChangeExtractionFieldKey[],
  metadataMissing: string[],
): NameChangeGuidedAction {
  if (document.kind === 'marriage_certificate') {
    const missingCounty = actionableMissingExtractionFields.includes('county');
    const missingCertificateNumber = actionableMissingExtractionFields.includes('certificate_number');
    const missingIssuingAuthority = metadataMissing.includes('issuing authority');

    if (missingCounty && missingCertificateNumber && missingIssuingAuthority) {
      return {
        category: 'document',
        label: 'Capture county + certificate number + issuing authority for certified marriage certificate',
        detail: 'Out-of-state marriage follow-through needs grounded county, certificate-number extraction, and issuing-authority metadata from the marriage certificate.',
        documentKind: 'marriage_certificate',
      };
    }

    if (missingCounty && missingCertificateNumber) {
      return {
        category: 'document',
        label: 'Capture county + certificate number for certified marriage certificate',
        detail: 'Out-of-state marriage follow-through needs grounded county and certificate-number extraction from the marriage certificate.',
        documentKind: 'marriage_certificate',
      };
    }

    if (missingCounty && missingIssuingAuthority) {
      return {
        category: 'document',
        label: 'Capture county + issuing authority for certified marriage certificate',
        detail: 'Out-of-state marriage follow-through still needs grounded county extraction and issuing-authority metadata from the marriage certificate.',
        documentKind: 'marriage_certificate',
      };
    }

    if (missingCertificateNumber && missingIssuingAuthority) {
      return {
        category: 'document',
        label: 'Capture certificate number + issuing authority for certified marriage certificate',
        detail: 'Out-of-state marriage follow-through still needs grounded certificate-number extraction and issuing-authority metadata from the marriage certificate.',
        documentKind: 'marriage_certificate',
      };
    }

    if (missingCounty) {
      return {
        category: 'document',
        label: 'Capture county for certified marriage certificate',
        detail: 'Out-of-state marriage follow-through still needs grounded county extraction from the marriage certificate.',
        documentKind: 'marriage_certificate',
      };
    }

    if (missingCertificateNumber) {
      return {
        category: 'document',
        label: 'Capture certificate number for certified marriage certificate',
        detail: 'Out-of-state marriage follow-through still needs grounded certificate-number extraction from the marriage certificate.',
        documentKind: 'marriage_certificate',
      };
    }

    if (missingIssuingAuthority) {
      return {
        category: 'document',
        label: 'Capture issuing authority for certified marriage certificate',
        detail: 'Out-of-state marriage follow-through still needs issuing-authority metadata from the marriage certificate.',
        documentKind: 'marriage_certificate',
      };
    }
  }

  return {
    category: 'document',
    label: `Capture extraction fields for ${document.label.toLowerCase()}`,
    detail: `Missing extraction fields: ${actionableMissingExtractionFields.join(', ')}.`,
    documentKind: document.kind,
  };
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

      const canonicalConflictCount = document.canonicalConflicts.length;
      const actionableMissingExtractionFields = document.missingExtractionFields.length > 0
        ? document.missingExtractionFields
        : document.latentMissingExtractionFields;

      executionSnapshots.forEach((snapshot) => {
        if (snapshot.nextAction.category === 'document' && snapshot.nextAction.documentKind === document.kind) {
          impactedTargets.add(snapshot.targetLabel);
        }

        snapshot.fieldRisks.forEach((risk) => {
          const matchesDocument = risk.sourceDocumentKind === document.kind
            || (!risk.sourceDocumentKind && Boolean(risk.sourceFieldKey)
              && actionableMissingExtractionFields.includes(risk.sourceFieldKey as NameChangeExtractionFieldKey));
          if (!matchesDocument) return;
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
        : document.metadataMissing.length > 0 || actionableMissingExtractionFields.length > 0 || canonicalConflictCount > 0;

      if (!hasRepairNeed && blockingRiskCount === 0 && attentionRiskCount === 0) return null;

      const severity: 'blocking' | 'attention' = document.required && (
        document.intakeStatus === 'not_started' ||
        blockingRiskCount > 0 ||
        document.metadataMissing.length > 0 ||
        canonicalConflictCount > 0
      )
        ? 'blocking'
        : 'attention';

      const issueBits: string[] = [];
      const nextActions: NameChangeGuidedAction[] = [];
      if (document.intakeStatus === 'not_started') issueBits.push('not started');
      if (document.metadataMissing.length > 0) issueBits.push(`${document.metadataMissing.length} metadata gaps`);
      if (actionableMissingExtractionFields.length > 0) issueBits.push(`${actionableMissingExtractionFields.length} extraction gaps`);
      if (canonicalConflictCount > 0) issueBits.push(`${canonicalConflictCount} canonical conflict${canonicalConflictCount === 1 ? '' : 's'}`);
      if (blockingRiskCount > 0) issueBits.push(`${blockingRiskCount} blocking field risks`);
      if (attentionRiskCount > 0) issueBits.push(`${attentionRiskCount} attention field risks`);

      if (document.intakeStatus === 'not_started') {
        nextActions.push({
          category: 'document',
          label: `Add ${document.label.toLowerCase()} to intake`,
          detail: 'Capture baseline metadata so this document can support downstream packets.',
          documentKind: document.kind,
        });
      }
      if (document.metadataMissing.length > 0) {
        nextActions.push({
          category: 'document',
          label: `Fill metadata for ${document.label.toLowerCase()}`,
          detail: `Missing metadata: ${document.metadataMissing.join(', ')}.`,
          documentKind: document.kind,
        });
      }
      if (actionableMissingExtractionFields.length > 0) {
        nextActions.push(buildExtractionRepairAction(
          document,
          actionableMissingExtractionFields as NameChangeExtractionFieldKey[],
          document.metadataMissing,
        ));
      } else if (document.kind === 'marriage_certificate' && document.metadataMissing.includes('issuing authority')) {
        nextActions.push(buildExtractionRepairAction(document, [], document.metadataMissing));
      }
      if (canonicalConflictCount > 0) {
        const preview = document.canonicalConflicts.slice(0, 2).map((conflict) => conflict.label).join(', ');
        nextActions.push({
          category: 'document',
          label: `Resolve canonical conflicts for ${document.label.toLowerCase()}`,
          detail: `${preview}${document.canonicalConflicts.length > 2 ? ', …' : ''}.`,
          documentKind: document.kind,
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

      const prioritizedNextActions = prioritizeDocumentRepairActions(nextActions);

      const score =
        (severity === 'blocking' ? 100 : 0) +
        (document.required ? 30 : 0) +
        (blockingRiskCount * 18) +
        (attentionRiskCount * 6) +
        (canonicalConflictCount * 12) +
        (document.metadataMissing.length * 3) +
        (actionableMissingExtractionFields.length * 2) +
        (document.intakeStatus === 'not_started' ? 15 : 0) +
        (impactedTargets.size * 8) +
        (prioritizedNextActions.length > 0 ? getNameChangeGuidedActionWeight(prioritizedNextActions[0].category) * 2 : 0);

      const payoffBits: string[] = [];
      const documentGapCount = document.metadataMissing.length + actionableMissingExtractionFields.length;
      if (canonicalConflictCount > 0) payoffBits.push(`resolves ${canonicalConflictCount} canonical conflict${canonicalConflictCount === 1 ? '' : 's'}`);
      if (blockingRiskCount > 0) payoffBits.push(`removes ${blockingRiskCount} blocking field risk${blockingRiskCount === 1 ? '' : 's'}`);
      else if (document.intakeStatus !== 'not_started' && documentGapCount > 0) payoffBits.push(`removes ${documentGapCount} document gap${documentGapCount === 1 ? '' : 's'}`);
      if (attentionRiskCount > 0) payoffBits.push(`clears ${attentionRiskCount} attention field risk${attentionRiskCount === 1 ? '' : 's'}`);
      if (impactedTargets.size > 0) payoffBits.push(`helps ${impactedTargets.size} target${impactedTargets.size === 1 ? '' : 's'}`);
      if (document.required && document.intakeStatus === 'not_started') {
        payoffBits.push('restores a missing required artifact');
      }

      return {
        kind: document.kind,
        label: document.label,
        severity,
        score,
        impactSummary: issueBits.join(' · '),
        payoffSummary: payoffBits.join(' · '),
        nextActions: prioritizedNextActions,
        impactedTargets: [...impactedTargets],
        canonicalConflictCount,
        impactedFields: [...impactedFields.values()],
        blockingRiskCount,
        attentionRiskCount,
        metadataMissing: document.metadataMissing,
        missingExtractionFields: actionableMissingExtractionFields as NameChangeExtractionFieldKey[],
        intakeStatus: document.intakeStatus,
        required: document.required,
      };
    });

  return queue
    .filter((item): item is NameChangeDocumentRepairQueueItem => item !== null)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}
