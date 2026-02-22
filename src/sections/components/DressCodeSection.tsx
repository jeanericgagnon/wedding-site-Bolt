import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Shirt, Star } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

const DRESS_CODE_PRESETS: Record<string, { label: string; description: string; suggestions: string[] }> = {
  'black-tie': {
    label: 'Black Tie',
    description: 'Formal evening attire is requested.',
    suggestions: ['Tuxedos or dark suits', 'Floor-length gowns or formal cocktail dresses', 'No jeans or casual attire'],
  },
  'black-tie-optional': {
    label: 'Black Tie Optional',
    description: 'Formal attire is encouraged but not required.',
    suggestions: ['Tuxedos or dark suits preferred', 'Cocktail dresses or formal separates', 'Smart casual is welcome'],
  },
  'cocktail': {
    label: 'Cocktail Attire',
    description: 'Semi-formal, polished looks are ideal.',
    suggestions: ['Suits or sport coats', 'Cocktail dresses or dressy separates', 'Avoid overly casual clothing'],
  },
  'garden-party': {
    label: 'Garden Party',
    description: 'Elegant but comfortable — think florals, soft colors, and breathable fabrics.',
    suggestions: ['Floral dresses or linen suits', 'Wedge or block-heel shoes recommended', 'Avoid stilettos (outdoor venue)'],
  },
  'semi-formal': {
    label: 'Semi-Formal',
    description: 'Dressy but not overly formal.',
    suggestions: ['Dress pants and button-down', 'Midi or maxi dresses', 'No jeans please'],
  },
  'casual': {
    label: 'Casual',
    description: 'Come as you are — relaxed and comfortable.',
    suggestions: ['Smart casual attire', 'No formal wear required', 'Comfortable shoes are a plus'],
  },
};

export const DressCodeSection: React.FC<Props> = ({ data: _data, instance }) => {
  const { settings } = instance;
  const presetKey = (settings.presetCode as string) || '';
  const preset = DRESS_CODE_PRESETS[presetKey];

  const title = (settings.dressCodeLabel as string) || preset?.label || settings.title as string || 'Dress Code';
  const description = (settings.description as string) || preset?.description || '';
  const suggestions = (settings.suggestions as string[]) || preset?.suggestions || [];
  const colorNote = settings.colorNote as string;
  const additionalNote = settings.additionalNote as string;

  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-3xl mx-auto text-center">
        {settings.showTitle !== false && (
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">
              {settings.eyebrow as string || 'What to wear'}
            </p>
            <h2 className="text-4xl font-light text-text-primary">{title}</h2>
            <div className="w-10 h-px bg-primary mx-auto mt-5" />
          </div>
        )}

        {description && (
          <p className="text-lg text-text-secondary mb-8 leading-relaxed">{description}</p>
        )}

        {suggestions.length > 0 && (
          <ul className="space-y-3 mb-8 text-left max-w-sm mx-auto">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                <Star className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}

        {colorNote && (
          <div className="inline-flex items-center gap-2 px-5 py-3 bg-surface-subtle border border-border rounded-xl text-sm text-text-secondary mb-6">
            <Shirt className="w-4 h-4 text-primary flex-shrink-0" />
            {colorNote}
          </div>
        )}

        {additionalNote && (
          <p className="text-sm text-text-tertiary mt-4 italic">{additionalNote}</p>
        )}

        {!description && suggestions.length === 0 && !colorNote && (
          <div className="flex flex-col items-center gap-3 py-8 text-text-tertiary">
            <Shirt className="w-8 h-8" />
            <p className="text-sm">Set your dress code details in section settings</p>
          </div>
        )}
      </div>
    </section>
  );
};

export const DressCodeBanner: React.FC<Props> = ({ data: _data, instance }) => {
  const { settings } = instance;
  const presetKey = (settings.presetCode as string) || '';
  const preset = DRESS_CODE_PRESETS[presetKey];

  const title = (settings.dressCodeLabel as string) || preset?.label || 'Dress Code';
  const description = (settings.description as string) || preset?.description || 'Dress code details will appear here once added.';

  return (
    <section className="py-14 px-4 bg-surface-subtle border-y border-border">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Shirt className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium mb-1">Dress Code</p>
            <h2 className="text-2xl font-semibold text-text-primary mb-2">{title}</h2>
            <p className="text-text-secondary">{description}</p>
          </div>
          {settings.colorNote && (
            <div className="flex-shrink-0 px-5 py-3 bg-surface border border-border rounded-xl text-sm text-text-secondary">
              {settings.colorNote as string}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
