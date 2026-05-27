import { describe, expect, it } from 'vitest';
import { buildBuilderV2PreviewInstances } from './builderV2PreviewProjection';
import type { LabPage } from './builderV2PageState';

describe('builderV2PreviewProjection', () => {
  it('projects builder v2 block content into preview-ready legacy section settings', () => {
    const pages: LabPage[] = [
      {
        id: 'home',
        title: 'Home',
        slug: 'home',
        isHome: true,
        hidden: false,
        sections: [
          {
            id: 'menu-1',
            type: 'menu',
            title: 'Dinner',
            subtitle: 'A few favorites for the night.',
            variant: 'tabs',
            enabled: true,
            density: 'comfortable',
          },
          {
            id: 'video-1',
            type: 'video',
            title: 'Weekend films',
            subtitle: '',
            variant: 'card',
            enabled: true,
            density: 'comfortable',
          },
        ],
      },
    ];

    const previewInstances = buildBuilderV2PreviewInstances({
      pages,
      activePageId: 'home',
      sectionBlocks: {
        'menu-1': [
          { id: 'menu-eyebrow', type: 'qna', content: '', data: { question: 'Eyebrow', answer: 'Dining' } },
          { id: 'menu-course', type: 'title', content: '', data: { text: 'Main Course', subtitle: 'course:course-1' } },
          { id: 'menu-item', type: 'travelTip', content: '', data: { title: 'Wild Mushroom Risotto', note: 'With parmesan and herbs.', role: 'vegetarian|gluten-free', subtitle: 'course:course-1' } },
          { id: 'menu-note', type: 'story', content: '', data: { text: 'Please tell us about dietary restrictions.' } },
        ],
        'video-1': [
          { id: 'video-eyebrow', type: 'qna', content: '', data: { question: 'Eyebrow', answer: 'Moments on Film' } },
          { id: 'video-background', type: 'qna', content: '', data: { question: 'Background', answer: 'soft' } },
          { id: 'video-photo', type: 'photo', content: '', data: { title: 'Save the Date', note: 'A little preview of the weekend.', imageUrl: 'https://example.com/video.jpg', role: 'youtube', subtitle: 'video:v1' } },
          { id: 'video-link', type: 'travelTip', content: '', data: { title: 'Save the Date', url: 'https://youtu.be/abcdefghijk', role: 'youtube', subtitle: 'video:v1' } },
        ],
      },
    });

    expect(previewInstances[0]?.settings).toMatchObject({
      eyebrow: 'Dining',
      headline: 'Dinner',
      subtitle: 'A few favorites for the night.',
      note: 'Please tell us about dietary restrictions.',
      courses: [
        {
          label: 'Main Course',
          items: [
            {
              name: 'Wild Mushroom Risotto',
              description: 'With parmesan and herbs.',
              dietary: ['vegetarian', 'gluten-free'],
            },
          ],
        },
      ],
    });

    expect(previewInstances[1]?.settings).toMatchObject({
      eyebrow: 'Moments on Film',
      headline: 'Weekend films',
      background: 'soft',
      videos: [
        {
          title: 'Save the Date',
          description: 'A little preview of the weekend.',
          videoUrl: 'https://youtu.be/abcdefghijk',
          thumbnailUrl: 'https://example.com/video.jpg',
          videoType: 'youtube',
        },
      ],
    });
  });
});
