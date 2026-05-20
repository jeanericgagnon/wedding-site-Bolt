import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest dashboard route-support recovery wiring', () => {
  it('clears stale guest confirm-dialog state and skips role persistence without an active site id', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardRouteSupport.ts'),
      'utf8',
    );

    expect(source).toContain('const pendingConfirmationResolveRef = useRef<((confirmed: boolean) => void) | null>(null);');
    expect(source).toContain('const settleConfirmation = useCallback((confirmed: boolean) => {');
    expect(source).toContain('pendingConfirmationResolveRef.current?.(false);');
    expect(source).toContain('onCancel: () => settleConfirmation(false),');
    expect(source).toContain('onConfirm: () => settleConfirmation(true),');
    expect(source).toContain("useEffect(() => () => {\n    settleConfirmation(false);\n  }, [settleConfirmation]);");
    expect(source).toContain("if (!weddingSiteId) {\n      settleConfirmation(false);\n      return;\n    }");
    expect(source).toContain("const rawRole = readPlannerAccessRole('guests', weddingSiteId);");
    expect(source).toContain("if (!weddingSiteId) return;\n    try {\n      writePlannerAccessRole('guests', weddingSiteId, guestsRole);");
    expect(source).not.toContain("readPlannerAccessRole('guests', weddingSiteId ?? 'global')");
    expect(source).not.toContain("writePlannerAccessRole('guests', weddingSiteId ?? 'global', guestsRole)");
  });
});
