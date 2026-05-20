import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('event guest manager modal reset wiring', () => {
  it('resets modal workspace state when the event changes or the modal closes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/EventGuestManagerModal.tsx'),
      'utf8',
    );

    expect(source).toContain('const resetEventGuestManagerState = useCallback(() => {');
    expect(source).toContain('setConfirmDialog(null);');
    expect(source).toContain('setAllGuests([]);');
    expect(source).toContain('setInvitedGuestIds(new Set());');
    expect(source).toContain("setSearchQuery('');");
    expect(source).toContain("useEffect(() => {\n    resetEventGuestManagerState();\n    void loadGuests();");
    expect(source).toContain("useEffect(() => () => {\n    resetEventGuestManagerState();\n  }, [resetEventGuestManagerState]);");
  });
});
