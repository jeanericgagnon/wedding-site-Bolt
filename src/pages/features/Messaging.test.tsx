import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: React.PropsWithChildren<{ to: string }>) => <a href={to}>{children}</a>,
}));

vi.mock('../../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

vi.mock('../../components/ui', () => ({
  Button: ({ children }: React.PropsWithChildren) => <button type="button">{children}</button>,
}));

import { MessagingFeature } from './Messaging';

describe('MessagingFeature', () => {
  it('keeps SMS marketing copy narrowed to sender-ready texting instead of broad live claims', () => {
    render(<MessagingFeature />);

    expect(screen.getByText('Email works well for most updates. Text can support urgent changes once sender setup is ready. Either way, the right guests get the right message.')).toBeInTheDocument();
    expect(screen.getByText('Texting, when enabled')).toBeInTheDocument();
    expect(screen.getByText('For urgent updates like venue changes or weather alerts, DayOf can support text once sender setup and delivery readiness are in place. Until then, keep texting plans reviewable instead of pretending the lane is fully live.')).toBeInTheDocument();
    expect(screen.getByText('Message visibility')).toBeInTheDocument();
    expect(screen.getByText('SMS path stays gated until sender setup is ready')).toBeInTheDocument();
    expect(screen.getByText('Delivery-oriented updates')).toBeInTheDocument();
    expect(screen.getByText('Message history')).toBeInTheDocument();
    expect(screen.queryByText('No markup, transparent pricing.')).not.toBeInTheDocument();
    expect(screen.queryByText('$0.02 per message')).not.toBeInTheDocument();
    expect(screen.queryByText('International support')).not.toBeInTheDocument();
    expect(screen.queryByText('Open Tracking')).not.toBeInTheDocument();
    expect(screen.queryByText('Open updates')).not.toBeInTheDocument();
    expect(screen.queryByText('Click updates')).not.toBeInTheDocument();
  });
});
