import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from './LanguageSwitcher';
import { GUEST_LANGUAGE_STORAGE_KEY } from '../../lib/guestLanguagePreference';

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
    expect(JSON.parse(localStorage.getItem(GUEST_LANGUAGE_STORAGE_KEY) ?? '{}')).toMatchObject({ language: 'pt' });
  });
});
