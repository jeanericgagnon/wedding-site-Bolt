import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareQrPanel } from './ShareQrPanel';

describe('ShareQrPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(screen.getByRole('button', { name: 'Save private card' })).toBeInTheDocument();
  });

  it('downloads a printable private guest qr card without exposing the raw token in visible copy', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:private-card');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement;
      if (tagName === 'a') {
        Object.assign(element, { click });
      }
      return element;
    });

    render(
      <ShareQrPanel
        title="Private RSVP QR"
        description="Owner-only guest access"
        url="https://dayof.love/rsvp?token=secret-token"
        allowPrivate
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save private card' }));

    expect(createObjectUrl).toHaveBeenCalled();
    const blob = createObjectUrl.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    const html = blob instanceof Blob ? await blob.text() : '';
    expect(html).toContain('private guest link');
    expect(html).not.toContain('https://dayof.love/rsvp?token=secret-token');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:private-card');
  });
});
