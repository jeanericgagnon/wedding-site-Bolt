import React from 'react';
import { X } from 'lucide-react';
import { SectionInstance } from '../../types/layoutConfig';
import { WeddingDataV1 } from '../../types/weddingData';
import { Button, Input } from '../ui';

interface SectionSettingsDrawerProps {
  section: SectionInstance;
  weddingData: WeddingDataV1;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<SectionInstance>) => void;
}

export const SectionSettingsDrawer: React.FC<SectionSettingsDrawerProps> = ({
  section,
  weddingData,
  isOpen,
  onClose,
  onUpdate,
}) => {
  if (!isOpen) return null;

  const handleSettingChange = (key: string, value: any) => {
    onUpdate({
      settings: {
        ...section.settings,
        [key]: value,
      },
    });
  };

  const handleBindingChange = (key: string, id: string, checked: boolean) => {
    const currentIds = section.bindings[key as keyof typeof section.bindings] || [];
    const newIds = checked
      ? [...currentIds, id]
      : currentIds.filter((existingId) => existingId !== id);

    onUpdate({
      bindings: {
        ...section.bindings,
        [key]: newIds,
      },
    });
  };

  const hasVenueBindings = ['venue', 'travel', 'schedule'].includes(section.type);
  const hasScheduleBindings = ['schedule'].includes(section.type);
  const hasLinkBindings = ['registry'].includes(section.type);
  const hasFaqBindings = ['faq'].includes(section.type);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-surface border-l border-border shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-border p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary capitalize">
              {section.type} Settings
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Customize section appearance and data
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Display Settings
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">Show Title</label>
                <input
                  type="checkbox"
                  checked={section.settings.showTitle !== false}
                  onChange={(e) => handleSettingChange('showTitle', e.target.checked)}
                  className="w-4 h-4"
                />
              </div>

              {section.settings.showTitle !== false && (
                <>
                  <Input
                    label="Title Override"
                    value={section.settings.title || ''}
                    onChange={(e) => handleSettingChange('title', e.target.value)}
                    placeholder={`Default: ${section.type}`}
                  />
                  <Input
                    label="Subtitle"
                    value={section.settings.subtitle || ''}
                    onChange={(e) => handleSettingChange('subtitle', e.target.value)}
                    placeholder="Optional subtitle"
                  />
                </>
              )}
            </div>
          </div>

          {hasVenueBindings && weddingData.venues.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Venue Bindings
              </h3>
              <p className="text-xs text-text-secondary mb-2">
                Select which venues to display in this section
              </p>
              <div className="space-y-2">
                {weddingData.venues.map((venue) => {
                  const isChecked = section.bindings.venueIds?.includes(venue.id);
                  return (
                    <label
                      key={venue.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-background cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleBindingChange('venueIds', venue.id, e.target.checked)
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">
                        {venue.name || venue.address || 'Unnamed Venue'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {hasScheduleBindings && weddingData.schedule.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Schedule Item Bindings
              </h3>
              <p className="text-xs text-text-secondary mb-2">
                Select which schedule items to display
              </p>
              <div className="space-y-2">
                {weddingData.schedule.map((item) => {
                  const isChecked = section.bindings.scheduleItemIds?.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-background cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleBindingChange('scheduleItemIds', item.id, e.target.checked)
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {hasLinkBindings && weddingData.registry.links.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Registry Link Bindings
              </h3>
              <p className="text-xs text-text-secondary mb-2">
                Select which registry links to display
              </p>
              <div className="space-y-2">
                {weddingData.registry.links.map((link) => {
                  const isChecked = section.bindings.linkIds?.includes(link.id);
                  return (
                    <label
                      key={link.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-background cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleBindingChange('linkIds', link.id, e.target.checked)
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">
                        {link.label || link.url}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {hasFaqBindings && weddingData.faq.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                FAQ Bindings
              </h3>
              <p className="text-xs text-text-secondary mb-2">
                Select which FAQs to display
              </p>
              <div className="space-y-2">
                {weddingData.faq.map((item) => {
                  const isChecked = section.bindings.faqIds?.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-background cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleBindingChange('faqIds', item.id, e.target.checked)
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">
                        {item.q}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {section.type === 'gallery' && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Gallery Settings
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-text-secondary">Show Captions</label>
                  <input
                    type="checkbox"
                    checked={section.settings.showCaptions !== false}
                    onChange={(e) => handleSettingChange('showCaptions', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
                <Input
                  label="Images Per Row"
                  type="number"
                  min="2"
                  max="4"
                  value={section.settings.imagesPerRow || 3}
                  onChange={(e) => handleSettingChange('imagesPerRow', parseInt(e.target.value))}
                />
              </div>
            </div>
          )}

          {section.type === 'rsvp' && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                RSVP Settings
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-text-secondary">Show Guest Count</label>
                  <input
                    type="checkbox"
                    checked={section.settings.showGuestCount !== false}
                    onChange={(e) => handleSettingChange('showGuestCount', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-text-secondary">Show Dietary Notes</label>
                  <input
                    type="checkbox"
                    checked={section.settings.showDietaryNotes !== false}
                    onChange={(e) => handleSettingChange('showDietaryNotes', e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-surface border-t border-border p-4">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </>
  );
};
