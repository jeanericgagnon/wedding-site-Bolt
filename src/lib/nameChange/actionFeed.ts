import { getNameChangeGuidedActionWeight } from './executionPrioritization';
import type { NameChangeDocumentRepairQueueItem } from './documentRepairQueue';
import type { NameChangeGuidedAction, NameChangeTargetExecutionSnapshot } from './types';

export interface NameChangeActionFeedItem {
  key: string;
  origin: 'execution' | 'document_repair';
  sectionKey: 'core-government' | 'work-identity' | 'institutional' | 'cleanup' | 'documents';
  title: string;
  laneLabel: string;
  severity: 'blocking' | 'attention' | 'ready';
  urgencyTier: 'critical' | 'elevated' | 'normal';
  score: number;
  plannerIntent: 'open_execution_card' | 'open_document_repair';
  focusTargetId: string;
  action: NameChangeGuidedAction;
}

function getSeverityWeight(severity: NameChangeActionFeedItem['severity']) {
  switch (severity) {
    case 'blocking':
      return 3;
    case 'attention':
      return 2;
    case 'ready':
    default:
      return 1;
  }
}

function getExecutionSeverity(snapshot: NameChangeTargetExecutionSnapshot): NameChangeActionFeedItem['severity'] {
  if (!snapshot.ready) return snapshot.blockers.length > 0 || snapshot.readinessSummary.blockingFieldRisks > 0 ? 'blocking' : 'attention';
  return 'ready';
}

function getActionFeedUrgencyTier(score: number, severity: NameChangeActionFeedItem['severity']): NameChangeActionFeedItem['urgencyTier'] {
  if (severity === 'blocking' && score >= 300) return 'critical';
  if (severity === 'blocking' || score >= 180) return 'elevated';
  return 'normal';
}

function getExecutionSectionKey(targetKey: NameChangeTargetExecutionSnapshot['targetKey']): NameChangeActionFeedItem['sectionKey'] {
  if (targetKey === 'ssa' || targetKey === 'dmv' || targetKey === 'passport') return 'core-government';
  if (targetKey === 'employer' || targetKey === 'licenses') return 'work-identity';
  if (targetKey === 'banks' || targetKey === 'insurance' || targetKey === 'medical' || targetKey === 'utilities') return 'institutional';
  return 'cleanup';
}

export function buildNameChangeActionFeed(
  executionSnapshots: NameChangeTargetExecutionSnapshot[],
  documentRepairQueue: NameChangeDocumentRepairQueueItem[],
): NameChangeActionFeedItem[] {
  const executionItems: NameChangeActionFeedItem[] = executionSnapshots.map((snapshot) => {
    const severity = getExecutionSeverity(snapshot);
    const score =
      (getSeverityWeight(severity) * 100) +
      (snapshot.blockers.length * 10) +
      (snapshot.readinessSummary.blockingFieldRisks * 5) +
      getNameChangeGuidedActionWeight(snapshot.nextAction.category);
    return {
      key: `execution:${snapshot.targetKey}`,
      origin: 'execution',
      sectionKey: getExecutionSectionKey(snapshot.targetKey),
      title: snapshot.targetLabel,
      laneLabel: snapshot.recommendedFormCode,
      severity,
      urgencyTier: getActionFeedUrgencyTier(score, severity),
      plannerIntent: 'open_execution_card',
      focusTargetId: `execution-card-${snapshot.targetKey}`,
      score,
      action: snapshot.nextAction,
    };
  });

  const documentItems: NameChangeActionFeedItem[] = documentRepairQueue
    .filter((item) => item.nextActions.length > 0)
    .map((item) => ({
      key: `document:${item.kind}`,
      origin: 'document_repair',
      sectionKey: 'documents' as const,
      title: item.label,
      laneLabel: 'Document repair',
      severity: item.severity,
      urgencyTier: getActionFeedUrgencyTier(item.score, item.severity),
      plannerIntent: 'open_document_repair' as const,
      focusTargetId: `document-${item.kind}`,
      score: item.score,
      action: item.nextActions[0],
    }));

  return [...executionItems, ...documentItems]
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
}
