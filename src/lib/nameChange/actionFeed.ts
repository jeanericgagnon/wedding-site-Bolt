import { getNameChangeGuidedActionWeight } from './executionPrioritization';
import type { NameChangeDocumentRepairQueueItem } from './documentRepairQueue';
import type { NameChangeGuidedAction, NameChangePlan, NameChangeReminderAttentionItem, NameChangeTargetExecutionSnapshot } from './types';

export interface NameChangeActionFeedItem {
  key: string;
  origin: 'execution' | 'document_repair' | 'reminder';
  sectionKey: 'core-government' | 'work-identity' | 'institutional' | 'cleanup' | 'documents';
  title: string;
  laneLabel: string;
  severity: 'blocking' | 'attention' | 'ready';
  urgencyTier: 'critical' | 'elevated' | 'normal';
  urgencyReason: 'blocking_dependency' | 'packet_trust' | 'document_gap' | 'review_queue';
  score: number;
  plannerIntent: 'open_execution_card' | 'open_document_repair' | 'open_account_update_template';
  focusTargetId: string;
  action: NameChangeGuidedAction;
}

type AccountUpdateTemplate = NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number];

function getTemplateIdForTargetKey(targetKey: NameChangeTargetExecutionSnapshot['targetKey']) {
  switch (targetKey) {
    case 'employer':
      return 'template-payroll';
    case 'banks':
      return 'template-bank';
    case 'insurance':
      return 'template-insurance';
    case 'utilities':
      return 'template-digital-identity';
    case 'tsa':
    case 'courtesy':
      return 'template-travel';
    case 'licenses':
      return 'template-licenses';
    default:
      return null;
  }
}

function getTemplateUrgencyBoost(template: AccountUpdateTemplate | undefined) {
  if (!template) return 0;
  if (template.readiness === 'ready' || template.readiness === 'complete') return 18;
  if (template.readiness === 'in_progress') return 12;
  if (template.readiness === 'upcoming') return 6;
  return 0;
}

function getActionDocumentKind(item: NameChangeActionFeedItem) {
  return item.action.category === 'document' ? item.action.documentKind : undefined;
}

function isCaseSetupExecutionAction(action: NameChangeGuidedAction) {
  if (action.category !== 'dependency') return false;

  return action.label === 'Unblock Case legal-name setup complete'
    || action.detail.startsWith('Case setup is still missing ');
}

function dedupeDocumentRoutedExecutionItems(items: NameChangeActionFeedItem[]) {
  const retainedByDocumentKind = new Map<string, NameChangeActionFeedItem>();
  const passthrough: NameChangeActionFeedItem[] = [];

  items.forEach((item) => {
    if (item.plannerIntent !== 'open_document_repair') {
      passthrough.push(item);
      return;
    }

    const documentKind = getActionDocumentKind(item);
    if (!documentKind) {
      passthrough.push(item);
      return;
    }

    const retained = retainedByDocumentKind.get(documentKind);
    if (!retained || item.score > retained.score || (item.score === retained.score && item.title.localeCompare(retained.title) < 0)) {
      retainedByDocumentKind.set(documentKind, item);
    }
  });

  return [...passthrough, ...retainedByDocumentKind.values()];
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

function getActionFeedUrgencyReason(action: NameChangeGuidedAction, severity: NameChangeActionFeedItem['severity']): NameChangeActionFeedItem['urgencyReason'] {
  if (action.category === 'dependency' && severity === 'blocking') return 'blocking_dependency';
  if (action.category === 'packet') return 'packet_trust';
  if (action.category === 'document') return 'document_gap';
  return 'review_queue';
}

function getExecutionSectionKey(targetKey: NameChangeTargetExecutionSnapshot['targetKey']): NameChangeActionFeedItem['sectionKey'] {
  if (targetKey === 'ssa' || targetKey === 'dmv' || targetKey === 'passport') return 'core-government';
  if (targetKey === 'employer' || targetKey === 'licenses') return 'work-identity';
  if (targetKey === 'banks' || targetKey === 'insurance' || targetKey === 'medical' || targetKey === 'utilities') return 'institutional';
  return 'cleanup';
}

function buildDocumentRepairLaneLabel(item: NameChangeDocumentRepairQueueItem) {
  if (item.impactedTargets.length === 0) {
    return 'Document repair';
  }

  if (item.impactedTargets.length === 1) {
    return `${item.impactedTargets[0]} unblock`;
  }

  return `${item.impactedTargets[0]} +${item.impactedTargets.length - 1} more`;
}

function getReminderSectionKey(dependsOnStepId: string): NameChangeActionFeedItem['sectionKey'] {
  if (dependsOnStepId === 'federal-ssa' || dependsOnStepId === 'state-dmv' || dependsOnStepId === 'federal-passport') {
    return 'core-government';
  }

  if (
    dependsOnStepId === 'institution-employer'
    || dependsOnStepId === 'institution-licenses'
    || dependsOnStepId === 'institution-voter-registration'
    || dependsOnStepId === 'institution-courtesy-notifications'
    || dependsOnStepId === 'institution-travel-hospitality'
  ) {
    return 'work-identity';
  }

  if (
    dependsOnStepId === 'institutions-rollout'
    || dependsOnStepId === 'institution-banks'
    || dependsOnStepId === 'institution-insurance'
    || dependsOnStepId === 'institution-medical-records'
    || dependsOnStepId === 'institution-utilities'
  ) {
    return 'institutional';
  }

  return 'cleanup';
}

function isCaseSetupReminder(item: NameChangeReminderAttentionItem) {
  return item.reminderKey === 'reminder-case-legal-name-setup';
}

function getReminderFocusTargetId(item: NameChangeReminderAttentionItem) {
  if (isCaseSetupReminder(item)) return 'case-setup';

  const { dependsOnStepId } = item;
  if (dependsOnStepId === 'eligibility-proof') return 'execution-card-ssa';
  if (dependsOnStepId === 'federal-ssa') return 'execution-card-ssa';
  if (dependsOnStepId === 'state-dmv') return 'execution-card-dmv';
  if (dependsOnStepId === 'federal-passport') return 'execution-card-passport';
  if (dependsOnStepId === 'institutions-rollout') return 'execution-card-banks';
  return 'reminder-attention';
}

function getReminderScore(item: NameChangeReminderAttentionItem) {
  const urgencyWeight = item.priorityTier === 'critical' ? 320 : item.priorityTier === 'elevated' ? 230 : 170;
  const actionabilityWeight = item.actionability === 'actionable_now' ? 35 : 0;
  const staleWeight = item.isStale ? 20 : 0;
  const inProgressWeight = item.dependentStepExecutionStatus === 'in_progress' ? 10 : 0;
  return urgencyWeight + actionabilityWeight + staleWeight + inProgressWeight;
}

export function buildNameChangeActionFeed(
  executionSnapshots: NameChangeTargetExecutionSnapshot[],
  documentRepairQueue: NameChangeDocumentRepairQueueItem[],
  reminderAttention: NameChangeReminderAttentionItem[] = [],
  accountUpdateTemplates: AccountUpdateTemplate[] = [],
): NameChangeActionFeedItem[] {
  const templatesById = new Map(accountUpdateTemplates.map((template) => [template.id, template]));
  const executionItems: NameChangeActionFeedItem[] = executionSnapshots.map((snapshot) => {
    const severity = getExecutionSeverity(snapshot);
    const routesToDocumentRepair = snapshot.nextAction.category === 'document' && Boolean(snapshot.nextAction.documentKind);
    const routesToCaseSetup = isCaseSetupExecutionAction(snapshot.nextAction);
    const linkedTemplate = (() => {
      const templateId = getTemplateIdForTargetKey(snapshot.targetKey);
      return templateId ? templatesById.get(templateId) : undefined;
    })();
    const routesToTemplate = !routesToDocumentRepair && !routesToCaseSetup && linkedTemplate && linkedTemplate.readiness !== 'blocked';
    const score =
      (getSeverityWeight(severity) * 100) +
      (snapshot.blockers.length * 10) +
      (snapshot.readinessSummary.blockingFieldRisks * 5) +
      getNameChangeGuidedActionWeight(snapshot.nextAction.category) +
      getTemplateUrgencyBoost(linkedTemplate);
    return {
      key: `execution:${snapshot.targetKey}`,
      origin: 'execution',
      sectionKey: getExecutionSectionKey(snapshot.targetKey),
      title: snapshot.targetLabel,
      laneLabel: routesToTemplate
        ? `${linkedTemplate.audience} · ${linkedTemplate.readiness.replace('_', ' ')} template`
        : snapshot.recommendedFormCode,
      severity,
      urgencyTier: getActionFeedUrgencyTier(score, severity),
      urgencyReason: getActionFeedUrgencyReason(snapshot.nextAction, severity),
      plannerIntent: routesToDocumentRepair
        ? 'open_document_repair'
        : routesToTemplate
          ? 'open_account_update_template'
          : 'open_execution_card',
      focusTargetId: routesToDocumentRepair
        ? `document-${snapshot.nextAction.documentKind}`
        : routesToCaseSetup
          ? 'case-setup'
          : routesToTemplate
            ? 'account-update-templates'
            : `execution-card-${snapshot.targetKey}`,
      score,
      action: routesToTemplate
        ? {
            ...snapshot.nextAction,
            detail: `${snapshot.nextAction.detail} ${linkedTemplate.readinessLabel}`.trim(),
          }
        : snapshot.nextAction,
    };
  });

  const documentItems: NameChangeActionFeedItem[] = documentRepairQueue
    .filter((item) => item.nextActions.length > 0)
    .map((item) => ({
      key: `document:${item.kind}`,
      origin: 'document_repair',
      sectionKey: 'documents' as const,
      title: item.label,
      laneLabel: buildDocumentRepairLaneLabel(item),
      severity: item.severity,
      urgencyTier: getActionFeedUrgencyTier(item.score, item.severity),
      urgencyReason: getActionFeedUrgencyReason(item.nextActions[0], item.severity),
      plannerIntent: 'open_document_repair' as const,
      focusTargetId: `document-${item.kind}`,
      score: item.score,
      action: item.nextActions[0],
    }));

  const reminderItems: NameChangeActionFeedItem[] = reminderAttention.map((item) => {
    const score = getReminderScore(item);
    return {
      key: `reminder:${item.reminderKey}`,
      origin: 'reminder',
      sectionKey: item.sectionKey ?? getReminderSectionKey(item.dependsOnStepId),
      title: item.label,
      laneLabel: item.dependentStepTitle,
      severity: item.priorityTier === 'critical' || item.actionability === 'blocked_by_untouched_step' ? 'blocking' : 'attention',
      urgencyTier: item.priorityTier ?? 'normal',
      urgencyReason: 'review_queue',
      plannerIntent: item.plannerIntent ?? 'open_execution_card',
      focusTargetId: item.focusTargetId ?? getReminderFocusTargetId(item),
      score,
      action: {
        category: 'checklist',
        label: item.label,
        detail: item.isStale
          ? `${item.dependentStepTitle} has stale reminder follow-through.`
          : item.actionability === 'blocked_by_untouched_step'
            ? `${item.dependentStepTitle} still needs first-touch execution before this reminder can clear.`
            : item.dependentStepTitle,
      },
    };
  });

  const routedExecutionItems = dedupeDocumentRoutedExecutionItems(executionItems);
  const queuedDocumentKinds = new Set(documentItems.map((item) => getActionDocumentKind(item)).filter(Boolean));
  const dedupedExecutionItems = routedExecutionItems.filter((item) => {
    if (item.plannerIntent !== 'open_document_repair') return true;
    const documentKind = getActionDocumentKind(item);
    return !documentKind || !queuedDocumentKinds.has(documentKind);
  });

  return [...dedupedExecutionItems, ...documentItems, ...reminderItems]
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
}
