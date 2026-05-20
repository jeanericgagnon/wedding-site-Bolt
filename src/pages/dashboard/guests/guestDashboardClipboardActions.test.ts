import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest dashboard clipboard actions', () => {
  it('catches clipboard/export failures across the guest follow-up export helpers', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardClipboardActions.ts'), 'utf8');

    expect(source).toContain('const copyWithFeedback = async (');
    expect(source).toContain('const copyActionContextKey = useMemo(() => JSON.stringify({');
    expect(source).toContain('const isCurrentClipboardCopyAction = beginClipboardCopyAction();');
    expect(source).toContain('if (!isCurrentClipboardCopyAction()) return null;');
    expect(source).toContain('followUpTasks: followUpTasks.map((task) => task.text)');
    expect(source).toContain("toast(failureMessage, 'error');");
    expect(source).toContain("failureMessage: string,");
    expect(source).toContain("'Couldn’t copy the RSVP follow-up summary right now.'");
    expect(source).toContain("'Couldn’t copy the RSVP exception checklist right now.'");
    expect(source).toContain("'Couldn’t copy the meal follow-up checklist right now.'");
    expect(source).toContain("'Couldn’t copy the missing-contact list right now.'");
    expect(source).toContain("'Couldn’t copy the filtered guest emails right now.'");
    expect(source).toContain("'Couldn’t copy the guest checklist right now.'");
    expect(source).toContain("'Couldn’t copy the campaign dry run right now.'");
  });
});
