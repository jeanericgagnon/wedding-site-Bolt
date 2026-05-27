import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2BlockFieldDescriptors,
  buildBuilderV2BlockPreviewSummary,
} from './builderV2BlockPresentation';

describe('builderV2BlockPresentation', () => {
  it('builds structured contact editor fields', () => {
    const fields = buildBuilderV2BlockFieldDescriptors('contact', 'travelTip', {});
    expect(fields.map((field) => field.label)).toEqual([
      'Name',
      'Role',
      'Email',
      'Phone',
      'Support note',
    ]);
  });

  it('builds menu item editor fields with dietary metadata', () => {
    const fields = buildBuilderV2BlockFieldDescriptors('menu', 'travelTip', { subtitle: 'course:course-1' });
    expect(fields.map((field) => field.label)).toEqual([
      'Dish name',
      'Description',
      'Dietary tags',
      'Course key',
    ]);
  });

  it('builds music playlist link editor fields', () => {
    const fields = buildBuilderV2BlockFieldDescriptors('music', 'travelTip', { subtitle: 'playlist-link:pl-1' });
    expect(fields.map((field) => field.label)).toEqual([
      'Link label',
      'Playlist URL',
      'Service',
      'Playlist key',
    ]);
  });

  it('builds hotel editor fields with richer booking metadata', () => {
    const fields = buildBuilderV2BlockFieldDescriptors('accommodations', 'hotelCard', {});
    expect(fields.map((field) => field.label)).toContain('Booking code');
    expect(fields.map((field) => field.label)).toContain('Block deadline');
    expect(fields.map((field) => field.label)).toContain('Distance from venue');
  });

  it('builds richer preview summaries for contact blocks', () => {
    const preview = buildBuilderV2BlockPreviewSummary('contact', 'travelTip', {
      title: 'Maya Chen',
      role: 'Planner',
      email: 'maya@example.com',
      phone: '+1 (415) 555-0199',
      note: 'Reach out for logistics questions.',
    });

    expect(preview.primary).toBe('Maya Chen');
    expect(preview.secondary).toContain('Planner');
    expect(preview.secondary).toContain('maya@example.com');
    expect(preview.detail).toContain('logistics questions');
  });

  it('builds richer preview summaries for video blocks', () => {
    const preview = buildBuilderV2BlockPreviewSummary('video', 'photo', {
      title: 'Save the Date',
      note: 'A quick preview of the weekend.',
      role: 'youtube',
      subtitle: 'video:v1',
      imageUrl: 'https://example.com/video.jpg',
    });

    expect(preview.imageUrl).toBe('https://example.com/video.jpg');
    expect(preview.primary).toBe('Save the Date');
    expect(preview.secondary).toContain('youtube');
    expect(preview.secondary).toContain('video:v1');
    expect(preview.detail).toContain('preview of the weekend');
  });
});
