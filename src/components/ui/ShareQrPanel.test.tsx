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
});
