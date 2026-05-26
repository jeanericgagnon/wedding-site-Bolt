import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('coordinator shift snapshot copy recovery', () => {
  it('ignores stale shift snapshot copy completions after snapshot context changes', () => {
    const coordinatorMode = read('src/pages/dashboard/CoordinatorMode.tsx');

    expect(coordinatorMode).toContain("const [snapshotCopyNotice, setSnapshotCopyNotice] = useState<'copied' | 'downloaded' | null>(null);");
    expect(coordinatorMode).toContain('const [copyingShiftSnapshot, setCopyingShiftSnapshot] = useState(false);');
    expect(coordinatorMode).toContain('const shiftSnapshotCopyRequestIdRef = useRef(0);');
    expect(coordinatorMode).toContain("const shiftSnapshotContextKey = `${shiftSnapshot.filename}\\n${shiftSnapshot.text}`;");
    expect(coordinatorMode).toContain('const requestContextKey = shiftSnapshotContextKeyRef.current;');
    expect(coordinatorMode).toContain('requestContextKey === shiftSnapshotContextKeyRef.current');
    expect(coordinatorMode).toContain('shiftSnapshotCopyRequestIdRef.current += 1;');
    expect(coordinatorMode).toContain('setCopyingShiftSnapshot(false);');
    expect(coordinatorMode).toContain('setSnapshotCopyNotice(null);');
    expect(coordinatorMode).toContain('if (!isCurrentShiftSnapshotCopy()) return;');
    expect(coordinatorMode).toContain("toast(result === 'copied' ? 'Shift snapshot copied.' : 'Shift snapshot downloaded.', 'success');");
    expect(coordinatorMode).toContain('if (isCurrentShiftSnapshotCopy()) {\n        setCopyingShiftSnapshot(false);\n      }');
  });

  it('keeps the snapshot control labels in the visible coordinator panel', () => {
    const coordinatorPanels = read('src/pages/dashboard/coordinator/CoordinatorModePanels.tsx');

    expect(coordinatorPanels).toContain("'Copying snapshot...'");
    expect(coordinatorPanels).toContain("'Downloaded shift snapshot'");
    expect(coordinatorPanels).toContain("'Copied shift snapshot'");
    expect(coordinatorPanels).toContain('disabled={copyingSnapshot}');
  });
});
