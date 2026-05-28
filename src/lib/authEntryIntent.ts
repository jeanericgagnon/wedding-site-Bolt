import { FIRST_SESSION_WORKSPACE_ROUTES } from './firstSessionWorkspaceRoutes';
import { buildQuickStartEntryPath } from './quickStartContinuation';

export type AuthEntryIntent = 'default' | 'draft-start' | 'quick-start' | 'onboarding';

const QUICK_START_ENTRY_PATH = buildQuickStartEntryPath();

export const getAuthEntryIntent = ({
  explicitReturnPath,
  hasMeaningfulQuickStartDraft = false,
}: {
  explicitReturnPath?: string | null;
  hasMeaningfulQuickStartDraft?: boolean;
}): AuthEntryIntent => {
  const normalizedPath = explicitReturnPath?.trim() || null;

  if (normalizedPath === FIRST_SESSION_WORKSPACE_ROUTES.builder) {
    return 'draft-start';
  }

  if (
    normalizedPath === QUICK_START_ENTRY_PATH
    || normalizedPath?.startsWith(`${QUICK_START_ENTRY_PATH}&`)
    || hasMeaningfulQuickStartDraft
  ) {
    return 'quick-start';
  }

  if (normalizedPath?.startsWith('/onboarding')) {
    return 'onboarding';
  }

  return 'default';
};
