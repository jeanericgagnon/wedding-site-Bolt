import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2BlockFieldDescriptors,
  buildBuilderV2BlockFieldOptions,
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

  it('builds wedding party editor fields with side metadata', () => {
    const titleFields = buildBuilderV2BlockFieldDescriptors('wedding-party', 'title', { subtitle: 'bridal-title' });
    const photoFields = buildBuilderV2BlockFieldDescriptors('wedding-party', 'photo', { subtitle: 'bridal-party' });

    expect(titleFields.map((field) => field.label)).toEqual(['Side heading', 'Side key']);
    expect(photoFields.map((field) => field.label)).toContain('Side key');
    expect(buildBuilderV2BlockFieldOptions('wedding-party', 'title', { subtitle: 'bridal-title' }, []).subtitle).toEqual([
      { value: 'bridal-title', label: 'Partner one heading' },
      { value: 'groom-title', label: 'Partner two heading' },
    ]);
    expect(buildBuilderV2BlockFieldOptions('wedding-party', 'photo', { subtitle: 'bridal-party' }, []).subtitle).toEqual([
      { value: 'bridal-party', label: 'Partner one side' },
      { value: 'groom-party', label: 'Partner two side' },
    ]);
  });

  it('builds menu, music, and video subtitle options from current section structure', () => {
    expect(buildBuilderV2BlockFieldOptions('menu', 'travelTip', { subtitle: 'course:course-1' }, [
      { type: 'title', data: { text: 'Dinner', subtitle: 'course:course-1' } },
      { type: 'title', data: { text: 'Dessert', subtitle: 'course:course-2' } },
    ]).subtitle).toEqual([
      { value: 'course:course-1', label: 'Dinner' },
      { value: 'course:course-2', label: 'Dessert' },
    ]);

    expect(buildBuilderV2BlockFieldOptions('music', 'travelTip', { subtitle: 'playlist-track:pl-1' }, [
      { type: 'title', data: { text: 'Ceremony', subtitle: 'playlist:pl-1' } },
      { type: 'title', data: { text: 'Reception', subtitle: 'playlist:pl-2' } },
    ]).subtitle).toEqual([
      { value: 'playlist-track:pl-1', label: 'Ceremony' },
      { value: 'playlist-track:pl-2', label: 'Reception' },
    ]);

    expect(buildBuilderV2BlockFieldOptions('video', 'travelTip', { subtitle: 'video:v1' }, [
      { type: 'photo', data: { title: 'Save the Date', subtitle: 'video:v1' } },
      { type: 'photo', data: { title: 'Weekend Preview', subtitle: 'video:v2' } },
    ]).subtitle).toEqual([
      { value: 'video:v1', label: 'Save the Date' },
      { value: 'video:v2', label: 'Weekend Preview' },
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

  it('includes side metadata in wedding party preview summaries', () => {
    const preview = buildBuilderV2BlockPreviewSummary('wedding-party', 'photo', {
      title: 'Ava',
      role: 'Maid of Honor',
      subtitle: 'bridal-party',
    });

    expect(preview.secondary).toContain('Maid of Honor');
    expect(preview.secondary).toContain('bridal-party');
  });
});
