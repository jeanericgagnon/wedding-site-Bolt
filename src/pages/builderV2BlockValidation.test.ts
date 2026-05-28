import { describe, expect, it } from 'vitest';

import { getBuilderV2BlockValidationWarning } from './builderV2BlockValidation';

describe('builderV2BlockValidation', () => {
  it('keeps generic qna validation', () => {
    expect(getBuilderV2BlockValidationWarning({
      sectionType: 'faq',
      block: { id: 'q1', type: 'qna', data: { question: 'Parking?' } },
      blocks: [],
    })).toBe('Question and answer are required');
  });

  it('requires a real guest contact path for contact cards', () => {
    expect(getBuilderV2BlockValidationWarning({
      sectionType: 'contact',
      block: { id: 'c1', type: 'travelTip', data: { title: 'Maya Chen' } },
      blocks: [],
    })).toBe('Add an email or phone so guests have a real contact path');
  });

  it('requires wedding party members to keep a side key', () => {
    expect(getBuilderV2BlockValidationWarning({
      sectionType: 'wedding-party',
      block: { id: 'party-1', type: 'photo', data: { title: 'Ava' } },
      blocks: [],
    })).toBe('Party members need a bridal-party or groom-party side key');
  });

  it('requires menu items to point at a matching course heading', () => {
    expect(getBuilderV2BlockValidationWarning({
      sectionType: 'menu',
      block: { id: 'm1', type: 'travelTip', data: { title: 'Risotto', subtitle: 'course:course-1' } },
      blocks: [
        { id: 'other-course', type: 'title', data: { text: 'Dessert', subtitle: 'course:course-2' } },
      ],
    })).toBe('Menu item needs a matching course heading');
  });

  it('requires playlist links to include a URL', () => {
    expect(getBuilderV2BlockValidationWarning({
      sectionType: 'music',
      block: { id: 'music-link', type: 'travelTip', data: { title: 'Spotify', role: 'spotify', subtitle: 'playlist-link:pl-1' } },
      blocks: [],
    })).toBe('Playlist links need a URL');
  });

  it('requires video links to include a matching thumbnail block', () => {
    expect(getBuilderV2BlockValidationWarning({
      sectionType: 'video',
      block: { id: 'video-link', type: 'travelTip', data: { title: 'Save the Date', url: 'https://youtu.be/abcdefghijk', subtitle: 'video:v1' } },
      blocks: [],
    })).toBe('Video link needs a matching thumbnail block');
  });

  it('passes healthy long-tail blocks', () => {
    expect(getBuilderV2BlockValidationWarning({
      sectionType: 'video',
      block: { id: 'video-link', type: 'travelTip', data: { title: 'Save the Date', url: 'https://youtu.be/abcdefghijk', subtitle: 'video:v1' } },
      blocks: [
        { id: 'video-thumb', type: 'photo', data: { imageUrl: 'https://example.com/thumb.jpg', subtitle: 'video:v1' } },
      ],
    })).toBe('');
  });

  it('clears qna warnings as soon as the missing field is restored', () => {
    expect(getBuilderV2BlockValidationWarning({
      sectionType: 'faq',
      block: { id: 'q1', type: 'qna', data: { question: 'Parking?', answer: 'Use the west lot.' } },
      blocks: [],
    })).toBe('');
  });

  it('clears contact warnings as soon as a real guest contact path is added', () => {
    expect(getBuilderV2BlockValidationWarning({
      sectionType: 'contact',
      block: { id: 'c1', type: 'travelTip', data: { title: 'Maya Chen', email: 'maya@example.com' } },
      blocks: [],
    })).toBe('');
  });
});
