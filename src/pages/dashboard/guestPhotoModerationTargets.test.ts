import { describe, expect, it } from 'vitest';

import { getBulkGuestPhotoModerationTargets, getVisibleGuestPhotoUploads } from './guestPhotoModerationTargets';

const uploads = [
  { id: 'plain', is_hidden: false, is_flagged: false },
  { id: 'flagged', is_hidden: false, is_flagged: true },
  { id: 'hidden', is_hidden: true, is_flagged: false },
  { id: 'hidden-flagged', is_hidden: true, is_flagged: true },
];

describe('guestPhotoModerationTargets', () => {
  it('returns only uploads visible under the current moderation filters', () => {
    expect(getVisibleGuestPhotoUploads(uploads, { showHidden: false, showFlaggedOnly: false }).map((upload) => upload.id)).toEqual([
      'plain',
      'flagged',
    ]);
    expect(getVisibleGuestPhotoUploads(uploads, { showHidden: false, showFlaggedOnly: true }).map((upload) => upload.id)).toEqual([
      'flagged',
    ]);
    expect(getVisibleGuestPhotoUploads(uploads, { showHidden: true, showFlaggedOnly: true }).map((upload) => upload.id)).toEqual([
      'flagged',
      'hidden-flagged',
    ]);
  });

  it('flags or unflags only the uploads that are both visible and need a flag change', () => {
    expect(
      getBulkGuestPhotoModerationTargets(uploads, { showHidden: false, showFlaggedOnly: true }, { type: 'flag', flagged: false }).map(
        (upload) => upload.id,
      ),
    ).toEqual(['flagged']);

    expect(
      getBulkGuestPhotoModerationTargets(uploads, { showHidden: false, showFlaggedOnly: false }, { type: 'flag', flagged: true }).map(
        (upload) => upload.id,
      ),
    ).toEqual(['plain']);
  });

  it('hides or unhides only the uploads that are both visible and need a visibility change', () => {
    expect(
      getBulkGuestPhotoModerationTargets(uploads, { showHidden: false, showFlaggedOnly: false }, { type: 'hide', hidden: true }).map(
        (upload) => upload.id,
      ),
    ).toEqual(['plain', 'flagged']);

    expect(
      getBulkGuestPhotoModerationTargets(uploads, { showHidden: true, showFlaggedOnly: false }, { type: 'hide', hidden: false }).map(
        (upload) => upload.id,
      ),
    ).toEqual(['hidden', 'hidden-flagged']);
  });
});
