import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders an accessible confirmation modal and confirms actions', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Delete this event?"
        description="This removes it from the schedule."
        confirmLabel="Delete event"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Delete this event?' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('This removes it from the schedule.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete event' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels with escape, close, and backdrop gestures', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(
      <ConfirmDialog open title="Clear check-ins?" onConfirm={onConfirm} onCancel={onCancel} />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(<ConfirmDialog open title="Clear check-ins?" onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close confirmation' }));
    expect(onCancel).toHaveBeenCalledTimes(2);

    rerender(<ConfirmDialog open title="Clear check-ins?" onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps the confirm button busy while async work is pending', async () => {
    let resolveConfirm: (() => void) | undefined;
    const pendingConfirm = new Promise<void>((resolve) => {
      resolveConfirm = resolve;
    });
    const onConfirm = vi.fn(() => pendingConfirm);

    render(<ConfirmDialog open title="Send reminders?" confirmLabel="Send" onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByRole('button', { name: 'Working...' })).toBeDisabled();

    expect(resolveConfirm).toBeDefined();
    resolveConfirm?.();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled());
  });
});
