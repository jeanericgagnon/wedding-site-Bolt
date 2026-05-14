import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('coordinator event-awareness proof wiring', () => {
  it('keeps coordinator, seating, and scanner lanes tied to explicit event-aware helpers', () => {
    const coordinatorSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/coordinator/buildCoordinatorDashboardDerivedState.ts'), 'utf8');
    const seatingLookupSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/SeatingLookup.tsx'), 'utf8');
    const qrSource = readFileSync(join(process.cwd(), 'src/lib/qr/qrPayload.ts'), 'utf8');

    expect(coordinatorSource).toContain('resolveOperationalEventId');
    expect(coordinatorSource).toContain('currentEventId: checkInEventId');
    expect(seatingLookupSource).toContain('resolveChronologicalOperationalEventId');
    expect(qrSource).toContain('args.checkInStatusContext.currentEventId');
    expect(qrSource).toContain('isCoordinatorGuestInvitedToCurrentEvent');
  });
});
