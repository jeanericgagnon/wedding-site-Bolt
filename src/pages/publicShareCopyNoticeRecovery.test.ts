import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public and coordinator share copy notices', () => {
  it('shows travel-plan downloaded fallback directly in the event hub control', () => {
    const eventHub = readFileSync(join(process.cwd(), 'src/pages/EventHub.tsx'), 'utf8');
    const liveContent = readFileSync(join(process.cwd(), 'src/pages/EventHubLiveContent.tsx'), 'utf8');

    expect(eventHub).toContain("const [travelShareNotice, setTravelShareNotice] = useState<'copied' | 'downloaded' | null>(null);");
    expect(eventHub).toContain('const [copyingTravelPlan, setCopyingTravelPlan] = useState(false);');
    expect(eventHub).toContain('setTravelShareNotice(result);');
    expect(liveContent).toContain("'Downloaded travel details'");
    expect(liveContent).toContain("'Copied travel details'");
    expect(liveContent).toContain("'Copying travel details...'");
  });

  it('shows recap-link and story-caption fallback directly in the public recap controls', () => {
    const eventRecap = readFileSync(join(process.cwd(), 'src/pages/EventRecap.tsx'), 'utf8');

    expect(eventRecap).toContain("const [recapShareNotice, setRecapShareNotice] = useState<'copied' | 'downloaded' | null>(null);");
    expect(eventRecap).toContain("const [storyCaptionNotice, setStoryCaptionNotice] = useState<'copied' | 'downloaded' | null>(null);");
    expect(eventRecap).toContain("'Downloaded recap link'");
    expect(eventRecap).toContain("'Copied recap link'");
    expect(eventRecap).toContain("'Downloaded caption'");
    expect(eventRecap).toContain("'Copied caption'");
    expect(eventRecap).toContain("'Copying recap...'");
    expect(eventRecap).toContain("'Copying caption...'");
  });

  it('shows copied vs downloaded snapshot state in the coordinator handoff control', () => {
    const coordinatorPage = readFileSync(join(process.cwd(), 'src/pages/dashboard/CoordinatorMode.tsx'), 'utf8');
    const coordinatorPanels = readFileSync(join(process.cwd(), 'src/pages/dashboard/coordinator/CoordinatorModePanels.tsx'), 'utf8');

    expect(coordinatorPage).toContain("const [snapshotCopyNotice, setSnapshotCopyNotice] = useState<'copied' | 'downloaded' | null>(null);");
    expect(coordinatorPage).toContain('setSnapshotCopyNotice(result);');
    expect(coordinatorPanels).toContain("'Downloaded shift snapshot'");
    expect(coordinatorPanels).toContain("'Copied shift snapshot'");
    expect(coordinatorPanels).toContain("'Copying snapshot...'");
  });
});
