import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard operator context reset wiring', () => {
  it('resets message dashboard interaction state when the active site disappears or changes', () => {
    const page = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Messages.tsx'),
      'utf8',
    );
    const uiState = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/messages/useMessageDashboardUiState.ts'),
      'utf8',
    );

    expect(page).toContain('useMessageDashboardUiState({ isDemoMode })');
    expect(uiState).toContain('export function useMessageDashboardUiState({ isDemoMode }: Args)');
    expect(uiState).toContain('const resetMessageDashboardInteractionState = useCallback(() => {');
    expect(uiState).toContain('setMessages([]);');
    expect(uiState).toContain('setDeliveries([]);');
    expect(uiState).toContain('setGuests([]);');
    expect(uiState).toContain('setSavedTemplates([]);');
    expect(uiState).toContain('setEditingMessageId(null);');
    expect(uiState).toContain('setViewingMessage(null);');
    expect(uiState).toContain('setSmsTransactions([]);');
    expect(uiState).toContain('setItineraryAudienceOptions([]);');
    expect(uiState).toContain('setEventGuestIds({});');
    expect(uiState).toContain("setMessagesRole('owner');");
    expect(uiState).toContain("setActiveSiteRole('owner');");
    expect(uiState).toContain('setMessagesPermissions(null);');
    expect(uiState).toContain('setHistorySearch(\'\');');
    expect(uiState).toContain(
      "if (previousWeddingSiteIdRef.current && weddingSiteId && previousWeddingSiteIdRef.current !== weddingSiteId) {\n      resetMessageDashboardInteractionState();\n    }",
    );
    expect(uiState).toContain("if (!weddingSiteId && !isDemoMode) {\n      resetMessageDashboardInteractionState();\n    }");
  });

  it('resets coordinator dashboard data and transient operator ui when the site context disappears', () => {
    const page = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/CoordinatorMode.tsx'),
      'utf8',
    );
    const dataHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/coordinator/useCoordinatorDashboardData.ts'),
      'utf8',
    );
    const uiState = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/coordinator/useCoordinatorDashboardUiState.ts'),
      'utf8',
    );

    expect(page).toContain('useCoordinatorDashboardUiState({ siteId, isDemoMode })');
    expect(dataHook).toContain('const resetCoordinatorDashboardState = useCallback(() => {');
    expect(dataHook).toContain('setSiteId(null);');
    expect(dataHook).toContain('setPanelFocus(null);');
    expect(dataHook).toContain('setAlertForm({');
    expect(dataHook).toContain('const [restoredStorageSiteId, setRestoredStorageSiteId] = useState<string | null>(null);');
    expect(dataHook).toContain('setRestoredStorageSiteId(null);');
    expect(dataHook).toContain('if (restoredStorageSiteId !== siteId) return;');
    expect(dataHook).toContain("args.toast('Couldn’t load coordinator mode right now.', 'error');");
    expect(dataHook).toContain("if (!args.userId) {\n        if (mounted) {\n          resetCoordinatorDashboardState();\n          setLoading(false);\n        }\n        return;\n      }");
    expect(uiState).toContain('const resetCoordinatorDashboardUiState = useCallback(() => {');
    expect(uiState).toContain('setCommandJumpLabel(null);');
    expect(uiState).toContain('setSummaryFeedback(null);');
    expect(uiState).toContain("if (!siteId && !isDemoMode) {\n      resetCoordinatorDashboardUiState();\n    }");
    expect(page).toContain('const previousSiteIdRef = useRef<string | null>(null);');
    expect(page).toContain('const resetCoordinatorPageInteractionState = () => {');
    expect(page).toContain('setSnapshotCopyNotice(null);');
    expect(page).toContain('setIssueDraft(createEmptyIssueDraft());');
    expect(page).toContain(
      "if (previousSiteIdRef.current && siteId && previousSiteIdRef.current !== siteId) {\n      resetCoordinatorPageInteractionState();\n    }",
    );
    expect(page).toContain(
      "if (!siteId && !isDemoMode) {\n      resetCoordinatorPageInteractionState();\n    }",
    );
  });
});
