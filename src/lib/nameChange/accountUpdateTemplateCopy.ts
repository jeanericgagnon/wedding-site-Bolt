import type { NameChangePlan } from './types';

type AccountUpdateTemplate = NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number];
type AccountUpdateTemplateReadiness = AccountUpdateTemplate['readiness'];

export function formatAccountUpdateProofLine(proofDocuments: string[], readinessSpecificProof: string) {
  if (proofDocuments.length === 0) return '';
  return readinessSpecificProof
    ? `I can provide ${proofDocuments.join(', ')}. ${readinessSpecificProof}`
    : `I can provide ${proofDocuments.join(', ')}.`;
}

export function normalizeAccountUpdateProofItems(items: string[]) {
  return items
    .map((item) => item.trim().replace(/[.\s]+$/u, ''))
    .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index);
}

export function normalizeAccountUpdateChecklistItems(items: string[]) {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const trimmed = item.trim();
    const normalizedKey = trimmed.replace(/[.\s]+$/u, '');
    if (!normalizedKey || seen.has(normalizedKey)) return [];
    seen.add(normalizedKey);
    return [trimmed];
  });
}

export function formatAccountUpdateChecklistGuidanceLine(checklistHighlight: string, checklistStatusNote: string) {
  const normalizeChecklistSnippet = (value: string) => value.trim().replace(/[.\s]+$/u, '');
  const ensureTerminalPeriod = (value: string) => {
    const trimmed = value.trim();
    if (normalizeChecklistSnippet(trimmed) === '') return '';
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  };

  return [ensureTerminalPeriod(checklistHighlight), ensureTerminalPeriod(checklistStatusNote)].filter(Boolean).join(' ');
}

export function compactTemplateBody(body: string) {
  return body.replace(/\s{2,}/gu, ' ').trim();
}

export function getFallbackBlockingProofHopLabel(
  readiness: AccountUpdateTemplateReadiness,
  blockingProofHopLabel?: string,
) {
  return blockingProofHopLabel?.trim()
    || (readiness === 'in_progress'
      ? 'current proof pending'
      : readiness === 'upcoming'
        ? 'next proof hop pending'
        : readiness === 'blocked'
          ? 'proof chain pending'
          : undefined);
}

export function getDefaultAccountUpdateBlockingProofHopLabel(
  templateId: string,
  readiness: AccountUpdateTemplateReadiness,
) {
  if (readiness === 'ready' || readiness === 'complete') return undefined;
  if (templateId === 'template-payroll' || templateId === 'template-tax') {
    return readiness === 'blocked' ? 'legal proof pending' : 'SSA pending';
  }
  if (
    templateId === 'template-bank'
    || templateId === 'template-digital-identity'
    || templateId === 'template-insurance'
    || templateId === 'template-licenses'
  ) {
    return readiness === 'blocked' ? 'legal proof pending' : 'ID pending';
  }
  if (templateId === 'template-travel') {
    return readiness === 'blocked' ? 'legal proof pending' : 'passport pending';
  }
  return undefined;
}

export function getAccountUpdateTemplateReadinessActionLabel(
  readiness: AccountUpdateTemplateReadiness,
) {
  return readiness === 'ready'
    ? 'send now'
    : readiness === 'complete'
      ? 'confirm sync'
      : readiness === 'in_progress'
        ? 'draft now, send after current proof clears'
        : readiness === 'upcoming'
          ? 'ask before next proof hop'
          : 'ask intake rules now';
}

export function getAccountUpdateTemplateReadinessSubjectPrefix(
  readiness: AccountUpdateTemplateReadiness,
) {
  return readiness === 'ready'
    ? 'Send now (proof packet ready)'
    : readiness === 'complete'
      ? 'Confirm sync (proof chain complete)'
      : readiness === 'in_progress'
        ? 'Draft now, send after current proof clears'
        : readiness === 'upcoming'
          ? 'Ask before next proof hop'
          : 'Ask intake rules now';
}

export function getAccountUpdateTemplateAudienceLine(
  audience: string,
  options?: { terminalPeriod?: boolean },
) {
  const trimmedAudience = audience.trim();
  if (!trimmedAudience) return '';
  return options?.terminalPeriod === false ? `Audience: ${trimmedAudience}` : `Audience: ${trimmedAudience}.`;
}

export function getAccountUpdateTemplateStatusLabel(
  readiness: AccountUpdateTemplateReadiness,
  blockingProofHopLabel?: string,
) {
  const actionLabel = getAccountUpdateTemplateReadinessActionLabel(readiness);
  const fallbackBlockingProofHopLabel = getFallbackBlockingProofHopLabel(readiness, blockingProofHopLabel);

  return readiness === 'ready'
    ? `${actionLabel} (proof packet ready)`
    : readiness === 'complete'
      ? `${actionLabel} (proof chain complete)`
      : fallbackBlockingProofHopLabel
        ? `${actionLabel} · ${fallbackBlockingProofHopLabel}`
        : actionLabel;
}

export function getAccountUpdateTemplateStatusLine(
  readiness: AccountUpdateTemplateReadiness,
  blockingProofHopLabel?: string,
  options?: { terminalPeriod?: boolean },
) {
  const statusLabel = getAccountUpdateTemplateStatusLabel(readiness, blockingProofHopLabel);
  return options?.terminalPeriod === false ? `Status: ${statusLabel}` : `Status: ${statusLabel}.`;
}

export function getAccountUpdateTemplateActionLabel(
  readiness: AccountUpdateTemplateReadiness,
  audience: string,
  blockingProofHopLabel?: string,
) {
  const trimmedAudience = audience.trim();
  const normalizedAudience = trimmedAudience ? trimmedAudience.charAt(0).toLowerCase() + trimmedAudience.slice(1) : 'account';
  const fallbackBlockingProofHopLabel = getFallbackBlockingProofHopLabel(readiness, blockingProofHopLabel);
  const blockingProofHopSuffix = fallbackBlockingProofHopLabel
    ? ` (${fallbackBlockingProofHopLabel})`
    : readiness === 'in_progress'
      ? ' (current proof pending)'
      : readiness === 'upcoming'
        ? ' (next proof hop pending)'
        : readiness === 'blocked'
          ? ' (proof chain pending)'
          : '';
  if (readiness === 'complete') return `Confirm ${normalizedAudience} sync (proof chain complete)`;
  if (readiness === 'ready') return `Send ${normalizedAudience} update (proof packet ready)`;
  if (readiness === 'in_progress') return `Draft ${normalizedAudience} update${blockingProofHopSuffix}`;
  if (readiness === 'upcoming') return `Ask ${normalizedAudience} before next proof hop${blockingProofHopSuffix}`;
  return `Ask ${normalizedAudience} intake rules now${blockingProofHopSuffix}`;
}

export function getAccountUpdateTemplateCopyLabel(
  readiness: AccountUpdateTemplateReadiness,
  copied = false,
) {
  if (copied) return 'Copied';
  if (readiness === 'ready') return 'Copy proof-ready send text';
  if (readiness === 'complete') return 'Copy proof-complete confirmation';
  if (readiness === 'in_progress') return 'Copy staged draft';
  if (readiness === 'upcoming') return 'Copy next-step draft';
  return 'Copy intake script';
}

export function getAccountUpdateTemplateStateLine(
  readiness: AccountUpdateTemplateReadiness,
  blockingProofHopLabel?: string,
) {
  const trimmedBlockingProofHopLabel = blockingProofHopLabel?.trim().replace(/\.+$/, '');
  const blockingProofHopStatePhrase = trimmedBlockingProofHopLabel
    ? (() => {
        const tokens = trimmedBlockingProofHopLabel.split(/\s+/).filter(Boolean);
        const [firstToken = '', ...rest] = tokens;
        if (!firstToken) return trimmedBlockingProofHopLabel;
        const normalizedFirstToken = /^[A-Z0-9-]+$/.test(firstToken)
          ? firstToken
          : firstToken.charAt(0).toLowerCase() + firstToken.slice(1);
        return [normalizedFirstToken, ...rest].join(' ');
      })()
    : undefined;

  return readiness === 'complete'
    ? 'Template state: proof chain complete; confirm the downstream sync only.'
    : readiness === 'ready'
      ? 'Template state: proof packet ready to send now.'
      : readiness === 'in_progress'
        ? blockingProofHopStatePhrase
          ? `Template state: draft now and wait for ${blockingProofHopStatePhrase} to clear before sending.`
          : 'Template state: draft now and wait for the current proof to clear before sending.'
        : readiness === 'upcoming'
          ? blockingProofHopStatePhrase
            ? `Template state: prep the ask now and wait for ${blockingProofHopStatePhrase} to clear before sending.`
            : 'Template state: prep the ask now before the next proof hop clears.'
          : readiness === 'blocked'
            ? blockingProofHopStatePhrase
              ? `Template state: intake-only until ${blockingProofHopStatePhrase} clears.`
              : 'Template state: intake-only until the proof chain is ready.'
            : undefined;
}

export function getAccountUpdateTemplateReadinessIntroLine(
  readiness: AccountUpdateTemplateReadiness,
  blockingProofHopLabel?: string,
) {
  const fallbackBlockingProofHopLabel = getFallbackBlockingProofHopLabel(readiness, blockingProofHopLabel);

  return readiness === 'ready'
    ? 'My proof packet is ready, so I can submit this update now.'
    : readiness === 'in_progress'
      ? `I am drafting this now and will send it as soon as the current proof step clears${fallbackBlockingProofHopLabel ? ` (${fallbackBlockingProofHopLabel})` : ''}.`
      : readiness === 'complete'
        ? 'My proof chain should already be complete, so I mainly need to confirm the downstream sync.'
        : readiness === 'upcoming'
          ? `I am prepping this ask now, but I am not sending the final packet until the next proof hop clears${fallbackBlockingProofHopLabel ? ` (${fallbackBlockingProofHopLabel})` : ''}.`
          : `I am only collecting the intake rules for now until the proof chain is ready${fallbackBlockingProofHopLabel ? ` (${fallbackBlockingProofHopLabel})` : ''}.`;
}

export function getAccountUpdateTemplateReadinessLabel(
  readiness: AccountUpdateTemplateReadiness,
  blockingProofHopLabel?: string,
) {
  const fallbackBlockingProofHopLabel = getFallbackBlockingProofHopLabel(readiness, blockingProofHopLabel);

  return readiness === 'ready'
    ? 'You have enough upstream proof to send this now.'
    : readiness === 'in_progress'
      ? `The upstream identity work is already moving, so this outreach can be drafted now and sent as soon as the current step lands${fallbackBlockingProofHopLabel ? ` (${fallbackBlockingProofHopLabel})` : ''}.`
      : readiness === 'complete'
        ? 'The core proof chain is already complete, so this should be a clean confirmation/update pass.'
        : readiness === 'upcoming'
          ? `Your legal proof is grounded, but this still depends on the next ID or agency hop before it is ready to send${fallbackBlockingProofHopLabel ? ` (${fallbackBlockingProofHopLabel})` : ''}.`
          : `The legal-proof chain is still too early, so use this to learn the intake path now and wait to send documents until the upstream proof is real${fallbackBlockingProofHopLabel ? ` (${fallbackBlockingProofHopLabel})` : ''}.`;
}
