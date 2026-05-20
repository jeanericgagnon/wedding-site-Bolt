import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings fresh-attempt recovery wiring', () => {
  it('clears stale site visibility feedback when the owner edits site-access fields again', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Settings.tsx'), 'utf8');

    expect(source).toContain("const clearVisibilityFeedback = React.useCallback(() => {");
    expect(source).toContain("setHideFromSearch: (value) => {\n      clearVisibilityFeedback();\n      setHideFromSearch(value);\n    },");
    expect(source).toContain("setAnalyticsEnabled: (value) => {\n      clearVisibilityFeedback();\n      setAnalyticsEnabled(value);\n    },");
    expect(source).toContain("setAnalyticsRetentionDays: (value) => {\n      clearVisibilityFeedback();\n      setAnalyticsRetentionDays(value);\n    },");
    expect(source).toContain("setAnalyticsGuestNotice: (value) => {\n      clearVisibilityFeedback();\n      setAnalyticsGuestNotice(value);\n    },");
    expect(source).toContain("setMusicPlaylistUrl: (value) => {\n      clearVisibilityFeedback();\n      setMusicPlaylistUrl(value);\n    },");
    expect(source).toContain("setPrivacyMode: (value) => {\n      clearVisibilityFeedback();\n      setPrivacyMode(value);\n    },");
    expect(source).toContain("setSitePassword: (value) => {\n      clearVisibilityFeedback();\n      setSitePassword(value);\n    },");
  });

  it('clears stale RSVP and notification feedback when the owner edits those drafts again', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Settings.tsx'), 'utf8');

    expect(source).toContain("const clearRsvpFeedback = React.useCallback(() => {");
    expect(source).toContain("setRsvpMealEnabled: (value) => {\n      clearRsvpFeedback();\n      setRsvpMealEnabled(value);\n    },");
    expect(source).toContain("setRsvpMealOptions: (value) => {\n      clearRsvpFeedback();\n      setRsvpMealOptions(value);\n    },");
    expect(source).toContain("setRsvpQuestions: (value) => {\n      clearRsvpFeedback();\n      setRsvpQuestions(value);\n    },");
    expect(source).toContain("const clearNotificationFeedback = React.useCallback(() => {");
    expect(source).toContain("setNotifRsvp: (value) => {\n      clearNotificationFeedback();\n      setNotifRsvp(value);\n    },");
    expect(source).toContain("setNotifPhotos: (value) => {\n      clearNotificationFeedback();\n      setNotifPhotos(value);\n    },");
    expect(source).toContain("setNotifDigest: (value) => {\n      clearNotificationFeedback();\n      setNotifDigest(value);\n    },");
    expect(source).toContain("setNotifDigestCadence: (value) => {\n      clearNotificationFeedback();\n      setNotifDigestCadence(value);\n    },");
    expect(source).toContain("setNotifDigestIncludePlanner: (value) => {\n      clearNotificationFeedback();\n      setNotifDigestIncludePlanner(value);\n    },");
    expect(source).toContain("setNotifDigestQuietUntilLabel: (value) => {\n      clearNotificationFeedback();\n      setNotifDigestQuietUntilLabel(value);\n    },");
    expect(source).toContain("setNotifUpdates: (value) => {\n      clearNotificationFeedback();\n      setNotifUpdates(value);\n    },");
  });
});
