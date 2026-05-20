import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings team access panel copy notices', () => {
  it('shows copied vs downloaded collaborator invite labels in the buttons', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/SettingsTeamAccessPanel.tsx'), 'utf8');

    expect(source).toContain("const [collaboratorInviteCopyNotice, setCollaboratorInviteCopyNotice] = useState<CollaboratorInviteCopyNotice>(null);");
    expect(source).toContain("const [collaboratorInviteCopying, setCollaboratorInviteCopying] = useState<{");
    expect(source).toContain("'Downloaded invite link'");
    expect(source).toContain("'Copied invite link'");
    expect(source).toContain("'Downloaded resend link'");
    expect(source).toContain("'Copied resend link'");
    expect(source).toContain("runCollaboratorInviteCopy('copy', invite.id, invite.invite_token, onCopyCollaboratorInviteLink)");
    expect(source).toContain("runCollaboratorInviteCopy('resend', invite.id, invite.invite_token, onResendCollaboratorInvite)");
  });
});
