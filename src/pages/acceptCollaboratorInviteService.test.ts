import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimCollaboratorInviteByToken,
  COLLABORATOR_INVITE_LOOKUP_SELECT,
  COLLABORATOR_INVITE_SITE_SELECT,
  createCollaboratorInviteAccount,
  signInCollaboratorInviteAccount,
} from './acceptCollaboratorInviteService';

const {
  signInWithPasswordMock,
  signUpMock,
  rpcMock,
} = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
  signUpMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpMock,
    },
    rpc: rpcMock,
  },
}));

describe('accept collaborator invite data boundary', () => {
  beforeEach(() => {
    signInWithPasswordMock.mockReset();
    signUpMock.mockReset();
    rpcMock.mockReset();
  });

  it('uses minimal invite and site projections', () => {
    expect(COLLABORATOR_INVITE_LOOKUP_SELECT).toBe('id, wedding_site_id, invite_email, invite_name, role, status, expires_at');
    expect(COLLABORATOR_INVITE_SITE_SELECT).toBe('site_slug, couple_name_1, couple_name_2');
  });

  it('keeps invite page lookup reads behind the service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/AcceptCollaboratorInvite.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/acceptCollaboratorInviteService.ts'), 'utf8');

    expect(page).toContain('fetchCollaboratorInviteInfo(token)');
    expect(page).toContain('claimCollaboratorInviteByToken(token)');
    expect(page).toContain('signInCollaboratorInviteAccount(');
    expect(page).toContain('createCollaboratorInviteAccount(');
    expect(page).not.toContain("from('wedding_site_collaborator_invites')");
    expect(page).not.toContain("from('wedding_sites')");
    expect(page).not.toContain("rpc('claim_collaborator_invite'");
    expect(page).not.toContain('supabase.auth.signInWithPassword');
    expect(page).not.toContain('supabase.auth.signUp');
    expect(service).toContain('.eq(\'invite_token\', token)');
    expect(service).toContain("rpc('claim_collaborator_invite'");
    expect(service).toContain('supabase.auth.signInWithPassword');
    expect(service).toContain('supabase.auth.signUp');
    expect(service).not.toContain(".select('*')");
  });

  it('exports the invite-claim helper', () => {
    expect(typeof claimCollaboratorInviteByToken).toBe('function');
  });

  it('signs in collaborator invite accounts through the service', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'invite@example.com' }, session: { access_token: 'token' } },
      error: null,
    });

    const result = await signInCollaboratorInviteAccount('invite@example.com', 'hunter22');

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

    const user = await createCollaboratorInviteAccount('invite@example.com', 'secret888', 'Avery Lane');

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
