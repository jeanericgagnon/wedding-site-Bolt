import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings site access actions', () => {
  it('handles collaborator invite copy outcomes without overstating clipboard success', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/useSettingsSiteAccessActions.ts'), 'utf8');

    expect(source).toContain('setPlannerInviteSuccess(null);');
    expect(source).toContain('setPlannerInviteError(null);');
    expect(source).toContain("setPlannerInviteError(safeSettingsError(err, 'Couldn’t copy the collaborator invite link right now.'));");
    expect(source).toContain("if (result === 'copied') {\n      setPlannerInviteSuccess('Invite link copied for sending.');\n    } else if (result === 'downloaded') {\n      setPlannerInviteSuccess('Clipboard was blocked, so the invite link downloaded for sending.');\n    }");
  });

  it('clears stale guest access copy state and catches identity export copy failures', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/useSettingsSiteAccessActions.ts'), 'utf8');

    expect(source).toContain('const privacyCopyNoticeTimeoutRef = useRef<number | null>(null);');
    expect(source).toContain('if (privacyCopyNoticeTimeoutRef.current) window.clearTimeout(privacyCopyNoticeTimeoutRef.current);');
    expect(source).toContain('setPrivacyCopyNotice(null);');
    expect(source).toContain("setPrivacyCopyNotice('copied');");
    expect(source).toContain("setPrivacyCopyNotice('downloaded');");
    expect(source).toContain("privacyCopyNoticeTimeoutRef.current = window.setTimeout(() => setPrivacyCopyNotice((current) => (current === result ? null : current)), 2000);");
    expect(source).toContain("toast(safeSettingsError(err, 'Couldn’t copy the guest access link right now.'), 'error');");
    expect(source).toContain("toast(safeSettingsError(err, 'Couldn’t copy the wedding identity manifest right now.'), 'error');");
    expect(source).toContain("toast(safeSettingsError(err, 'Couldn’t copy the wedding identity style kit right now.'), 'error');");
  });

  it('guards stale collaborator invite actions from overwriting newer settings context', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/useSettingsSiteAccessActions.ts'), 'utf8');

    expect(source).toContain('const collaboratorInviteActionRequestIdRef = useRef(0);');
    expect(source).toContain('const actionContextRef = useRef({ userId, weddingSiteId });');
    expect(source).toContain('actionContextRef.current = { userId, weddingSiteId };');
    expect(source).toContain('const requestId = ++collaboratorInviteActionRequestIdRef.current;');
    expect(source).toContain('const actionUserId = userId;');
    expect(source).toContain('const isCurrentCollaboratorInviteAction = (targetSiteId?: string | null) =>');
    expect(source).toContain('actionContextRef.current.userId === actionUserId');
    expect(source).toContain('(!targetSiteId || !actionContextRef.current.weddingSiteId || actionContextRef.current.weddingSiteId === targetSiteId)');
    expect(source).toContain('if (!isCurrentCollaboratorInviteAction(targetSiteId)) return;');
    expect(source).toContain('if (!isCurrentCollaboratorInviteAction()) return;');
    expect(source).toContain('actionContextRef.current.weddingSiteId === actionSiteId;');
    expect(source).toContain('if (isCurrentCollaboratorInviteAction(targetSiteId)) {\n        setCreatingCollaboratorInvite(false);\n      }');
    expect(source).toContain('if (isCurrentCollaboratorInviteAction()) {\n        setRevokingCollaboratorInviteId(null);\n      }');
  });

  it('guards collaborator invite copy feedback against stale site context', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/settings/useSettingsSiteAccessActions.ts'), 'utf8');

    expect(source).toContain('const collaboratorInviteCopyRequestIdRef = useRef(0);');
    expect(source).toContain('const actionSiteId = weddingSiteId;');
    expect(source).toContain('const isCurrentCollaboratorInviteCopy = () =>');
    expect(source).toContain('requestId === collaboratorInviteCopyRequestIdRef.current');
    expect(source).toContain('actionContextRef.current.userId === actionUserId &&');
    expect(source).toContain('(!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);');
    expect(source).toContain('if (!isCurrentCollaboratorInviteCopy()) return null;');
  });
});
