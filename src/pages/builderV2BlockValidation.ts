type BlockDataLike = {
  text?: string;
  question?: string;
  answer?: string;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  time?: string;
  url?: string;
  email?: string;
  phone?: string;
  role?: string;
  note?: string;
};

type BlockLike = {
  id: string;
  type: string;
  data?: BlockDataLike;
};

type Params<TBlock extends BlockLike = BlockLike> = {
  sectionType: string;
  block: TBlock;
  blocks: TBlock[];
};

const trimmed = (value: string | undefined) => (typeof value === 'string' ? value.trim() : '');

const startsWith = (value: string | undefined, prefix: string) => trimmed(value).startsWith(prefix);

export const getBuilderV2BlockValidationWarning = <TBlock extends BlockLike>({
  sectionType,
  block,
  blocks,
}: Params<TBlock>) => {
  const data = block.data ?? {};

  if (block.type === 'qna' && (!trimmed(data.question) || !trimmed(data.answer))) {
    return 'Question and answer are required';
  }

  if (sectionType === 'wedding-party') {
    if (block.type === 'title' && trimmed(data.text) && !['bridal-title', 'groom-title'].includes(trimmed(data.subtitle))) {
      return 'Side headings need a bridal-title or groom-title key';
    }

    if (block.type === 'photo') {
      if (!trimmed(data.title)) return 'Party member name is recommended';
      if (!['bridal-party', 'groom-party'].includes(trimmed(data.subtitle))) {
        return 'Party members need a bridal-party or groom-party side key';
      }
    }
  }

  if (block.type === 'photo' && !trimmed(data.imageUrl)) {
    return sectionType === 'video'
      ? 'Video thumbnail URL is recommended'
      : 'Image URL is recommended';
  }

  if (block.type === 'event' && (!trimmed(data.title) || !trimmed(data.time))) {
    return 'Event title and time are required';
  }

  if ((block.type === 'registryItem' || block.type === 'fundHighlight') && !trimmed(data.title)) {
    return 'Item title is required';
  }

  if (sectionType === 'contact' && block.type === 'travelTip') {
    if (!trimmed(data.title)) return 'Contact name is required';
    if (!trimmed(data.email) && !trimmed(data.phone)) return 'Add an email or phone so guests have a real contact path';
  }

  if (sectionType === 'menu') {
    if (block.type === 'title' && !startsWith(data.subtitle, 'course:')) {
      return 'Course headings need a course key';
    }

    if (block.type === 'travelTip') {
      if (!trimmed(data.title)) return 'Menu item name is required';
      if (!startsWith(data.subtitle, 'course:')) return 'Menu items need a course key';
      const hasMatchingCourse = blocks.some((candidate) => (
        candidate.type === 'title'
        && trimmed(candidate.data?.subtitle) === trimmed(data.subtitle)
      ));
      if (!hasMatchingCourse) return 'Menu item needs a matching course heading';
    }
  }

  if (sectionType === 'music' && block.type === 'travelTip') {
    if (startsWith(data.subtitle, 'playlist-link:')) {
      if (!trimmed(data.url)) return 'Playlist links need a URL';
      if (!trimmed(data.role)) return 'Playlist links should name the music service';
    } else if (startsWith(data.subtitle, 'playlist-track:')) {
      if (!trimmed(data.title)) return 'Track title is required';
      if (!trimmed(data.note)) return 'Track artist is recommended';
    } else if (!trimmed(data.subtitle)) {
      return 'Music entries need a playlist key';
    }
  }

  if (sectionType === 'video') {
    if (block.type === 'photo' && !startsWith(data.subtitle, 'video:')) {
      return 'Video thumbnails need a video key';
    }

    if (block.type === 'travelTip') {
      if (!trimmed(data.url)) return 'Video links need a URL';
      if (!startsWith(data.subtitle, 'video:')) return 'Video links need a video key';
      const hasMatchingThumbnail = blocks.some((candidate) => (
        candidate.type === 'photo'
        && trimmed(candidate.data?.subtitle) === trimmed(data.subtitle)
      ));
      if (!hasMatchingThumbnail) return 'Video link needs a matching thumbnail block';
    }
  }

  return '';
};
