import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RsvpSection } from './RsvpSection';

describe('public site RSVP section', () => {
  it('shows a disabled fallback action when RSVP routing is not available yet', () => {
    render(
      <RsvpSection
        content={{
          deadline_text: '',
          message: '',
          meal_options: [],
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'RSVP opening soon' })).toBeDisabled();
    expect(screen.getByText('Reply details will be added here soon.')).toBeInTheDocument();
  });

  it('keeps the RSVP action active when the site can route guests', () => {
    render(
      <RsvpSection
        weddingSiteId="site-1"
        content={{
          deadline_text: '',
          message: 'Please reply by June 1.',
          meal_options: ['Chicken', 'Vegetarian'],
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Send RSVP' })).toBeEnabled();
    expect(screen.getByText('Please reply by June 1.')).toBeInTheDocument();
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
  });
});
