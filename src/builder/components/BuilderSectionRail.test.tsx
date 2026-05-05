import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BuilderSectionRail } from './BuilderSectionRail';

describe('BuilderSectionRail', () => {
  it('keeps reorder controls outside the section select button', () => {
    render(
      <BuilderSectionRail
        activeSections={[
          { id: 'hero-1', type: 'hero' },
          { id: 'venue-1', type: 'venue' },
        ]}
        selectedSectionId="hero-1"
        onSelectSection={vi.fn()}
        onAddSection={vi.fn()}
        onReorderSections={vi.fn()}
      />
    );

    const heroButton = screen.getByRole('button', { name: 'Hero' });
    expect(within(heroButton).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByTitle('Move up')).toHaveLength(2);
    expect(screen.getAllByTitle('Move down')).toHaveLength(2);
  });

  it('shows a short recommended set before the full section library', async () => {
    render(
      <BuilderSectionRail
        activeSections={[{ id: 'hero-1', type: 'hero' }]}
        selectedSectionId="hero-1"
        onSelectSection={vi.fn()}
        onAddSection={vi.fn()}
        onReorderSections={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /\+ add section/i }));

    expect(screen.getByText('Recommended first')).toBeInTheDocument();
    expect(screen.getByText('More sections')).toBeInTheDocument();

    const recommendedPanel = screen.getByLabelText('Recommended sections');
    expect(within(recommendedPanel).getByRole('button', { name: /Hero/i })).toBeInTheDocument();
    expect(within(recommendedPanel).getByRole('button', { name: /Venue/i })).toBeInTheDocument();
    expect(within(recommendedPanel).getByRole('button', { name: /Schedule/i })).toBeInTheDocument();
  });
});
