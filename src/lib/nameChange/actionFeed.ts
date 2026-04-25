import { getNameChangeGuidedActionWeight } from './executionPrioritization';
import type { NameChangeDocumentRepairQueueItem } from './documentRepairQueue';
import { getFallbackBlockingProofHopLabel } from './engine';
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

function getEffectiveBlockingProofHopLabel(template: AccountUpdateTemplate) {
  return getFallbackBlockingProofHopLabel(template.readiness, template.blockingProofHopLabel);
}

function getTemplateIdForTargetKey(targetKey: NameChangeTargetExecutionSnapshot['targetKey']) {
  switch (targetKey) {
    case 'employer':
      return 'template-payroll';
    case 'taxes':
    case 'voter':
      return 'template-tax';
    case 'banks':
      return 'template-bank';
    case 'insurance':
    case 'medical':
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
  if (template.readiness === 'ready') return 18;
  if (template.readiness === 'complete') return 10;
  if (template.readiness === 'in_progress') return 0;
  if (template.readiness === 'upcoming') return 6;
  if (template.readiness === 'blocked') return 8;
  return 0;
}

function getTemplateFocusTargetId(template: AccountUpdateTemplate | undefined) {
  return template ? `account-update-template-${template.id}` : 'account-update-templates';
}

function getTemplateBlockedByLine(template: AccountUpdateTemplate) {
  const blockingProofHopLabel = getEffectiveBlockingProofHopLabel(template);
  return blockingProofHopLabel
    ? `Blocked by: ${blockingProofHopLabel}.`
    : template.readiness === 'in_progress'
      ? 'Blocked by: current proof pending.'
      : template.readiness === 'upcoming'
        ? 'Blocked by: next proof hop pending.'
        : template.readiness === 'blocked'
          ? 'Blocked by: proof chain pending.'
          : undefined;
}

function ensureTerminalPeriod(line: string | undefined) {
  if (!line) return undefined;
  const trimmed = line.trim();
  if (trimmed.replace(/[.\s]+$/u, '') === '') return undefined;
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

function formatInlineProofList(items: string[]) {
  return items
    .map((item) => item.trim().replace(/[.\s]+$/u, ''))
    .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index)
    .join(' · ');
}

function getTemplateActionDetail(baseDetail: string, template: AccountUpdateTemplate) {
  const blockedByLine = getTemplateBlockedByLine(template);
  const blockingProofHopLabel = template.blockingProofHopLabel?.trim();
  const currentBlockerLine = blockingProofHopLabel
    ? `Current blocker: ${blockingProofHopLabel}.`
    : template.readiness === 'in_progress'
      ? 'Current blocker: current proof pending.'
      : template.readiness === 'upcoming'
        ? 'Current blocker: next proof hop pending.'
        : template.readiness === 'blocked'
          ? 'Current blocker: proof chain pending.'
          : undefined;
  const proofPhaseLine = template.readiness === 'complete'
    ? 'Template state: proof chain complete; confirm the downstream sync only.'
    : template.readiness === 'ready'
      ? 'Template state: proof packet ready to send now.'
      : template.readiness === 'in_progress'
        ? blockingProofHopLabel
          ? `Template state: draft now and wait for ${blockingProofHopLabel.toLowerCase()} to clear before sending.`
          : 'Template state: draft now and wait for the current proof to clear before sending.'
        : template.readiness === 'upcoming'
          ? blockingProofHopLabel
            ? `Template state: prep the ask now and wait for ${blockingProofHopLabel.toLowerCase()} to clear before sending.`
            : 'Template state: prep the ask now before the next proof hop clears.'
          : template.readiness === 'blocked'
            ? blockingProofHopLabel
              ? `Template state: intake-only until ${blockingProofHopLabel.toLowerCase()} clears.`
              : 'Template state: intake-only until the proof chain is ready.'
            : undefined;
  const readinessDetail = template.readiness === 'complete'
    ? `${baseDetail} Use this only to confirm the rename already synced.`
    : template.readiness === 'ready'
      ? `${baseDetail} Send with the current proof packet now.`
      : template.readiness === 'in_progress'
        ? blockingProofHopLabel
          ? `${baseDetail} Send only after ${blockingProofHopLabel.toLowerCase()} clears.`
          : `${baseDetail} Send only after the current proof clears.`
        : template.readiness === 'upcoming'
          ? blockingProofHopLabel
            ? `${baseDetail} Use this to prep the ask before ${blockingProofHopLabel.toLowerCase()} clears.`
            : `${baseDetail} Use this to prep the ask before the next proof hop clears.`
          : template.readiness === 'blocked'
            ? blockingProofHopLabel
              ? `${baseDetail} Use this only to capture intake rules until ${blockingProofHopLabel.toLowerCase()} clears.`
              : `${baseDetail} Use this only to capture intake rules until the proof chain is ready.`
            : baseDetail;
  const checklistLine = ensureTerminalPeriod(template.checklistHighlight);
  const checklistStatusLine = ensureTerminalPeriod(template.checklistStatusNote);
  const formattedProofChecklist = formatInlineProofList(template.proofChecklist);
  const formattedProofDocuments = formatInlineProofList(template.proofDocuments);
  const proofChecklistSummary = formattedProofChecklist ? `Proof checklist: ${formattedProofChecklist}` : undefined;
  const proofDocumentsSummary = formattedProofDocuments ? `Proof to have handy: ${formattedProofDocuments}` : undefined;
  return [
    readinessDetail,
    proofPhaseLine,
    `Subject: ${template.subject}`,
    `Template message: ${template.body}`,
    `Readiness: ${template.readinessLabel}`,
    blockedByLine,
    currentBlockerLine,
    checklistLine ? `Checklist: ${checklistLine}` : undefined,
    checklistStatusLine ? `Checklist status: ${checklistStatusLine}` : undefined,
    `Proof status: ${template.proofReadinessSummary}`,
    `Next ask: ${template.requestSummary}`,
    proofChecklistSummary,
    proofDocumentsSummary,
  ].filter(Boolean).join('\n').trim();
}

function formatTemplateAudienceForAction(audience: string) {
  return audience
    .split(/(\s+|\/)/)
    .map((segment) => {
      if (!segment.trim() || segment === '/') return segment;
      return /^[A-Z0-9]{2,}$/.test(segment) ? segment : segment.toLowerCase();
    })
    .join('');
}

function getTemplateActionLabel(baseLabel: string, template: AccountUpdateTemplate) {
  const audience = formatTemplateAudienceForAction(template.audience);
  const blockingProofHopLabel = getEffectiveBlockingProofHopLabel(template);
  const blockingProofHopSuffix = blockingProofHopLabel
    ? ` (${blockingProofHopLabel})`
    : template.readiness === 'in_progress'
      ? ' (current proof pending)'
      : template.readiness === 'upcoming'
        ? ' (next proof hop pending)'
        : template.readiness === 'blocked'
          ? ' (proof chain pending)'
          : '';
  if (template.readiness === 'complete') return `Confirm ${audience} sync (proof chain complete)`;
  if (template.readiness === 'ready') return `Send ${audience} update (proof packet ready)`;
  if (template.readiness === 'in_progress') return `Draft ${audience} update${blockingProofHopSuffix}`;
  if (template.readiness === 'upcoming') return `Ask ${audience} before next proof hop${blockingProofHopSuffix}`;
  return `Ask ${audience} intake rules now${blockingProofHopSuffix}`;
}

function getTemplateLaneLabel(template: AccountUpdateTemplate) {
  const readinessLabel = template.readiness === 'ready'
    ? 'send now (proof packet ready)'
    : template.readiness === 'complete'
      ? 'confirm sync (proof chain complete)'
      : template.readiness === 'in_progress'
        ? 'draft now, send after current proof clears'
        : template.readiness === 'upcoming'
          ? 'ask before next proof hop'
          : 'ask intake rules now';
  const blockingPhaseLabel = getEffectiveBlockingProofHopLabel(template);

  return [template.audience, readinessLabel, blockingPhaseLabel].filter(Boolean).join(' · ');
}

function getActionDocumentKind(item: NameChangeActionFeedItem) {
  return item.action.category === 'document' ? item.action.documentKind : undefined;
}

function isCaseSetupExecutionAction(action: NameChangeGuidedAction) {
  if (action.category !== 'dependency') return false;

  return action.label === 'Unblock Case legal-name setup complete'
    || action.detail.startsWith('Case setup is still missing ');
}

function shouldReplaceRetainedItem(candidate: NameChangeActionFeedItem, retained: NameChangeActionFeedItem | undefined) {
  return !retained || candidate.score > retained.score || (candidate.score === retained.score && candidate.title.localeCompare(retained.title) < 0);
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
    if (shouldReplaceRetainedItem(item, retained)) {
      retainedByDocumentKind.set(documentKind, item);
    }
  });

  return [...passthrough, ...retainedByDocumentKind.values()];
}

function dedupeTemplateRoutedExecutionItems(items: NameChangeActionFeedItem[]) {
  const retainedByTemplate = new Map<string, NameChangeActionFeedItem>();
  const passthrough: NameChangeActionFeedItem[] = [];

  items.forEach((item) => {
    if (item.plannerIntent !== 'open_account_update_template') {
      passthrough.push(item);
      return;
    }

    const retained = retainedByTemplate.get(item.focusTargetId);
    if (shouldReplaceRetainedItem(item, retained)) {
      retainedByTemplate.set(item.focusTargetId, item);
    }
  });

  return [...passthrough, ...retainedByTemplate.values()];
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

function getExecutionSeverity(
  snapshot: NameChangeTargetExecutionSnapshot,
  template?: AccountUpdateTemplate,
): NameChangeActionFeedItem['severity'] {
  if (template?.readiness === 'complete') return 'attention';
  if (template?.readiness === 'in_progress') {
    return getEffectiveBlockingProofHopLabel(template) ? 'blocking' : 'attention';
  }
  if (template?.readiness === 'upcoming') return 'blocking';
  if (template?.readiness === 'blocked') return 'blocking';
  if (!snapshot.ready) return snapshot.blockers.length > 0 || snapshot.readinessSummary.blockingFieldRisks > 0 ? 'blocking' : 'attention';
  return 'ready';
}

function getExecutionScoreBase(
  severity: NameChangeActionFeedItem['severity'],
  template?: AccountUpdateTemplate,
) {
  if (template?.readiness === 'ready') return 220;
  if (template?.readiness === 'complete') return 80;
  if (template?.readiness === 'in_progress') {
    return getEffectiveBlockingProofHopLabel(template) ? 280 : 120;
  }
  if (template?.readiness === 'upcoming') return 260;
  if (template?.readiness === 'blocked') return 300;
  return getSeverityWeight(severity) * 100;
}

function getActionFeedUrgencyTier(score: number, severity: NameChangeActionFeedItem['severity']): NameChangeActionFeedItem['urgencyTier'] {
  if (severity === 'blocking' && score >= 300) return 'critical';
  if (severity === 'blocking' || score >= 180) return 'elevated';
  return 'normal';
}

function getActionFeedUrgencyReason(
  action: NameChangeGuidedAction,
  severity: NameChangeActionFeedItem['severity'],
  template?: AccountUpdateTemplate,
): NameChangeActionFeedItem['urgencyReason'] {
  if (template) {
    if (template.readiness === 'blocked' || template.readiness === 'upcoming') return 'blocking_dependency';
    if (template.readiness === 'complete') return 'review_queue';
    if (template.readiness === 'in_progress') return getEffectiveBlockingProofHopLabel(template) ? 'blocking_dependency' : 'review_queue';
    return 'packet_trust';
  }

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
    const routesToDocumentRepair = snapshot.nextAction.category === 'document' && Boolean(snapshot.nextAction.documentKind);
    const routesToCaseSetup = isCaseSetupExecutionAction(snapshot.nextAction);
    const linkedTemplate = (() => {
      const templateId = getTemplateIdForTargetKey(snapshot.targetKey);
      return templateId ? templatesById.get(templateId) : undefined;
    })();
    const routesToTemplate = !routesToDocumentRepair && !routesToCaseSetup && Boolean(linkedTemplate);
    const severity = getExecutionSeverity(snapshot, linkedTemplate);
    const score =
      getExecutionScoreBase(severity, linkedTemplate) +
      (snapshot.blockers.length * 10) +
      (snapshot.readinessSummary.blockingFieldRisks * 5) +
      getNameChangeGuidedActionWeight(snapshot.nextAction.category) +
      getTemplateUrgencyBoost(linkedTemplate);
    return {
      key: `execution:${snapshot.targetKey}`,
      origin: 'execution',
      sectionKey: getExecutionSectionKey(snapshot.targetKey),
      title: routesToTemplate ? linkedTemplate.audience : snapshot.targetLabel,
      laneLabel: routesToTemplate
        ? getTemplateLaneLabel(linkedTemplate)
        : snapshot.recommendedFormCode,
      severity,
      urgencyTier: getActionFeedUrgencyTier(score, severity),
      urgencyReason: getActionFeedUrgencyReason(snapshot.nextAction, severity, linkedTemplate),
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
            ? getTemplateFocusTargetId(linkedTemplate)
            : `execution-card-${snapshot.targetKey}`,
      score,
      action: routesToTemplate
        ? {
            ...snapshot.nextAction,
            label: getTemplateActionLabel(snapshot.nextAction.label, linkedTemplate),
            detail: getTemplateActionDetail(snapshot.nextAction.detail, linkedTemplate),
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

  const routedExecutionItems = dedupeTemplateRoutedExecutionItems(dedupeDocumentRoutedExecutionItems(executionItems));
  const queuedDocumentKinds = new Set(documentItems.map((item) => getActionDocumentKind(item)).filter(Boolean));
  const dedupedExecutionItems = routedExecutionItems.filter((item) => {
    if (item.plannerIntent !== 'open_document_repair') return true;
    const documentKind = getActionDocumentKind(item);
    return !documentKind || !queuedDocumentKinds.has(documentKind);
  });

  return [...dedupedExecutionItems, ...documentItems, ...reminderItems]
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
}
