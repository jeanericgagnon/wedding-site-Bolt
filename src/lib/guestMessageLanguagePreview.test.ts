import { describe, expect, it } from 'vitest';
import { buildGuestMessageLanguagePreviews } from './guestMessageLanguagePreview';

describe('guestMessageLanguagePreview', () => {
  it('builds English plus reviewed Spanish and French template previews for owner review', () => {
    const previews = buildGuestMessageLanguagePreviews({
      templateKey: 'rsvp-reminder',
      subject: 'RSVP reminder',
      body: 'Please reply when you can.',
      languages: ['en', 'es', 'fr'],
    });

    expect(previews.map((preview) => preview.language)).toEqual(['en', 'es', 'fr']);
    expect(previews.find((preview) => preview.language === 'en')).toMatchObject({
      subject: 'RSVP reminder',
      status: 'ready',
    });
    expect(previews.find((preview) => preview.language === 'es')).toMatchObject({
      label: 'Spanish',
      subject: 'Recordatorio para confirmar asistencia',
      status: 'needs-review',
    });
    expect(previews.find((preview) => preview.language === 'fr')?.body).toContain('confirmer votre presence');
  });

  it('falls back safely when a language variant is not reviewed yet', () => {
    const previews = buildGuestMessageLanguagePreviews({
      templateKey: 'blank',
      subject: 'Travel note',
      body: 'Please check the shuttle time.',
      languages: ['en', 'pt'],
    });

    expect(previews.find((preview) => preview.language === 'pt')).toMatchObject({
      subject: 'Travel note',
      body: 'Please check the shuttle time.',
      status: 'fallback',
    });
  });

  it('does not surface provider or diagnostic language in preview notes', () => {
    const previews = buildGuestMessageLanguagePreviews({
      templateKey: 'photo-request',
      subject: 'Photos',
      body: 'Upload photos here.',
      languages: ['en', 'es'],
    });

    const text = previews.flatMap((preview) => [preview.subject, preview.body, preview.note]).join(' ');
    expect(text).not.toMatch(/provider|supabase|bucket|function|diagnostic|token|secret|failed/i);
  });
});
