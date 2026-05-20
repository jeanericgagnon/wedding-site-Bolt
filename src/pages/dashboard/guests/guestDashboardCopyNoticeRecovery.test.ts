import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest dashboard copy notice recovery', () => {
  it('returns copy outcomes from the guest export and checklist action helpers', () => {
    const exportsSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardExports.ts'), 'utf8');
    const clipboardSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardClipboardActions.ts'), 'utf8');
    const routeActionsSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/buildGuestDashboardRouteActions.tsx'), 'utf8');

    expect(exportsSource).toContain('return result;');
    expect(exportsSource).toContain('return null;');
    expect(clipboardSource).toContain('return copyWithFeedback(');
    expect(routeActionsSource).toContain('onCopyAddressCollectionLink: () => args.copyContactRequestLink(),');
    expect(routeActionsSource).toContain('onCopyExceptionChecklist: () => args.handleCopyExceptionChecklist(),');
    expect(routeActionsSource).toContain('onCopyMissingMealChecklist: () => args.handleCopyMissingMealChecklist(),');
    expect(routeActionsSource).toContain('onCopyTextRsvpLinks: () => args.copySmsRsvpLinksForFiltered(),');
  });

  it('shows downloaded fallback labels in the guest summary and segment controls', () => {
    const summarySource = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/GuestOpsSummaryPanel.tsx'), 'utf8');
    const segmentSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/GuestSegmentControlsPanel.tsx'), 'utf8');

    expect(summarySource).toContain("'Downloaded guest contact link'");
    expect(summarySource).toContain("'Copied guest contact link'");
    expect(summarySource).toContain("'Copying link...'");
    expect(segmentSource).toContain("'Downloaded exception checklist'");
    expect(segmentSource).toContain("'Downloaded meal follow-up checklist'");
    expect(segmentSource).toContain("'Downloaded follow-up checklist'");
    expect(segmentSource).toContain("'Downloaded guest update link'");
    expect(segmentSource).toContain("'Copied exception checklist'");
    expect(segmentSource).toContain("'Copied meal follow-up checklist'");
    expect(segmentSource).toContain("'Copied follow-up checklist'");
    expect(segmentSource).toContain("'Copied guest update link'");
  });
});
