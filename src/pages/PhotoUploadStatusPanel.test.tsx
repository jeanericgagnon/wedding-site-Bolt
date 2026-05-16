import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PhotoUploadStatusPanel } from './PhotoUploadStatusPanel';

const t = (key: string) => {
  const translations: Record<string, string> = {
    'photo_upload.see_recap': 'See the recap',
    'photo_upload.back_hub': 'Back to the hub',
    'photo_upload.create_own': 'Create your own',
  };
  return translations[key] ?? key;
};

describe('PhotoUploadStatusPanel', () => {
  it('renders guest-safe success actions for uploads opened from the guest hub', () => {
    render(
      <PhotoUploadStatusPanel
        panelId="photo-upload-status-panel"
        error={null}
        message="1 file uploaded."
        siteSlug="maya-leo"
        fromHub
        uploadedNames={['dance-floor.jpg']}
        failedNames={[]}
        t={t}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('1 file uploaded.');
    expect(screen.getByRole('link', { name: 'See the recap' })).toHaveAttribute('href', '/event/maya-leo/recap');
    expect(screen.getByRole('link', { name: 'Back to the hub' })).toHaveAttribute('href', '/event/maya-leo');
    expect(screen.getByRole('link', { name: 'Create your own' })).toHaveAttribute('href', '/signup');
  });

  it('renders uploaded and failed file lists without leaking internal diagnostics', () => {
    render(
      <PhotoUploadStatusPanel
        panelId="photo-upload-status-panel"
        error="Couldn’t upload that file. Please try again."
        message={null}
        siteSlug="maya-leo"
        fromHub={false}
        uploadedNames={['dance-floor.jpg']}
        failedNames={['slow-motion.mov']}
        t={t}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t upload that file. Please try again.');
    expect(screen.getByText('dance-floor.jpg')).toBeInTheDocument();
    expect(screen.getByText('slow-motion.mov')).toBeInTheDocument();
    expect(screen.queryByText(/functions\/v1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/storage bucket/i)).not.toBeInTheDocument();
  });

  it('keeps hub-only follow-up actions hidden for uploads that did not start from the guest hub', () => {
    render(
      <PhotoUploadStatusPanel
        panelId="photo-upload-status-panel"
        error={null}
        message="1 file uploaded."
        siteSlug="maya-leo"
        fromHub={false}
        uploadedNames={[]}
        failedNames={[]}
        t={t}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('1 file uploaded.');
    expect(screen.queryByRole('link', { name: 'See the recap' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to the hub' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your own' })).toHaveAttribute('href', '/signup');
  });

  it('collapses long uploaded and failed file lists into a guest-safe summary', () => {
    render(
      <PhotoUploadStatusPanel
        panelId="photo-upload-status-panel"
        error="Some files need another try."
        message="Uploads finished."
        siteSlug="maya-leo"
        fromHub
        uploadedNames={[
          'photo-1.jpg',
          'photo-2.jpg',
          'photo-3.jpg',
          'photo-4.jpg',
          'photo-5.jpg',
          'photo-6.jpg',
          'photo-7.jpg',
          'photo-8.jpg',
          'photo-9.jpg',
          'photo-10.jpg',
        ]}
        failedNames={[
          'clip-1.mov',
          'clip-2.mov',
          'clip-3.mov',
          'clip-4.mov',
          'clip-5.mov',
          'clip-6.mov',
          'clip-7.mov',
          'clip-8.mov',
          'clip-9.mov',
        ]}
        t={t}
      />,
    );

    expect(screen.getByText('photo-8.jpg')).toBeInTheDocument();
    expect(screen.queryByText('photo-9.jpg')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.getByText('clip-8.mov')).toBeInTheDocument();
    expect(screen.queryByText('clip-9.mov')).not.toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });
});
