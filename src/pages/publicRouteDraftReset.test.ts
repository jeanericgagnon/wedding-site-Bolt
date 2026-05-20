import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public route draft reset wiring', () => {
  it('resets photo upload draft state when the upload link context changes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/PhotoUpload.tsx'),
      'utf8',
    );

    expect(source).toContain('const [searchParams] = useSearchParams();');
    expect(source).toContain('const params = useMemo(() => new URLSearchParams(searchParams), [searchParams]);');
    expect(source).toContain('useEffect(() => {');
    expect(source).toContain('setToken(initialToken);');
    expect(source).toContain("setGuestName('');");
    expect(source).toContain('setFiles([]);');
    expect(source).toContain('clearUploadFeedback();');
  });

  it('resets collaborator invite auth drafts when the invite token changes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/AcceptCollaboratorInvite.tsx'),
      'utf8',
    );

    expect(source).toContain("setAuthMode('signin');");
    expect(source).toContain('setSignInForm(initialSignInForm);');
    expect(source).toContain('setSignUpForm(initialSignUpForm);');
    expect(source).toContain('claimAttemptKeyRef.current = null;');
    expect(source).toContain('}, [token]);');
    expect(source).toContain('setSignInForm({');
    expect(source).toContain('...initialSignInForm,');
    expect(source).toContain('setSignUpForm({');
    expect(source).toContain('...initialSignUpForm,');
  });
});
