import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimCollaboratorInviteByToken,
  COLLABORATOR_INVITE_LOOKUP_SELECT,
  COLLABORATOR_INVITE_SITE_SELECT,
  createCollaboratorInviteAccount,
  hasCollaboratorInviteSession,
  normalizeCollaboratorInviteEmail,
  signInCollaboratorInviteAccount,
} from './acceptCollaboratorInviteService';

const {
  getSessionMock,
  signInWithPasswordMock,
  signUpMock,
  rpcMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signUpMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpMock,
    },
    rpc: rpcMock,
  },
}));

describe('accept collaborator invite data boundary', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    signInWithPasswordMock.mockReset();
    signUpMock.mockReset();
    rpcMock.mockReset();
  });

  it('uses minimal invite and site projections', () => {
    expect(COLLABORATOR_INVITE_LOOKUP_SELECT).toBe('id, wedding_site_id, invite_email, invite_name, role, status, expires_at');
    expect(COLLABORATOR_INVITE_SITE_SELECT).toBe('site_slug, couple_name_1, couple_name_2');
  });

  it('normalizes collaborator invite emails at the auth service boundary', () => {
    expect(normalizeCollaboratorInviteEmail(' Planner@Example.COM ')).toBe('planner@example.com');
  });

  it('keeps invite page lookup reads behind the service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/AcceptCollaboratorInvite.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/acceptCollaboratorInviteService.ts'), 'utf8');

    expect(page).toContain('fetchCollaboratorInviteInfo(token)');
    expect(page).toContain('claimCollaboratorInviteByToken(token)');
    expect(page).toContain('hasCollaboratorInviteSession()');
    expect(page).toContain('signInCollaboratorInviteAccount(');
    expect(page).toContain('createCollaboratorInviteAccount(');
    expect(page).not.toContain("from('wedding_site_collaborator_invites')");
    expect(page).not.toContain("from('wedding_sites')");
    expect(page).not.toContain("rpc('claim_collaborator_invite'");
    expect(page).not.toContain('supabase.auth.getSession()');
    expect(page).not.toContain('supabase.auth.signInWithPassword');
    expect(page).not.toContain('supabase.auth.signUp');
    expect(service).toContain('.eq(\'invite_token\', token)');
    expect(service).toContain("rpc('claim_collaborator_invite'");
    expect(service).toContain('export async function hasCollaboratorInviteSession(): Promise<boolean>');
    expect(service).toContain('supabase.auth.getSession()');
    expect(service).toContain('supabase.auth.signInWithPassword');
    expect(service).toContain('supabase.auth.signUp');
    expect(service).not.toContain(".select('*')");
  });

  it('guards collaborator invite claims against stale token contexts', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/AcceptCollaboratorInvite.tsx'), 'utf8');

    expect(page).toContain('const claimRunRef = useRef(0);');
    expect(page).toContain('const activeInviteTokenRef = useRef<string | null>(token);');
    expect(page).toContain('activeInviteTokenRef.current = token;');
    expect(page).toContain('claimRunRef.current += 1;');
    expect(page).toContain('const isActiveClaim = () => claimRunRef.current === claimRun && activeInviteTokenRef.current === currentToken;');
    expect(page).toContain('await claimInvite(authUser, currentInvite, isActiveClaim);');
    expect(page).toContain('const hasSession = await hasCollaboratorInviteSession();\n    if (!isActiveClaim()) return;');
    expect(page).toContain('if (!isActiveClaim()) return;\n    const rpcMs = Date.now() - rpcStart;');
    expect(page).toContain('if (!isActiveClaim()) return;');
    expect(page).toContain('if (isActiveClaim()) setClaiming(false);');
  });

  it('guards collaborator invite auth submits against stale token contexts', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/AcceptCollaboratorInvite.tsx'), 'utf8');

    expect(page).toContain('const authRunRef = useRef(0);');
    expect(page).toContain('authRunRef.current += 1;');
    expect(page).toContain('const isActiveAuth = () => authRunRef.current === authRun && activeInviteTokenRef.current === submitToken;');
    expect(page).toContain('if (!isActiveAuth()) return;');
    expect(page).toContain("if (isActiveAuth()) setAuthError(safeAuthError(err, 'Couldn’t sign you in right now.'));");
    expect(page).toContain("if (isActiveAuth()) setAuthError(safeCollaboratorInviteError(err, 'Couldn’t create your account right now.'));");
    expect(page).toContain('if (isActiveAuth()) setAuthLoading(false);');
  });

  it('exports the invite-claim helper', () => {
    expect(typeof claimCollaboratorInviteByToken).toBe('function');
  });

  it('reports whether the collaborator invite flow has a session', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: { access_token: 'token' } } });
    await expect(hasCollaboratorInviteSession()).resolves.toBe(true);

    getSessionMock.mockResolvedValueOnce({ data: { session: null } });
    await expect(hasCollaboratorInviteSession()).resolves.toBe(false);
  });

  it('signs in collaborator invite accounts through the service', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'invite@example.com' }, session: { access_token: 'token' } },
      error: null,
    });

    const result = await signInCollaboratorInviteAccount(' Invite@Example.COM ', 'hunter22');

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'invite@example.com',
      password: 'hunter22',
    });
    expect(result).toEqual({
      user: { id: 'user-1', email: 'invite@example.com' },
      sessionReady: true,
    });
  });

  it('creates collaborator invite accounts through the service', async () => {
    signUpMock.mockResolvedValue({
      data: {
        user: { id: 'user-2', email: 'invite@example.com', user_metadata: { name: 'Avery Lane' } },
        session: { access_token: 'token' },
      },
      error: null,
    });

    const user = await createCollaboratorInviteAccount(' Invite@Example.COM ', 'secret888', 'Avery Lane');

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'invite@example.com',
      password: 'secret888',
      options: {
        data: {
          name: 'Avery Lane',
          full_name: 'Avery Lane',
        },
      },
    });
    expect(user).toEqual({
      id: 'user-2',
      email: 'invite@example.com',
      user_metadata: { name: 'Avery Lane' },
    });
  });

  it('preserves invited-account confirmation guidance when sign-up needs email verification', async () => {
    signUpMock.mockResolvedValue({
      data: {
        user: { id: 'user-2', email: 'invite@example.com' },
        session: null,
      },
      error: null,
    });
    signInWithPasswordMock.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'email_not_confirmed' },
    });

    await expect(createCollaboratorInviteAccount('invite@example.com', 'secret888', 'Avery Lane')).rejects.toThrow(
      'Account created for invite@example.com. Check your email to confirm your address, then come back to this invite link to finish joining.',
    );
  });
});
