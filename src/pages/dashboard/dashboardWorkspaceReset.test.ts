import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard workspace reset wiring', () => {
  it('resets seating dashboard data and transient interaction state when the active site disappears or changes', () => {
    const page = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Seating.tsx'),
      'utf8',
    );
    const dataHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/seating/useSeatingDashboardData.ts'),
      'utf8',
    );
    const interactionHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/seating/useSeatingDashboardInteractionState.ts'),
      'utf8',
    );

    expect(page).toContain('useSeatingDashboardInteractionState({');
    expect(page).toContain('isDemoMode,');
    expect(page).toContain('siteId,');
    expect(dataHook).toContain('const resetSeatingDashboardState = useCallback(() => {');
    expect(dataHook).toContain('setSiteId(null);');
    expect(dataHook).toContain('setSelectedEventId(null);');
    expect(dataHook).toContain('setTables([]);');
    expect(dataHook).toContain("if (!id) {\n          resetSeatingDashboardState();\n          return;\n        }");
    expect(dataHook).toContain('const initialLoadRequestIdRef = useRef(0);');
    expect(dataHook).toContain('const seatingLoadRequestIdRef = useRef(0);');
    expect(dataHook).toContain('const isCurrentRequest = () => requestId === seatingLoadRequestIdRef.current;');
    expect(dataHook).toContain("toast('Couldn’t load events right now. Please try again.', 'error');");
    expect(interactionHook).toContain('const resetSeatingDashboardInteractionState = useCallback(() => {');
    expect(interactionHook).toContain('setEditingTable(null);');
    expect(interactionHook).toContain('setSeatPicker(null);');
    expect(interactionHook).toContain('setConfirmDialog(null);');
    expect(interactionHook).toContain(
      "if (previousSiteIdRef.current && args.siteId && previousSiteIdRef.current !== args.siteId) {\n      resetSeatingDashboardInteractionState();\n    }",
    );
    expect(interactionHook).toContain("if (!args.siteId && !args.isDemoMode) {\n      resetSeatingDashboardInteractionState();\n    }");
  });

  it('resets guest photo workspace state when the active site disappears or changes', () => {
    const page = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/GuestPhotoSharing.tsx'),
      'utf8',
    );
    const uiHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/guestPhotos/useGuestPhotoDashboardUiState.ts'),
      'utf8',
    );
    const bucketWorkspace = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/guestPhotos/useGuestPhotoBucketWorkspace.ts'),
      'utf8',
    );

    expect(uiHook).toContain('const resetGuestPhotoDashboardInteractionState = useCallback(() => {');
    expect(uiHook).toContain('const [bucketUploadLinks, setBucketUploadLinks] = useState<Record<string, string>>({});');
    expect(uiHook).toContain('const [storageScope, setStorageScope] = useState<string | null>(null);');
    expect(uiHook).toContain('setBucketUploadLinks(readStoredBucketLinks(normalizedStorageScope));');
    expect(uiHook).toContain("const routeEventName = search.get('eventName') ?? '';");
    expect(uiHook).toContain("const routeEventId = search.get('eventId') ?? '';");
    expect(uiHook).toContain("const routeParentBucketId = search.get('parentBucket') ?? '';");
    expect(uiHook).toContain('setName(routeEventName);');
    expect(uiHook).toContain('setItineraryEventId(routeEventId);');
    expect(uiHook).toContain('setParentAlbumId(routeParentBucketId);');
    expect(uiHook).toContain("setShowHidden(false);");
    expect(uiHook).toContain("setSlideshowPreviewOpen(false);");
    expect(bucketWorkspace).toContain('const resetGuestPhotoBucketWorkspace = useCallback(() => {');
    expect(bucketWorkspace).toContain('setPhotoBuckets(createEmptyPhotoBuckets());');
    expect(bucketWorkspace).toContain("pendingBucketRef.current = null;");
    expect(page).toContain('writeStoredBucketLinks(bucketUploadLinks, siteId);');
    expect(page).toContain('setStorageScope(siteId);');
    expect(page).toContain('const previousSiteIdRef = useRef<string | null>(null);');
    expect(page).toContain(
      "if (previousSiteIdRef.current && siteId && previousSiteIdRef.current !== siteId) {\n      resetGuestPhotoDashboardInteractionState();\n    }",
    );
    expect(page).toContain(
      "if (!siteId && !isDemoMode) {\n      resetGuestPhotoDashboardInteractionState();\n      resetGuestPhotoBucketWorkspace();\n    }",
    );
    const dataHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/guestPhotos/useGuestPhotoDashboardData.ts'),
      'utf8',
    );
    expect(dataHook).toContain('setPhotoBuckets(savedBuckets ?? createEmptyPhotoBuckets());');
  });

  it('resets planning workspace state when the signed-in user or active site context changes', () => {
    const planningPage = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Planning.tsx'),
      'utf8',
    );

    expect(planningPage).toContain('const previousUserIdRef = useRef<string | null>(null);');
    expect(planningPage).toContain('const previousSiteIdRef = useRef<string | null>(null);');
    expect(planningPage).toContain('const resetPlanningDashboardState = useCallback(() => {');
    expect(planningPage).toContain('setSiteId(null);');
    expect(planningPage).toContain('setPlanningPermissions(null);');
    expect(planningPage).toContain('hydrateNameChangeWorkspace({');
    expect(planningPage).toContain(
      "if (previousUserIdRef.current !== userId) {\n      if (previousUserIdRef.current) {\n        resetPlanningDashboardState();\n        previousSiteIdRef.current = null;\n      }",
    );
    expect(planningPage).toContain(
      "if (!id) {\n        previousSiteIdRef.current = null;\n        resetPlanningDashboardState();\n        return;\n      }",
    );
    expect(planningPage).toContain(
      "if (previousSiteIdRef.current && previousSiteIdRef.current !== id) {\n        resetPlanningDashboardState();\n      }",
    );
    expect(planningPage).toContain("toast('Couldn’t load planning data right now. Please try again.', 'error');");
  });
});
