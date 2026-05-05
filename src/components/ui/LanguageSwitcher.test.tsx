import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from './LanguageSwitcher';

const changeLanguage = vi.fn();
let currentLanguage = 'en-US';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: currentLanguage,
      changeLanguage,
    },
  }),
}));

describe('LanguageSwitcher', () => {
  it('marks regional locales as the matching base language', () => {
    currentLanguage = 'en-US';

    render(<LanguageSwitcher />);

    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'ES' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('changes language and stores the guest preference', () => {
    currentLanguage = 'fr-CA';
    changeLanguage.mockReset();
    localStorage.clear();

    render(<LanguageSwitcher />);

    expect(screen.getByRole('button', { name: 'FR' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'PT' }));

    expect(changeLanguage).toHaveBeenCalledWith('pt');
    expect(localStorage.getItem('dayof_language')).toBe('pt');
  });
});
