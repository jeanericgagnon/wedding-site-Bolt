import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COLLABORATOR_INVITE_LOOKUP_SELECT,
  COLLABORATOR_INVITE_SITE_SELECT,
} from './acceptCollaboratorInviteService';

describe('accept collaborator invite data boundary', () => {
  it('uses minimal invite and site projections', () => {
    expect(COLLABORATOR_INVITE_LOOKUP_SELECT).toBe('id, wedding_site_id, invite_email, invite_name, role, status, expires_at');
    expect(COLLABORATOR_INVITE_SITE_SELECT).toBe('site_slug, couple_name_1, couple_name_2');
  });

  it('keeps invite page lookup reads behind the service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/AcceptCollaboratorInvite.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/acceptCollaboratorInviteService.ts'), 'utf8');

    expect(page).toContain('fetchCollaboratorInviteInfo(token)');
    expect(page).not.toContain("from('wedding_site_collaborator_invites')");
    expect(page).not.toContain("from('wedding_sites')");
    expect(service).toContain('.eq(\'invite_token\', token)');
    expect(service).not.toContain(".select('*')");
  });
});
