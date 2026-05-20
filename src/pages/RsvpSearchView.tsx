import React from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { OwnerPreviewBanner } from '../components/site/OwnerPreviewBanner';

interface RsvpSearchViewProps {
  activePredictionId: string | undefined;
  activePredictionIndex: number;
  error: string;
  guestPredictions: string[];
  loading: boolean;
  onActivePredictionIndexChange: React.Dispatch<React.SetStateAction<number>>;
  onCancelLoading: () => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSearchValueChange: (value: string) => void;
  predictionListId: string;
  searchHintId: string;
  searchInputId: string;
  searchValue: string;
  t: (key: string) => string;
}

export function RsvpSearchView({
  activePredictionId,
  activePredictionIndex,
  error,
  guestPredictions,
  loading,
  onActivePredictionIndexChange,
  onCancelLoading,
  onSearchSubmit,
  onSearchValueChange,
  predictionListId,
  searchHintId,
  searchInputId,
  searchValue,
  t,
}: RsvpSearchViewProps) {
  return (
    <>
      <OwnerPreviewBanner />
      <div className="relative z-10 flex justify-end px-6 pt-4">
        <LanguageSwitcher />
      </div>
      <div className="container relative z-10 mx-auto max-w-6xl px-4 pb-14 pt-8 md:pt-12">
        <div className="grid items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[360px] overflow-hidden rounded-xl bg-stone-900">
            <img
              src="/preview-photos/header-anchor.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/78 via-black/48 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-white md:p-9">
              <p className="mb-3 text-sm font-semibold !text-white/85">{t('rsvp.hero_eyebrow')}</p>
              <h1 className="max-w-xl font-serif text-4xl leading-tight !text-white md:text-5xl">
                {t('rsvp.hero_title')}
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 !text-white opacity-85">
                {t('rsvp.hero_subtitle')}
              </p>
            </div>
          </div>

          <Card className="self-center border-border-subtle bg-white p-5 md:p-7">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-serif mb-2">{t('rsvp.title')}</h2>
              <p className="text-gray-600">{t('rsvp.subtitle')}</p>
            </div>

            <form onSubmit={onSearchSubmit} className="space-y-4.5">
              <div>
                <label htmlFor={searchInputId} className="block text-sm font-medium mb-2">
                  {t('rsvp.search_label')}
                </label>
                <Input
                  id={searchInputId}
                  type="text"
                  value={searchValue}
                  onChange={(e) => {
                    onCancelLoading();
                    onActivePredictionIndexChange(-1);
                    onSearchValueChange(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (guestPredictions.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      onActivePredictionIndexChange((idx) => (idx + 1) % guestPredictions.length);
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      onActivePredictionIndexChange((idx) => (idx <= 0 ? guestPredictions.length - 1 : idx - 1));
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      onActivePredictionIndexChange(-1);
                      return;
                    }
                    if (e.key === 'Enter' && activePredictionIndex >= 0) {
                      e.preventDefault();
                      onCancelLoading();
                      onActivePredictionIndexChange(-1);
                      onSearchValueChange(guestPredictions[activePredictionIndex]);
                    }
                  }}
                  placeholder={t('rsvp.search_placeholder')}
                  className="h-11"
                  autoComplete="name"
                  aria-describedby={searchHintId}
                  aria-autocomplete="list"
                  aria-expanded={guestPredictions.length > 0}
                  aria-controls={guestPredictions.length > 0 ? predictionListId : undefined}
                  aria-activedescendant={activePredictionId}
                  required
                />
                <p id={searchHintId} className="text-xs text-gray-500 mt-1.5">
                  {t('rsvp.search_hint')}
                </p>
                {guestPredictions.length > 0 && (
                  <div
                    id={predictionListId}
                    role="listbox"
                    aria-label="Suggested guests"
                    className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden"
                  >
                    {guestPredictions.map((name, index) => (
                      <button
                        key={name}
                        id={`${predictionListId}-${index}`}
                        role="option"
                        aria-selected={guestPredictions[activePredictionIndex] === name}
                        type="button"
                        onClick={() => {
                          onCancelLoading();
                          onActivePredictionIndexChange(-1);
                          onSearchValueChange(name);
                        }}
                        onMouseEnter={() => onActivePredictionIndexChange(guestPredictions.indexOf(name))}
                        className={`w-full text-left px-3 py-2 text-sm ${guestPredictions[activePredictionIndex] === name ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-surface-subtle/50 border border-border-subtle rounded-xl text-text-secondary text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  <ul className="pl-6 space-y-1 text-xs text-text-tertiary list-disc">
                    <li>Make sure you're using the invitation link or code from your email</li>
                    <li>Check that the full code was copied without extra spaces</li>
                    <li>Contact the couple if you're still having trouble</li>
                  </ul>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? t('rsvp.searching') : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    {t('rsvp.search_button')}
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
