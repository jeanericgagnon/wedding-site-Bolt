import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('public auth and route reset guards', () => {
  it('rehydrates vendor profile creation from live search params instead of freezing the first URL', () => {
    const source = read('src/pages/VendorProfileCreate.tsx');

    expect(source).toContain('const [searchParams] = useSearchParams();');
    expect(source).toContain('function buildInitialVendorProfileCreateForm(searchParams: URLSearchParams) {');
    expect(source).toContain('const [form, setForm] = useState(() => buildInitialVendorProfileCreateForm(searchParams));');
    expect(source).toContain('const nextForm = buildInitialVendorProfileCreateForm(searchParams);');
    expect(source).toContain('setForm(nextForm);');
    expect(source).toContain('setDraft(null);');
    expect(source).toContain("setImageEditor('');");
    expect(source).toContain('setCreatedProfile(null);');
  });

  it('resets signup invite drafts when the invite route context changes', () => {
    const source = read('src/pages/Signup.tsx');

    expect(source).toContain('const clearSignupFeedback = () => {');
    expect(source).toContain('setLoading(false);');
    expect(source).toContain('setFormData({');
    expect(source).toContain("email: inviteEmail ?? '',");
    expect(source).toContain("password: '',");
    expect(source).toContain("confirmPassword: '',");
    expect(source).toContain('}, [inviteEmail, inviteRole, inviteSite, inviteToken]);');
  });

  it('resets login invite drafts when the invite route context changes', () => {
    const source = read('src/pages/Login.tsx');

    expect(source).toContain("setView('login');");
    expect(source).toContain('setLoading(false);');
    expect(source).toContain('setDemoLoading(false);');
    expect(source).toContain('setFormData({');
    expect(source).toContain("email: inviteEmail ?? '',");
    expect(source).toContain("password: '',");
    expect(source).toContain("setResetEmail(inviteEmail ?? '');");
    expect(source).toContain('}, [inviteEmail, inviteRole, inviteSite, inviteToken]);');
  });

  it('restarts payment success polling when the checkout session in the URL changes', () => {
    const source = read('src/pages/PaymentSuccess.tsx');

    expect(source).toContain('const [searchParams] = useSearchParams();');
    expect(source).toContain("const sessionId = searchParams.get('session_id');");
    expect(source).toContain('attemptsRef.current = 0;');
    expect(source).toContain("setStatus('polling');");
    expect(source).toContain('}, [sessionId]);');
    expect(source).toContain('}, [onboardingStorageScope, user, loading, navigate, sessionId]);');
  });
});
