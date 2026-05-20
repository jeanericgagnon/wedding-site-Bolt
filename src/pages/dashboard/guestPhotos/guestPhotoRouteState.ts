export const resolveGuestPhotoScrollTargets = (search: string): string[] => {
  const params = new URLSearchParams(search);
  const tool = params.get('tool');

  if (tool === 'guestbook') {
    return ['photos-tool-guestbook', 'photos-tool-hub-controls'];
  }

  if (tool === 'recap') {
    return ['photos-tool-recap'];
  }

  if (tool === 'video') {
    return ['photos-tool-review', 'photos-tool-memory-flow'];
  }

  return [];
};
