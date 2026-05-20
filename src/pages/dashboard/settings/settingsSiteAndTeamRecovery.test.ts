import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings site and team recovery wiring', () => {
  it('clears stale planner invite status once the owner edits team-access fields again', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Settings.tsx'), 'utf8');

    expect(source).toContain("setPlannerInviteName: (value) => {\n      setPlannerInviteError(null);\n      setPlannerInviteSuccess(null);\n      setPlannerInviteName(value);\n    },");
    expect(source).toContain("setPlannerInviteEmail: (value) => {\n      setPlannerInviteError(null);\n      setPlannerInviteSuccess(null);\n      setPlannerInviteEmail(value);\n    },");
    expect(source).toContain("setPlannerInviteRole: (value) => {\n      setPlannerInviteError(null);\n      setPlannerInviteSuccess(null);\n      setPlannerInviteRole(value);\n    },");
    expect(source).toContain("setPlannerInvitePermissions: (value) => {\n      setPlannerInviteError(null);\n      setPlannerInviteSuccess(null);\n      setPlannerInvitePermissions(value);\n    },");
  });

  it('clears stale site-url and playlist status once the owner edits those fields again', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Settings.tsx'), 'utf8');

    expect(source).toContain("setSiteSlug: (value) => {\n      setSlugError(null);\n      setSlugSuccess(null);\n      setSiteSlug(value);\n    },");
    expect(source).toContain("setMusicPlaylistUrl: (value) => {\n      setVisibilityError(null);\n      setVisibilitySuccess(null);\n      setMusicPlaylistUrl(value);\n    },");
  });
});
