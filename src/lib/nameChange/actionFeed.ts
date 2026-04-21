import { getNameChangeGuidedActionWeight } from './executionPrioritization';
import type { NameChangeDocumentRepairQueueItem } from './documentRepairQueue';
import type { NameChangeGuidedAction, NameChangeTargetExecutionSnapshot } from './types';

export interface NameChangeActionFeedItem {
  key: string;
  origin: 'execution' | 'document_repair';
  title: string;
  laneLabel: string;
  severity: 'blocking' | 'attention' | 'ready';
  score: number;
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

export function buildNameChangeActionFeed(
  executionSnapshots: NameChangeTargetExecutionSnapshot[],
  documentRepairQueue: NameChangeDocumentRepairQueueItem[],
): NameChangeActionFeedItem[] {
  const executionItems: NameChangeActionFeedItem[] = executionSnapshots.map((snapshot) => {
    const severity = getExecutionSeverity(snapshot);
    return {
      key: `execution:${snapshot.targetKey}`,
      origin: 'execution',
      title: snapshot.targetLabel,
      laneLabel: snapshot.recommendedFormCode,
      severity,
      focusTargetId: `execution-card-${snapshot.targetKey}`,
      score:
        (getSeverityWeight(severity) * 100) +
        (snapshot.blockers.length * 10) +
        (snapshot.readinessSummary.blockingFieldRisks * 5) +
        getNameChangeGuidedActionWeight(snapshot.nextAction.category),
      action: snapshot.nextAction,
    };
  });

  const documentItems: NameChangeActionFeedItem[] = documentRepairQueue
    .filter((item) => item.nextActions.length > 0)
    .map((item) => ({
      key: `document:${item.kind}`,
      origin: 'document_repair',
      title: item.label,
      laneLabel: 'Document repair',
      severity: item.severity,
      focusTargetId: `document-${item.kind}`,
      score: item.score,
      action: item.nextActions[0],
    }));

  return [...executionItems, ...documentItems]
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
}
