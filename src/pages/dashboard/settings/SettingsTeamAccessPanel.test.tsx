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
    expect(source).toContain("runCollaboratorInviteCopy('copy', invite.id, invite.invite_token, onCopyCollaboratorInviteLink)");
    expect(source).toContain("runCollaboratorInviteCopy('resend', invite.id, invite.invite_token, onResendCollaboratorInvite)");
  });

  it('keeps team access framing concise instead of the older dense explainer copy', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/SettingsTeamAccessPanel.tsx'), 'utf8');

    expect(source).toContain('Invite planners and helpers without sharing ownership or billing.');
    expect(source).toContain('Keep ownership with the couple.');
    expect(source).toContain('Helpers join through a secure invite link and only see the areas you allow.');
    expect(source).not.toContain('Invite your planner, not a generic staff account');
    expect(source).not.toContain('Keep ownership with the couple while sharing the parts of dayof that help someone run the event well.');
  });
});
