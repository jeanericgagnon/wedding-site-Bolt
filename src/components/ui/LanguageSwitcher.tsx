import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
] as const;

interface Props {
  className?: string;
}

export const LanguageSwitcher: React.FC<Props> = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('dayof_language', lang);
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
              i18n.language === lang.code
                ? 'text-stone-800 font-semibold'
                : 'text-stone-400 hover:text-stone-600'
            }`}
            aria-pressed={i18n.language === lang.code}
          >
            {lang.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
