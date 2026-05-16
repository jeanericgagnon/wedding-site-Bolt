import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventHubConfigStatusCard } from './EventHubConfigStatusCard';

describe('EventHubConfigStatusCard', () => {
  it('shows the loading copy only while the guest hub is still resolving live details', () => {
    render(<EventHubConfigStatusCard status="loading" onRetry={vi.fn()} />);

    expect(screen.getByText('Loading the latest wedding details…')).toBeInTheDocument();
    expect(screen.queryByText(/Showing the saved guest hub/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Try again/i })).not.toBeInTheDocument();
  });

  it('stays hidden once the guest hub is ready', () => {
    render(<EventHubConfigStatusCard status="ready" onRetry={vi.fn()} />);

    expect(screen.queryByText(/Showing the saved guest hub/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading the latest wedding details/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Try again/i })).not.toBeInTheDocument();
  });

  it('shows the saved guest hub warning only while fallback content is actually active', () => {
    const onRetry = vi.fn();
    render(<EventHubConfigStatusCard status="fallback" onRetry={onRetry} />);

    expect(screen.getByText('Showing the saved guest hub')).toBeInTheDocument();
    expect(screen.getByText('Travel, RSVP, and photo links are still available. Try again when the connection feels steadier.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps the retryable saved-hub warning visible for offline mode too', () => {
    const onRetry = vi.fn();
    render(<EventHubConfigStatusCard status="offline" onRetry={onRetry} />);

    expect(screen.getByText('Showing the saved guest hub')).toBeInTheDocument();
    expect(screen.getByText('Travel, RSVP, and photo links are still available. Try again when the connection feels steadier.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('clears the loading and fallback banner once the guest hub becomes ready again', () => {
    const { rerender } = render(<EventHubConfigStatusCard status="loading" onRetry={vi.fn()} />);

    expect(screen.getByText('Loading the latest wedding details')).toBeInTheDocument();

    rerender(<EventHubConfigStatusCard status="fallback" onRetry={vi.fn()} />);

    expect(screen.getByText('Showing the saved guest hub')).toBeInTheDocument();

    rerender(<EventHubConfigStatusCard status="ready" onRetry={vi.fn()} />);

    expect(screen.queryByText('Loading the latest wedding details')).not.toBeInTheDocument();
    expect(screen.queryByText('Showing the saved guest hub')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Try again/i })).not.toBeInTheDocument();
  });
});
