export type BuilderV2BlockContentLike = {
  text?: string;
  question?: string;
  answer?: string;
  imageUrl?: string;
  caption?: string;
  title?: string;
  subtitle?: string;
  time?: string;
  location?: string;
  note?: string;
  url?: string;
  phone?: string;
  email?: string;
  role?: string;
  bookingCode?: string;
  blockDeadline?: string;
  priceRange?: string;
  distance?: string;
};

export type BuilderV2BlockFieldKey = keyof BuilderV2BlockContentLike;

export type BuilderV2BlockFieldDescriptor = {
  key: BuilderV2BlockFieldKey;
  label: string;
  multiline?: boolean;
  inputType?: 'text' | 'url' | 'email' | 'tel';
};

export type BuilderV2BlockPreviewSummary = {
  imageUrl?: string;
  imageAlt?: string;
  primary?: string;
  secondary?: string;
  detail?: string;
  url?: string;
};

const joinParts = (values: Array<string | undefined>) => values.filter(Boolean).join(' · ');

const hasAnyStructuredPhotoText = (data: BuilderV2BlockContentLike) =>
  Boolean(data.title || data.role || data.note || data.subtitle);

export const buildBuilderV2BlockFieldDescriptors = (
  sectionType: string,
  blockType: string,
  data: BuilderV2BlockContentLike,
): BuilderV2BlockFieldDescriptor[] => {
  if (blockType === 'qna' || blockType === 'faqItem') {
    return [
      { key: 'question', label: 'Question' },
      { key: 'answer', label: 'Answer', multiline: true },
    ];
  }

  if (blockType === 'photo') {
    if (sectionType === 'quotes') {
      return [
        { key: 'title', label: 'Author' },
        { key: 'role', label: 'Role' },
        { key: 'note', label: 'Quote', multiline: true },
        { key: 'imageUrl', label: 'Photo URL', inputType: 'url' },
        { key: 'caption', label: 'Photo caption' },
      ];
    }

    if (sectionType === 'video') {
      return [
        { key: 'title', label: 'Video title' },
        { key: 'note', label: 'Description', multiline: true },
        { key: 'role', label: 'Platform' },
        { key: 'subtitle', label: 'Video key' },
        { key: 'imageUrl', label: 'Thumbnail URL', inputType: 'url' },
        { key: 'caption', label: 'Thumbnail caption' },
      ];
    }

    if (sectionType === 'wedding-party' || hasAnyStructuredPhotoText(data)) {
      return [
        { key: 'title', label: sectionType === 'wedding-party' ? 'Name' : 'Title' },
        { key: 'role', label: 'Role' },
        { key: 'note', label: 'Note', multiline: true },
        ...(data.subtitle ? [{
          key: 'subtitle',
          label: sectionType === 'wedding-party' ? 'Side key' : 'Group key',
        } satisfies BuilderV2BlockFieldDescriptor] : []),
        { key: 'imageUrl', label: 'Image URL', inputType: 'url' },
        { key: 'caption', label: 'Caption' },
      ];
    }

    return [
      { key: 'imageUrl', label: 'Image URL', inputType: 'url' },
      { key: 'caption', label: 'Caption' },
    ];
  }

  if (blockType === 'title') {
    if (sectionType === 'menu') {
      return [
        { key: 'text', label: 'Course heading' },
        { key: 'subtitle', label: 'Course key' },
      ];
    }

    if (sectionType === 'music') {
      return [
        { key: 'text', label: 'Playlist heading' },
        { key: 'subtitle', label: 'Playlist key' },
      ];
    }

    if (sectionType === 'wedding-party') {
      return [
        { key: 'text', label: 'Side heading' },
        { key: 'subtitle', label: 'Side key' },
      ];
    }

    return [
      { key: 'text', label: 'Heading' },
      ...(data.subtitle ? [{ key: 'subtitle', label: 'Group key' } satisfies BuilderV2BlockFieldDescriptor] : []),
    ];
  }

  if (blockType === 'timelineItem') {
    return [
      { key: 'title', label: 'Milestone title' },
      { key: 'note', label: 'Milestone note', multiline: true },
    ];
  }

  if (blockType === 'divider') {
    return [{ key: 'text', label: 'Divider text' }];
  }

  if (blockType === 'event') {
    return [
      { key: 'title', label: 'Title' },
      { key: 'time', label: 'Time' },
      { key: 'location', label: 'Location' },
      { key: 'note', label: 'Note', multiline: true },
    ];
  }

  if (blockType === 'hotelCard') {
    return [
      { key: 'title', label: 'Hotel name' },
      { key: 'location', label: 'Address' },
      { key: 'phone', label: 'Phone', inputType: 'tel' },
      { key: 'bookingCode', label: 'Booking code' },
      { key: 'blockDeadline', label: 'Block deadline' },
      { key: 'priceRange', label: 'Price range' },
      { key: 'distance', label: 'Distance from venue' },
      { key: 'note', label: 'Hotel note', multiline: true },
      { key: 'url', label: 'Booking URL', inputType: 'url' },
    ];
  }

  if (blockType === 'travelTip') {
    if (sectionType === 'contact') {
      return [
        { key: 'title', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'email', label: 'Email', inputType: 'email' },
        { key: 'phone', label: 'Phone', inputType: 'tel' },
        { key: 'note', label: 'Support note', multiline: true },
      ];
    }

    if (sectionType === 'menu') {
      return [
        { key: 'title', label: 'Dish name' },
        { key: 'note', label: 'Description', multiline: true },
        { key: 'role', label: 'Dietary tags' },
        { key: 'subtitle', label: 'Course key' },
      ];
    }

    if (sectionType === 'music' && data.subtitle?.startsWith('playlist-link:')) {
      return [
        { key: 'title', label: 'Link label' },
        { key: 'url', label: 'Playlist URL', inputType: 'url' },
        { key: 'role', label: 'Service' },
        { key: 'subtitle', label: 'Playlist key' },
      ];
    }

    if (sectionType === 'music' && data.subtitle?.startsWith('playlist-track:')) {
      return [
        { key: 'title', label: 'Song title' },
        { key: 'note', label: 'Artist', multiline: true },
        { key: 'role', label: 'Moment' },
        { key: 'subtitle', label: 'Playlist key' },
      ];
    }

    if (sectionType === 'video') {
      return [
        { key: 'title', label: 'Link label' },
        { key: 'url', label: 'Video URL', inputType: 'url' },
        { key: 'role', label: 'Platform' },
        { key: 'subtitle', label: 'Video key' },
      ];
    }

    if (sectionType === 'directions') {
      return [
        { key: 'title', label: 'Transport title' },
        { key: 'note', label: 'Transport detail', multiline: true },
        ...(data.url ? [{ key: 'url', label: 'Map URL', inputType: 'url' } satisfies BuilderV2BlockFieldDescriptor] : []),
      ];
    }

    return [
      { key: 'title', label: 'Title' },
      { key: 'note', label: 'Note', multiline: true },
      { key: 'url', label: 'URL (optional)', inputType: 'url' },
    ];
  }

  if (blockType === 'registryItem' || blockType === 'fundHighlight') {
    return [
      { key: 'title', label: 'Title' },
      { key: 'note', label: 'Note', multiline: true },
      { key: 'url', label: 'URL (optional)', inputType: 'url' },
    ];
  }

  if (blockType === 'rsvpNote') {
    return [{ key: 'note', label: 'RSVP note', multiline: true }];
  }

  if (blockType === 'story') {
    const label = sectionType === 'menu'
      ? 'Menu note'
      : sectionType === 'music'
        ? 'Request note'
        : sectionType === 'contact'
          ? 'Closing note'
          : 'Story paragraph';
    return [{ key: 'text', label, multiline: true }];
  }

  if (blockType === 'text') {
    const label = sectionType === 'contact'
      ? 'Intro note'
      : sectionType === 'directions'
        ? 'Detail note'
        : 'Content';
    return [{ key: 'text', label, multiline: true }];
  }

  return [{ key: 'text', label: 'Content', multiline: true }];
};

export const buildBuilderV2BlockPreviewSummary = (
  sectionType: string,
  blockType: string,
  data: BuilderV2BlockContentLike,
): BuilderV2BlockPreviewSummary => {
  if (blockType === 'qna' || blockType === 'faqItem') {
    return {
      primary: data.question ? `Q: ${data.question}` : 'Q&A',
      detail: data.answer ? `A: ${data.answer}` : undefined,
    };
  }

  if (blockType === 'photo') {
    if (sectionType === 'quotes') {
      return {
        imageUrl: data.imageUrl,
        imageAlt: data.title || data.caption || 'Quote photo',
        primary: data.title || 'Quote',
        secondary: data.role,
        detail: data.note || data.caption,
      };
    }

    if (sectionType === 'video') {
      return {
        imageUrl: data.imageUrl,
        imageAlt: data.title || data.caption || 'Video thumbnail',
        primary: data.title || 'Video thumbnail',
        secondary: joinParts([data.role, data.subtitle]),
        detail: data.note || data.caption,
      };
    }

    return {
      imageUrl: data.imageUrl,
      imageAlt: data.caption || data.title || 'Photo',
      primary: data.title || data.caption || 'Photo',
      secondary: sectionType === 'wedding-party'
        ? joinParts([data.role, data.subtitle])
        : data.role,
      detail: data.note,
    };
  }

  if (blockType === 'title') {
    return {
      primary: data.text || 'Heading',
      secondary: data.subtitle,
    };
  }

  if (blockType === 'timelineItem') {
    return {
      primary: data.title || 'Timeline item',
      detail: data.note,
    };
  }

  if (blockType === 'divider') {
    return { primary: data.text || 'Divider' };
  }

  if (blockType === 'event') {
    return {
      primary: data.title || 'Event',
      secondary: joinParts([data.time, data.location]),
      detail: data.note,
    };
  }

  if (blockType === 'hotelCard') {
    return {
      primary: data.title || 'Hotel',
      secondary: joinParts([data.location, data.distance]),
      detail: joinParts([data.note, data.priceRange, data.bookingCode ? `Code: ${data.bookingCode}` : undefined]),
      url: data.url,
    };
  }

  if (blockType === 'travelTip') {
    if (sectionType === 'contact') {
      return {
        primary: data.title || 'Contact',
        secondary: joinParts([data.role, data.email, data.phone]),
        detail: data.note,
      };
    }

    if (sectionType === 'menu') {
      return {
        primary: data.title || 'Menu item',
        secondary: joinParts([data.role, data.subtitle]),
        detail: data.note,
      };
    }

    if (sectionType === 'music') {
      return {
        primary: data.title || 'Music entry',
        secondary: joinParts([data.role, data.subtitle]),
        detail: data.note,
        url: data.url,
      };
    }

    if (sectionType === 'video') {
      return {
        primary: data.title || 'Video link',
        secondary: joinParts([data.role, data.subtitle]),
        url: data.url,
      };
    }

    return {
      primary: data.title || 'Tip',
      secondary: data.role,
      detail: data.note,
      url: data.url,
    };
  }

  if (blockType === 'registryItem' || blockType === 'fundHighlight') {
    return {
      primary: data.title || 'Registry item',
      detail: data.note,
      url: data.url,
    };
  }

  if (blockType === 'rsvpNote') {
    return {
      primary: 'RSVP note',
      detail: data.note,
    };
  }

  return {
    primary: data.text || 'Content block',
  };
};
