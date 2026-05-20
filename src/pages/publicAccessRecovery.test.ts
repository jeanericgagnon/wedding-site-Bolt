import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('public access recovery guards', () => {
  it('clears stale password-gate errors as the guest types a new password attempt', () => {
    const source = read('src/pages/SiteView.tsx');

    expect(source).toContain('const [dismissedCurrentError, setDismissedCurrentError] = useState(false);');
    expect(source).toContain('useEffect(() => { setDismissedCurrentError(false); }, [error]);');
    expect(source).toContain('const visibleError = error && !dismissedCurrentError ? error : null;');
    expect(source).toContain('{visibleError && (');
    expect(source).toContain('if (error) setDismissedCurrentError(true);');
  });
});
