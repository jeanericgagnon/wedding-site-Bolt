import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShareQrPanel } from './ShareQrPanel';

describe('ShareQrPanel', () => {
  it('renders a safe public share link and QR image', () => {
    render(<ShareQrPanel title="Guest hub" url="https://dayof.love/event/maya-and-leo" />);

    expect(screen.getByText('https://dayof.love/event/maya-and-leo')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Guest hub QR code' })).toHaveAttribute(
      'src',
      expect.stringContaining('https://api.qrserver.com/v1/create-qr-code/'),
    );
  });

  it.each([
    'https://dayof.love/event/maya-and-leo?token=secret',
    'https://user:pass@dayof.love/event/maya-and-leo',
    'http://169.254.169.254/latest/meta-data',
    'javascript:alert(1)',
  ])('renders nothing for unsafe share url %s', (url) => {
    const { container } = render(<ShareQrPanel title="Guest hub" url={url} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders private guest qr locally without showing the raw token in normal UI', () => {
    render(<ShareQrPanel title="Private RSVP QR" url="https://dayof.love/rsvp?token=secret-token" allowPrivate />);

    expect(screen.getByText('https://dayof.love/rsvp · private guest link')).toBeInTheDocument();
    expect(screen.queryByText('https://dayof.love/rsvp?token=secret-token')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Private RSVP QR QR code' })).toHaveAttribute(
      'src',
      expect.stringContaining('data:image/svg+xml'),
    );
  });
});
