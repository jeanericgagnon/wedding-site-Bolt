import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  contactInteractiveHubDefinition,
  contactInteractiveHubSchema,
  INTERACTIVE_HUB_STORAGE_RETENTION_MS,
  readInteractiveCounts,
  readInteractiveSuggestions,
} from './interactiveHub';

const renderHub = (data = contactInteractiveHubSchema.parse({})) => render(
  <MemoryRouter>
    <contactInteractiveHubDefinition.Component data={data} />
  </MemoryRouter>,
);

describe('contact interactive hub variant', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('renders builder-authored poll and quiz options from newline fields', () => {
    renderHub(contactInteractiveHubSchema.parse({
      pollPrompt: 'Which late-night snack should we serve?',
      pollOptions: 'Pizza\nTacos\nDoughnuts',
      quizPrompt: 'Where did we get engaged?',
      quizOptions: 'Paris\nChicago\nAustin',
      correctQuizOption: 'Chicago',
    }));

    fireEvent.click(screen.getByRole('button', { name: /Chicago/i }));

    expect(screen.getByText('Which late-night snack should we serve?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pizza/i })).toBeInTheDocument();
    expect(screen.getByText('Where did we get engaged?')).toBeInTheDocument();
    expect(screen.getByText('Nice one, correct!')).toBeInTheDocument();
  });

  it('stores local suggestions without keeping duplicates', () => {
    renderHub();

    fireEvent.change(screen.getByPlaceholderText('Type your idea...'), {
      target: { value: 'Lavender lemonade' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    fireEvent.change(screen.getByPlaceholderText('Type your idea...'), {
      target: { value: ' lavender   lemonade ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getAllByText('Lavender lemonade')).toHaveLength(1);
    expect(readInteractiveSuggestions('interactive:site:suggestions')).toEqual(['Lavender lemonade']);
  });

  it('drops expired local interactive envelopes', () => {
    vi.setSystemTime(new Date('2026-05-19T20:00:00Z'));
    const expiredISO = new Date(Date.now() - INTERACTIVE_HUB_STORAGE_RETENTION_MS - 1000).toISOString();
    window.localStorage.setItem('counts', JSON.stringify({
      savedAtISO: expiredISO,
      counts: { stale: 3 },
    }));
    window.localStorage.setItem('suggestions', JSON.stringify({
      savedAtISO: expiredISO,
      suggestions: ['stale idea'],
    }));

    expect(readInteractiveCounts('counts')).toEqual({});
    expect(readInteractiveSuggestions('suggestions')).toEqual([]);
    expect(window.localStorage.getItem('counts')).toBeNull();
    expect(window.localStorage.getItem('suggestions')).toBeNull();
  });
});
