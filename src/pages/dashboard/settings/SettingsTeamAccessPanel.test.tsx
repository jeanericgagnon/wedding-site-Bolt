import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings team access panel copy notices', () => {
  it('shows copied vs downloaded collaborator invite labels in the buttons', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/SettingsTeamAccessPanel.tsx'), 'utf8');

    expect(source).toContain("const [collaboratorInviteCopyNotice, setCollaboratorInviteCopyNotice] = useState<CollaboratorInviteCopyNotice>(null);");
    expect(source).toContain("const [collaboratorInviteCopying, setCollaboratorInviteCopying] = useState<{");
    expect(source).toContain('const collaboratorInviteCopyRequestIdRef = useRef(0);');
    expect(source).toContain('const collaboratorInviteSignature = useMemo(');
    expect(source).toContain('collaboratorInviteCopyRequestIdRef.current += 1;');
    expect(source).toContain('setCollaboratorInviteCopyNotice(null);');
    expect(source).toContain('setCollaboratorInviteCopying(null);');
    expect(source).toContain('const requestId = ++collaboratorInviteCopyRequestIdRef.current;');
    expect(source).toContain('const isCurrentInviteCopy = () => (');
    expect(source).toContain('requestId === collaboratorInviteCopyRequestIdRef.current');
    expect(source).toContain('collaboratorInviteSignatureRef.current === requestSignature');
    expect(source).toContain('if (result && isCurrentInviteCopy())');
    expect(source).toContain("'Downloaded invite link'");
    expect(source).toContain("'Copied invite link'");
    expect(source).toContain("'Downloaded resend link'");
    expect(source).toContain("'Copied resend link'");
    expect(source).toContain("runCollaboratorInviteCopy('copy', invite.id, onCopyCollaboratorInviteLink)");
    expect(source).toContain("runCollaboratorInviteCopy('resend', invite.id, onResendCollaboratorInvite)");
    expect(source).toContain("Invite URL: {revealedInviteLinks[invite.id] ? revealedInviteLinks[invite.id] : '/accept-collaborator-invite?token=••••••••••'}");
    expect(source).toContain('Clear test invites');
  });
});
