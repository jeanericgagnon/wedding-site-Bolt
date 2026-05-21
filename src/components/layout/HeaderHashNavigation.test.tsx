import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
  }),
}));

vi.mock('../ui/Toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('Header hash navigation', () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  const originalIntersectionObserver = globalThis.IntersectionObserver;

  beforeEach(() => {
    vi.useFakeTimers();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    globalThis.IntersectionObserver = class {
      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
    } as unknown as typeof IntersectionObserver;
    document.body.innerHTML = '<section id="features"></section>';
  });

  afterEach(() => {
    vi.useRealTimers();
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    globalThis.IntersectionObserver = originalIntersectionObserver;
    document.body.innerHTML = '';
  });

  it('cancels delayed hash scrolling after the header unmounts', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/#features']}>
        <Header />
      </MemoryRouter>,
    );

    unmount();
    vi.advanceTimersByTime(150);

    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not render demo CTA controls when demo mode is disabled', () => {
    const { queryByRole } = render(
      <MemoryRouter initialEntries={['/']}>
        <Header />
      </MemoryRouter>,
    );

    expect(queryByRole('button', { name: 'View demo' })).not.toBeInTheDocument();
  });
});
