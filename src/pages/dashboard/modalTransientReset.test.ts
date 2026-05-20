import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('modal transient reset guards', () => {
  it('resets message detail modal action state when the active message changes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/messages/MessageDetailModal.tsx'),
      'utf8',
    );

    expect(source).toContain('setRetrying(false);');
    expect(source).toContain('setSendingScheduledNow(false);');
    expect(source).toContain('setRescheduling(false);');
    expect(source).toContain('setCancellingSchedule(false);');
    expect(source).toContain('}, [initialScheduleInput, message.id]);');
  });

  it('resets billing modal checkout state when the active user or plan changes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/billing/BillingModal.tsx'),
      'utf8',
    );

    expect(source).toContain("useEffect(() => {");
    expect(source).toContain('setLoading(false);');
    expect(source).toContain('setError(null);');
    expect(source).toContain("}, [currentPlan, user?.id]);");
  });
});
