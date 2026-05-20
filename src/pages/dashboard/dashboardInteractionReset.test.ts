import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard interaction reset wiring', () => {
  it('resets itinerary editor interaction state when the active itinerary site context disappears', () => {
    const uiStateHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/useItineraryDashboardUiState.ts'),
      'utf8',
    );
    const dataHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/useItineraryDashboardData.ts'),
      'utf8',
    );
    const page = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Itinerary.tsx'),
      'utf8',
    );
    const service = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/itineraryService.ts'),
      'utf8',
    );

    expect(uiStateHook).toContain('export function useItineraryDashboardUiState({ hasActiveSite, isDemoMode }: Args)');
    expect(uiStateHook).toContain('const resetItineraryDashboardUiState = useCallback(() => {');
    expect(uiStateHook).toContain('setShowEventForm(false);');
    expect(uiStateHook).toContain('setLastTimelineSnapshot(null);');
    expect(uiStateHook).toContain("if (!hasActiveSite && !isDemoMode) {\n      resetItineraryDashboardUiState();\n    }");
    expect(dataHook).toContain('const [hasActiveSite, setHasActiveSite] = useState(isDemoMode);');
    expect(dataHook).toContain('const loadEventsRequestIdRef = useRef(0);');
    expect(dataHook).toContain('const requestId = ++loadEventsRequestIdRef.current;');
    expect(dataHook).toContain('if (!isCurrentRequest()) return;');
    expect(dataHook).toContain('if (isCurrentRequest()) {\n        setLoading(false);\n      }');
    expect(dataHook).toContain('setHasActiveSite(snapshot.hasActiveSite);');
    expect(service).toContain('hasActiveSite: false');
    expect(service).toContain('hasActiveSite: true');
    expect(page).toContain('const { events, hasActiveSite, loadEvents, loading, setEvents } = useItineraryDashboardData({ isDemoMode, toast });');
    expect(page).toContain('} = useItineraryDashboardUiState({ hasActiveSite, isDemoMode });');
  });

  it('resets guest dashboard transient interaction state when the active site disappears or changes', () => {
    const uiStateHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardUiState.ts'),
      'utf8',
    );
    const page = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Guests.tsx'),
      'utf8',
    );

    expect(uiStateHook).toContain('export function useGuestDashboardUiState()');
    expect(uiStateHook).toContain("const [storageScope, setStorageScope] = useState<string | null>(null);");
    expect(uiStateHook).toContain('const resetGuestDashboardUiState = useCallback(() => {');
    expect(uiStateHook).toContain('setShowAddModal(false);');
    expect(uiStateHook).toContain('setSelectedGuestIds(new Set());');
    expect(uiStateHook).toContain('setFormData(createEmptyGuestFormData());');
    expect(uiStateHook).toContain('resetGuestDashboardUiState,');
    expect(page).toContain('const previousWeddingSiteIdRef = useRef<string | null>(null);');
    expect(page).toContain(
      "if (previousWeddingSiteIdRef.current && weddingSiteId && previousWeddingSiteIdRef.current !== weddingSiteId) {\n      resetGuestDashboardUiState();\n    }",
    );
    expect(page).toContain("if (!weddingSiteId && !isDemoMode) {\n      resetGuestDashboardUiState();\n    }");
    expect(page).toContain('} = useGuestDashboardUiState();');
    expect(page).toContain('setStorageScope(weddingSiteId);');
  });
});
