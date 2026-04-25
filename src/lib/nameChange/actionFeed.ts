import { getNameChangeGuidedActionWeight } from './executionPrioritization';
import type { NameChangeDocumentRepairQueueItem } from './documentRepairQueue';
import {
  getAccountUpdateTemplateActionLabel as getEngineAccountUpdateTemplateActionLabel,
  getAccountUpdateTemplateAudienceLine as getEngineAccountUpdateTemplateAudienceLine,
  getAccountUpdateTemplateCopyLabel as getEngineAccountUpdateTemplateCopyLabel,
  getAccountUpdateTemplateReadinessLabel as getEngineAccountUpdateTemplateReadinessLabel,
  getAccountUpdateTemplateStateLine as getEngineAccountUpdateTemplateStateLine,
  getAccountUpdateTemplateStatusLabel as getEngineAccountUpdateTemplateStatusLabel,
  getAccountUpdateTemplateStatusLine as getEngineAccountUpdateTemplateStatusLine,
  getFallbackBlockingProofHopLabel,
} from './engine';
import {
  getExecutionNextActionDetail as getTargetExecutionNextActionDetail,
  hasExecutionSupportiveWaitGuidance,
} from './targetExecution';
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

export function formatAccountUpdateTemplateBlockerLine(
  linePrefix: 'Blocked by' | 'Current blocker',
  template: AccountUpdateTemplate,
) {
  const blockingProofHopLabel = getEffectiveBlockingProofHopLabel(template);
  return blockingProofHopLabel ? `${linePrefix}: ${blockingProofHopLabel}.` : undefined;
}

function getTemplateIdForTargetKey(targetKey: NameChangeTargetExecutionSnapshot['targetKey']) {
  switch (targetKey) {
    case 'employer':
      return 'template-payroll';
    case 'taxes':
    case 'legalGovernment':
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

export function getAccountUpdateTemplateBlockedByLine(template: AccountUpdateTemplate) {
  return formatAccountUpdateTemplateBlockerLine('Blocked by', template);
}

export function ensureTerminalPeriod(line: string | undefined) {
  if (!line) return undefined;
  const trimmed = line.trim();
  if (trimmed.replace(/[.\s]+$/u, '') === '') return undefined;
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

export function sanitizeAccountUpdateTemplateText(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || !/[\p{L}\p{N}]/u.test(trimmed)) return undefined;
  return trimmed;
}

function formatAccountUpdateTemplateTextLine(label: string, value: string | undefined) {
  const sanitized = sanitizeAccountUpdateTemplateText(value);
  if (!sanitized) return undefined;
  return `${label}: ${sanitized}`;
}

function normalizeInlineProofListItem(item: string) {
  return item.trim().replace(/[.\s]+$/u, '').toLowerCase();
}

export function formatInlineProofList(items: string[]) {
  const seen = new Set<string>();

  return items
    .flatMap((item) => {
      const trimmed = item.trim().replace(/[.\s]+$/u, '');
      if (!trimmed) return [];

      const normalized = normalizeInlineProofListItem(trimmed);
      if (seen.has(normalized)) return [];
      seen.add(normalized);
      return [trimmed];
    })
    .join(' · ');
}

export function getAccountUpdateTemplateCurrentBlockerLine(template: AccountUpdateTemplate) {
  return formatAccountUpdateTemplateBlockerLine('Current blocker', template);
}

export function formatBlockingProofHopStatePhrase(blockingProofHopLabel: string) {
  const trimmed = blockingProofHopLabel.trim();
  if (!trimmed) return '';

  const [firstToken, ...rest] = trimmed.split(/\s+/u);
  if (!firstToken) return trimmed;

  const normalizedFirstToken = /^[A-Z0-9-]{2,}$/u.test(firstToken)
    ? firstToken
    : `${firstToken.charAt(0).toLowerCase()}${firstToken.slice(1)}`;

  return [normalizedFirstToken, ...rest].join(' ');
}

export function getAccountUpdateTemplateStateLine(template: AccountUpdateTemplate) {
  return getEngineAccountUpdateTemplateStateLine(template.readiness, template.blockingProofHopLabel);
}

export function getAccountUpdateTemplateReadinessDetailLine(baseDetail: string, template: AccountUpdateTemplate) {
  const blockingProofHopLabel = template.blockingProofHopLabel?.trim();
  const blockingProofHopStatePhrase = blockingProofHopLabel
    ? formatBlockingProofHopStatePhrase(blockingProofHopLabel)
    : undefined;

  return template.readiness === 'complete'
    ? `${baseDetail} Use this only to confirm the downstream sync already landed.`
    : template.readiness === 'ready'
      ? `${baseDetail} Send this now with the current proof packet.`
      : template.readiness === 'in_progress'
        ? blockingProofHopStatePhrase
          ? `${baseDetail} Draft this now, then send it only after ${blockingProofHopStatePhrase} clears.`
          : `${baseDetail} Draft this now, then send it only after the current proof clears.`
        : template.readiness === 'upcoming'
          ? blockingProofHopStatePhrase
            ? `${baseDetail} Prep this ask now, then send it only after ${blockingProofHopStatePhrase} clears.`
            : `${baseDetail} Prep this ask now, then send it only after the next proof hop clears.`
          : template.readiness === 'blocked'
            ? blockingProofHopStatePhrase
              ? `${baseDetail} Use this only to capture intake rules until ${blockingProofHopStatePhrase} clears.`
              : `${baseDetail} Use this only to capture intake rules until the proof chain is ready.`
            : baseDetail;
}

export function getAccountUpdateTemplateAudienceLine(template: AccountUpdateTemplate) {
  return getEngineAccountUpdateTemplateAudienceLine(template.audience, { terminalPeriod: false });
}

export function getAccountUpdateTemplateSubjectLine(template: AccountUpdateTemplate) {
  return formatAccountUpdateTemplateTextLine('Subject', template.subject);
}

export function getAccountUpdateTemplateMessageLine(template: AccountUpdateTemplate) {
  return formatAccountUpdateTemplateTextLine('Template message', template.body);
}

export function getAccountUpdateTemplateProofStatusLine(template: AccountUpdateTemplate) {
  return formatAccountUpdateTemplateTextLine('Proof status', template.proofReadinessSummary);
}

export function getAccountUpdateTemplateNextAskLine(template: AccountUpdateTemplate) {
  return formatAccountUpdateTemplateTextLine('Next ask', template.requestSummary);
}

export function getAccountUpdateTemplateProofChecklistLine(template: AccountUpdateTemplate) {
  const formattedProofChecklist = formatInlineProofList(template.proofChecklist);
  return formattedProofChecklist ? `Proof checklist: ${formattedProofChecklist}` : undefined;
}

export function getAccountUpdateTemplateProofDocumentsLine(template: AccountUpdateTemplate) {
  const formattedProofDocuments = formatInlineProofList(template.proofDocuments);
  return formattedProofDocuments ? `Proof to have handy: ${formattedProofDocuments}` : undefined;
}

export function getAccountUpdateTemplateReadinessLine(
  template: AccountUpdateTemplate,
  options: { prefix?: boolean } = {},
) {
  const { prefix = true } = options;
  const readinessLabel = getEngineAccountUpdateTemplateReadinessLabel(
    template.readiness,
    template.blockingProofHopLabel,
  );
  const detail = getAccountUpdateTemplateReadinessDetailLine(readinessLabel, template);
  return prefix ? `Readiness: ${detail}` : detail;
}

export function getAccountUpdateTemplateCopyButtonLabel(
  template: AccountUpdateTemplate,
  copiedTemplateId: string | null,
) {
  return getEngineAccountUpdateTemplateCopyLabel(template.readiness, copiedTemplateId === template.id);
}

export function getAccountUpdateTemplateChecklistLine(template: AccountUpdateTemplate) {
  const checklistLine = ensureTerminalPeriod(template.checklistHighlight);
  return checklistLine ? `Checklist: ${checklistLine}` : undefined;
}

export function getAccountUpdateTemplateChecklistStatusLine(template: AccountUpdateTemplate) {
  const checklistStatusLine = ensureTerminalPeriod(template.checklistStatusNote);
  return checklistStatusLine ? `Checklist status: ${checklistStatusLine}` : undefined;
}

type AccountUpdateTemplateContextOptions = {
  includeAudience?: boolean;
  includeStatus?: boolean;
  includeSubject?: boolean;
  includeMessage?: boolean;
  prefixReadiness?: boolean;
};

export function getAccountUpdateTemplateContextLines(
  template: AccountUpdateTemplate,
  options: AccountUpdateTemplateContextOptions = {},
) {
  const {
    includeAudience = false,
    includeStatus = false,
    includeSubject = true,
    includeMessage = true,
    prefixReadiness = true,
  } = options;

  return [
    includeAudience ? getAccountUpdateTemplateAudienceLine(template) : undefined,
    includeStatus ? getAccountUpdateTemplateStatusLine(template) : undefined,
    getAccountUpdateTemplateReadinessLine(template, { prefix: prefixReadiness }),
    getAccountUpdateTemplateBlockedByLine(template),
    getAccountUpdateTemplateCurrentBlockerLine(template),
    getAccountUpdateTemplateChecklistLine(template),
    getAccountUpdateTemplateChecklistStatusLine(template),
    getAccountUpdateTemplateStateLine(template),
    getAccountUpdateTemplateProofStatusLine(template),
    getAccountUpdateTemplateNextAskLine(template),
    getAccountUpdateTemplateProofChecklistLine(template),
    getAccountUpdateTemplateProofDocumentsLine(template),
    includeSubject ? getAccountUpdateTemplateSubjectLine(template) : undefined,
    includeMessage ? getAccountUpdateTemplateMessageLine(template) : undefined,
  ].filter(Boolean);
}

function getTemplateActionDetail(template: AccountUpdateTemplate) {
  const readinessLabel = getEngineAccountUpdateTemplateReadinessLabel(
    template.readiness,
    template.blockingProofHopLabel,
  );
  const readinessDetail = getAccountUpdateTemplateReadinessDetailLine(readinessLabel, template);
  return [
    readinessDetail,
    ...getAccountUpdateTemplateContextLines(template, { includeAudience: true, includeStatus: true }),
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

function getTemplateActionLabel(template: AccountUpdateTemplate) {
  return getEngineAccountUpdateTemplateActionLabel(
    template.readiness,
    formatTemplateAudienceForAction(template.audience),
    template.blockingProofHopLabel,
  );
}

export function getAccountUpdateTemplateReadinessLabel(readiness: AccountUpdateTemplate['readiness']) {
  return getEngineAccountUpdateTemplateStatusLabel(readiness);
}

export function getAccountUpdateTemplateStatusLabel(template: AccountUpdateTemplate) {
  return getEngineAccountUpdateTemplateStatusLabel(template.readiness, template.blockingProofHopLabel);
}

export function getAccountUpdateTemplateStatusLine(template: AccountUpdateTemplate) {
  return getEngineAccountUpdateTemplateStatusLine(template.readiness, template.blockingProofHopLabel, { terminalPeriod: false });
}

function getTemplateLaneLabel(template: AccountUpdateTemplate) {
  return [template.audience, getAccountUpdateTemplateStatusLabel(template)].filter(Boolean).join(' · ');
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
  executionSnapshot?: Pick<NameChangeTargetExecutionSnapshot, 'targetKey' | 'nextAction'>,
  template?: AccountUpdateTemplate,
): NameChangeActionFeedItem['urgencyReason'] {
  if (template) {
    if (template.readiness === 'blocked' || template.readiness === 'upcoming') return 'blocking_dependency';
    if (template.readiness === 'complete') return 'review_queue';
    if (template.readiness === 'in_progress') return getEffectiveBlockingProofHopLabel(template) ? 'blocking_dependency' : 'review_queue';
    return 'packet_trust';
  }

  if (executionSnapshot && action.category === 'dependency' && hasExecutionSupportiveWaitGuidance(executionSnapshot)) {
    return 'review_queue';
  }

  if (action.category === 'dependency' && severity === 'blocking') return 'blocking_dependency';
  if (action.category === 'packet') return 'packet_trust';
  if (action.category === 'document') return 'document_gap';
  return 'review_queue';
}

function getExecutionSectionKey(targetKey: NameChangeTargetExecutionSnapshot['targetKey']): NameChangeActionFeedItem['sectionKey'] {
  if (targetKey === 'ssa' || targetKey === 'dmv' || targetKey === 'passport' || targetKey === 'taxes' || targetKey === 'legalGovernment') return 'core-government';
  if (targetKey === 'employer' || targetKey === 'licenses') return 'work-identity';
  if (targetKey === 'banks' || targetKey === 'insurance' || targetKey === 'medical' || targetKey === 'utilities') return 'institutional';
  return 'cleanup';
}

export function getExecutionNextActionDetail(snapshot: NameChangeTargetExecutionSnapshot) {
  return getTargetExecutionNextActionDetail(snapshot);
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
    || dependsOnStepId === 'institution-irs-employer'
    || dependsOnStepId === 'institution-retirement-benefits'
    || dependsOnStepId === 'institution-licenses'
    || dependsOnStepId === 'institution-professional-licenses'
  ) {
    return 'work-identity';
  }

  if (dependsOnStepId === 'institution-courtesy-notifications') {
    return 'institutional';
  }

  if (
    dependsOnStepId === 'institution-voter-registration'
    || dependsOnStepId === 'institution-travel-hospitality'
    || dependsOnStepId === 'institution-dmv-registration-title'
    || dependsOnStepId === 'institution-frequent-flyer-hotel-rail'
  ) {
    return 'cleanup';
  }

  if (
    dependsOnStepId === 'institutions-rollout'
    || dependsOnStepId === 'institution-banks'
    || dependsOnStepId === 'institution-investments-loans'
    || dependsOnStepId === 'institution-student-loans-financial-aid'
    || dependsOnStepId === 'institution-mortgage-property-records'
    || dependsOnStepId === 'institution-credit-bureaus'
    || dependsOnStepId === 'institution-insurance'
    || dependsOnStepId === 'institution-disability-insurance'
    || dependsOnStepId === 'institution-workers-comp-leave'
    || dependsOnStepId === 'institution-medical-records'
    || dependsOnStepId === 'institution-utilities'
    || dependsOnStepId === 'institution-utilities-housing'
    || dependsOnStepId === 'institution-phone-digital-identity'
    || dependsOnStepId === 'institution-subscriptions-social'
    || dependsOnStepId === 'institution-school-alumni-records'
    || dependsOnStepId === 'institution-courtesy-social-sync'
  ) {
    return 'institutional';
  }

  return 'cleanup';
}

function isCaseSetupReminder(item: NameChangeReminderAttentionItem) {
  return item.reminderKey === 'reminder-case-legal-name-setup'
    || item.reminderKey === 'reminder-court-order-packet'
    || item.reminderKey === 'reminder-marriage-name-mismatch'
    || item.reminderKey === 'reminder-mismatch-recovery'
    || item.reminderKey === 'reminder-both-partners-changing';
}

function getReminderFocusTargetId(item: NameChangeReminderAttentionItem) {
  if (isCaseSetupReminder(item)) return 'case-setup';
  if (item.reminderKey === 'reminder-travel-bookings') return 'execution-card-tsa';

  const { dependsOnStepId } = item;
  if (dependsOnStepId === 'eligibility-proof') return 'execution-card-ssa';
  if (dependsOnStepId === 'federal-ssa') return 'execution-card-ssa';
  if (dependsOnStepId === 'state-dmv') return 'execution-card-dmv';
  if (dependsOnStepId === 'federal-passport') return 'execution-card-passport';
  if (dependsOnStepId === 'institution-irs-records' || dependsOnStepId === 'institution-state-tax-agency') return 'execution-card-taxes';
  if (dependsOnStepId === 'institution-county-recorder-property' || dependsOnStepId === 'institution-uscis-immigration-records') return 'execution-card-legalGovernment';
  if (dependsOnStepId === 'institution-employer' || dependsOnStepId === 'institution-irs-employer' || dependsOnStepId === 'institution-retirement-benefits') return 'execution-card-employer';
  if (dependsOnStepId === 'institution-licenses' || dependsOnStepId === 'institution-professional-licenses') return 'execution-card-licenses';
  if (dependsOnStepId === 'institution-voter-registration') return 'execution-card-voter';
  if (dependsOnStepId === 'institution-travel-hospitality' || dependsOnStepId === 'institution-dmv-registration-title' || dependsOnStepId === 'institution-frequent-flyer-hotel-rail') return 'execution-card-tsa';
  if (dependsOnStepId === 'institution-courtesy-notifications' || dependsOnStepId === 'institution-subscriptions-social' || dependsOnStepId === 'institution-school-alumni-records' || dependsOnStepId === 'institution-courtesy-social-sync') return 'execution-card-courtesy';
  if (dependsOnStepId === 'institution-banks' || dependsOnStepId === 'institution-investments-loans' || dependsOnStepId === 'institution-student-loans-financial-aid' || dependsOnStepId === 'institution-mortgage-property-records' || dependsOnStepId === 'institution-credit-bureaus' || dependsOnStepId === 'institutions-rollout') return 'execution-card-banks';
  if (dependsOnStepId === 'institution-insurance' || dependsOnStepId === 'institution-disability-insurance' || dependsOnStepId === 'institution-workers-comp-leave') return 'execution-card-insurance';
  if (dependsOnStepId === 'institution-medical-records') return 'execution-card-medical';
  if (dependsOnStepId === 'institution-utilities' || dependsOnStepId === 'institution-utilities-housing' || dependsOnStepId === 'institution-phone-digital-identity') return 'execution-card-utilities';
  if (dependsOnStepId === 'institutions-rollout') return 'execution-card-banks';
  return 'reminder-attention';
}

function getReminderItemSectionKey(item: NameChangeReminderAttentionItem): NameChangeActionFeedItem['sectionKey'] {
  if (item.reminderKey === 'reminder-travel-bookings') return 'cleanup';
  return getReminderSectionKey(item.dependsOnStepId);
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
      urgencyReason: getActionFeedUrgencyReason(snapshot.nextAction, severity, snapshot, linkedTemplate),
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
            label: getTemplateActionLabel(linkedTemplate),
            detail: getTemplateActionDetail(linkedTemplate),
          }
        : {
            ...snapshot.nextAction,
            detail: getExecutionNextActionDetail(snapshot),
          },
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
      sectionKey: item.sectionKey ?? getReminderItemSectionKey(item),
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
