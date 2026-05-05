import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { writeStoredGuestLanguage, type GuestLanguageCode } from '../../lib/guestLanguagePreference';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'it', label: 'IT' },
  { code: 'de', label: 'DE' },
  { code: 'pt', label: 'PT' },
] as const;

interface Props {
  className?: string;
}

export const LanguageSwitcher: React.FC<Props> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const activeLanguage = i18n.language?.split('-')[0]?.toLowerCase() || 'en';

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    writeStoredGuestLanguage(lang as GuestLanguageCode);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label="Language selector">
      <Globe className="w-4 h-4 text-stone-400 flex-shrink-0" aria-hidden="true" />
      {LANGUAGES.map((lang, idx) => (
        <React.Fragment key={lang.code}>
          {idx > 0 && <span className="text-stone-300 text-xs select-none">/</span>}
          <button
            onClick={() => handleChange(lang.code)}
            className={`text-xs font-medium px-1 py-0.5 rounded transition-colors ${
              activeLanguage === lang.code
                ? 'text-stone-800 font-semibold'
                : 'text-stone-400 hover:text-stone-600'
            }`}
            aria-pressed={activeLanguage === lang.code}
          >
            {lang.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
