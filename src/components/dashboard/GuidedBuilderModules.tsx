import React, { useState } from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { LayoutConfigV1, SectionType } from '../../types/layoutConfig';
import { Button, Input, Textarea, Card } from '../ui';
import { Check, ChevronRight, Save, SkipForward, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { AddressInput } from '../ui/AddressInput';

type ModuleId = 'hero' | 'story' | 'venue' | 'schedule' | 'travel' | 'registry' | 'faq' | 'rsvp' | 'gallery';

interface ModuleConfig {
  id: ModuleId;
  title: string;
  description: string;
  sectionType: SectionType;
}

const modules: ModuleConfig[] = [
  {
    id: 'hero',
    title: 'Hero',
    description: 'Main banner and wedding date',
    sectionType: 'hero',
  },
  {
    id: 'story',
    title: 'Your Story',
    description: 'Share your love story',
    sectionType: 'story',
  },
  {
    id: 'venue',
    title: 'Venues',
    description: 'Ceremony and reception locations',
    sectionType: 'venue',
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'Timeline of events',
    sectionType: 'schedule',
  },
  {
    id: 'travel',
    title: 'Travel',
    description: 'Directions and accommodations',
    sectionType: 'travel',
  },
  {
    id: 'registry',
    title: 'Registry',
    description: 'Gift registry links',
    sectionType: 'registry',
  },
  {
    id: 'faq',
    title: 'FAQ',
    description: 'Common questions',
    sectionType: 'faq',
  },
  {
    id: 'rsvp',
    title: 'RSVP',
    description: 'Guest response form',
    sectionType: 'rsvp',
  },
  {
    id: 'gallery',
    title: 'Photos',
    description: 'Photo gallery',
    sectionType: 'gallery',
  },
];

interface GuidedBuilderModulesProps {
  weddingData: WeddingDataV1;
  layoutConfig: LayoutConfigV1;
  onChange: (data: WeddingDataV1) => void;
  onLayoutChange: (config: LayoutConfigV1) => void;
  onSave: () => void;
  saving: boolean;
}

export const GuidedBuilderModules: React.FC<GuidedBuilderModulesProps> = ({
  weddingData,
  layoutConfig,
  onChange,
  onLayoutChange,
  onSave,
  saving,
}) => {
  const [activeModule, setActiveModule] = useState<ModuleId>('hero');

  const isSectionEnabled = (sectionType: SectionType): boolean => {
    return layoutConfig.pages[0].sections.some(
      (s) => s.type === sectionType && s.enabled
    );
  };

  const toggleSection = (sectionType: SectionType) => {
    const updatedSections = layoutConfig.pages[0].sections.map((s) =>
      s.type === sectionType ? { ...s, enabled: !s.enabled } : s
    );

    onLayoutChange({
      ...layoutConfig,
      pages: [
        {
          ...layoutConfig.pages[0],
          sections: updatedSections,
        },
      ],
    });
  };

  const getModuleStatus = (moduleId: ModuleId): 'complete' | 'incomplete' => {
    switch (moduleId) {
      case 'hero':
        return weddingData.couple.partner1Name && weddingData.couple.partner2Name && weddingData.event.weddingDateISO
          ? 'complete'
          : 'incomplete';
      case 'story':
        return weddingData.couple.story ? 'complete' : 'incomplete';
      case 'venue':
        return weddingData.venues.length > 0 ? 'complete' : 'incomplete';
      case 'schedule':
        return weddingData.schedule.length > 0 ? 'complete' : 'incomplete';
      case 'travel':
        return weddingData.venues.length > 0 ? 'complete' : 'incomplete';
      case 'registry':
        return weddingData.registry.links.length > 0 ? 'complete' : 'incomplete';
      case 'faq':
        return weddingData.faq.length > 0 ? 'complete' : 'incomplete';
      case 'rsvp':
        return weddingData.rsvp.enabled ? 'complete' : 'incomplete';
      case 'gallery':
        return weddingData.media.heroImageUrl || weddingData.media.gallery.length > 0
          ? 'complete'
          : 'incomplete';
      default:
        return 'incomplete';
    }
  };

  const handleNext = () => {
    const currentIndex = modules.findIndex((m) => m.id === activeModule);
    if (currentIndex < modules.length - 1) {
      setActiveModule(modules[currentIndex + 1].id);
    }
  };

  const addVenue = () => {
    const newVenue = {
      id: `venue-${Date.now()}`,
      name: '',
      address: '',
    };
    onChange({
      ...weddingData,
      venues: [...weddingData.venues, newVenue],
    });
  };

  const updateVenue = (id: string, updates: any) => {
    onChange({
      ...weddingData,
      venues: weddingData.venues.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    });
  };

  const removeVenue = (id: string) => {
    onChange({
      ...weddingData,
      venues: weddingData.venues.filter((v) => v.id !== id),
    });
  };

  const addScheduleItem = () => {
    const newItem = {
      id: `schedule-${Date.now()}`,
      label: '',
      startTimeISO: '',
    };
    onChange({
      ...weddingData,
      schedule: [...weddingData.schedule, newItem],
    });
  };

  const updateScheduleItem = (id: string, updates: any) => {
    onChange({
      ...weddingData,
      schedule: weddingData.schedule.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    });
  };

  const removeScheduleItem = (id: string) => {
    onChange({
      ...weddingData,
      schedule: weddingData.schedule.filter((s) => s.id !== id),
    });
  };

  const addRegistryLink = () => {
    const newLink = {
      id: `link-${Date.now()}`,
      label: '',
      url: '',
    };
    onChange({
      ...weddingData,
      registry: {
        ...weddingData.registry,
        links: [...weddingData.registry.links, newLink],
      },
    });
  };

  const updateRegistryLink = (id: string, updates: any) => {
    onChange({
      ...weddingData,
      registry: {
        ...weddingData.registry,
        links: weddingData.registry.links.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      },
    });
  };

  const removeRegistryLink = (id: string) => {
    onChange({
      ...weddingData,
      registry: {
        ...weddingData.registry,
        links: weddingData.registry.links.filter((l) => l.id !== id),
      },
    });
  };

  const addFaq = () => {
    const newFaq = {
      id: `faq-${Date.now()}`,
      q: '',
      a: '',
    };
    onChange({
      ...weddingData,
      faq: [...weddingData.faq, newFaq],
    });
  };

  const updateFaq = (id: string, updates: any) => {
    onChange({
      ...weddingData,
      faq: weddingData.faq.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    });
  };

  const removeFaq = (id: string) => {
    onChange({
      ...weddingData,
      faq: weddingData.faq.filter((f) => f.id !== id),
    });
  };

  const addGalleryImage = () => {
    const newImage = {
      id: `img-${Date.now()}`,
      url: '',
      caption: '',
    };
    onChange({
      ...weddingData,
      media: {
        ...weddingData.media,
        gallery: [...weddingData.media.gallery, newImage],
      },
    });
  };

  const updateGalleryImage = (id: string, updates: any) => {
    onChange({
      ...weddingData,
      media: {
        ...weddingData.media,
        gallery: weddingData.media.gallery.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      },
    });
  };

  const removeGalleryImage = (id: string) => {
    onChange({
      ...weddingData,
      media: {
        ...weddingData.media,
        gallery: weddingData.media.gallery.filter((g) => g.id !== id),
      },
    });
  };

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-text-secondary mb-3 px-2">MODULES</h3>
        {modules.map((module) => {
          const status = getModuleStatus(module.id);
          const isActive = activeModule === module.id;
          const isEnabled = isSectionEnabled(module.sectionType);

          return (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-surface hover:bg-background border border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSection(module.sectionType);
                  }}
                  className={`flex-shrink-0 ${isActive ? 'text-white' : ''}`}
                >
                  {isEnabled ? (
                    <Eye className={`w-5 h-5 ${isActive ? 'text-white' : 'text-primary'}`} />
                  ) : (
                    <EyeOff className={`w-5 h-5 ${isActive ? 'text-white/60' : 'text-text-secondary'}`} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${isActive ? 'text-white' : 'text-text-primary'}`}>
                      {module.title}
                    </h4>
                    {status === 'complete' && (
                      <Check className={`w-4 h-4 ${isActive ? 'text-white' : 'text-primary'}`} />
                    )}
                  </div>
                  <p
                    className={`text-xs mt-0.5 truncate ${
                      isActive ? 'text-white/80' : 'text-text-secondary'
                    }`}
                  >
                    {module.description}
                  </p>
                </div>
                {isActive && <ChevronRight className="w-5 h-5 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <Card>
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text-primary">
                {modules.find((m) => m.id === activeModule)?.title}
              </h2>
              <p className="text-text-secondary mt-1">
                {modules.find((m) => m.id === activeModule)?.description}
              </p>
            </div>

            <div className="space-y-4">
              {activeModule === 'hero' && (
                <>
                  <Input
                    label="Partner 1 Name"
                    value={weddingData.couple.partner1Name}
                    onChange={(e) =>
                      onChange({
                        ...weddingData,
                        couple: { ...weddingData.couple, partner1Name: e.target.value },
                      })
                    }
                    placeholder="First partner's name"
                  />
                  <Input
                    label="Partner 2 Name"
                    value={weddingData.couple.partner2Name}
                    onChange={(e) =>
                      onChange({
                        ...weddingData,
                        couple: { ...weddingData.couple, partner2Name: e.target.value },
                      })
                    }
                    placeholder="Second partner's name"
                  />
                  <Input
                    label="Display Name (Optional)"
                    value={weddingData.couple.displayName || ''}
                    onChange={(e) =>
                      onChange({
                        ...weddingData,
                        couple: { ...weddingData.couple, displayName: e.target.value },
                      })
                    }
                    placeholder="e.g., Emma & James"
                  />
                  <Input
                    label="Last Name Display (Optional)"
                    value={weddingData.couple.lastNameDisplay || ''}
                    onChange={(e) =>
                      onChange({
                        ...weddingData,
                        couple: { ...weddingData.couple, lastNameDisplay: e.target.value },
                      })
                    }
                    placeholder="e.g., Smith-Johnson or Smith & Johnson"
                  />
                  <Input
                    type="date"
                    label="Wedding Date"
                    value={weddingData.event.weddingDateISO || ''}
                    onChange={(e) =>
                      onChange({
                        ...weddingData,
                        event: { ...weddingData.event, weddingDateISO: e.target.value },
                      })
                    }
                  />
                </>
              )}

              {activeModule === 'story' && (
                <Textarea
                  label="Your Love Story"
                  value={weddingData.couple.story || ''}
                  onChange={(e) =>
                    onChange({
                      ...weddingData,
                      couple: { ...weddingData.couple, story: e.target.value },
                    })
                  }
                  rows={8}
                  placeholder="Tell your guests how you met, your journey together, and what makes your love special..."
                />
              )}

              {activeModule === 'venue' && (
                <div className="space-y-4">
                  {weddingData.venues.map((venue) => (
                    <div key={venue.id} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-text-primary">Venue</h4>
                        <button
                          onClick={() => removeVenue(venue.id)}
                          className="text-error hover:text-error-dark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <Input
                          label="Name"
                          value={venue.name || ''}
                          onChange={(e) => updateVenue(venue.id, { name: e.target.value })}
                          placeholder="e.g., Central Park"
                        />
                        <AddressInput
                          label="Address"
                          value={venue.address || ''}
                          onChange={(address, placeId, lat, lng) =>
                            updateVenue(venue.id, { address, placeId, lat, lng })
                          }
                          placeholder="Search for venue address"
                        />
                        <Textarea
                          label="Notes (Optional)"
                          value={venue.notes || ''}
                          onChange={(e) => updateVenue(venue.id, { notes: e.target.value })}
                          rows={2}
                          placeholder="Additional details about this venue"
                        />
                      </div>
                    </div>
                  ))}
                  <Button onClick={addVenue} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Venue
                  </Button>
                </div>
              )}

              {activeModule === 'schedule' && (
                <div className="space-y-4">
                  {weddingData.schedule.map((item) => (
                    <div key={item.id} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-text-primary">Event</h4>
                        <button
                          onClick={() => removeScheduleItem(item.id)}
                          className="text-error hover:text-error-dark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <Input
                          label="Event Name"
                          value={item.label}
                          onChange={(e) => updateScheduleItem(item.id, { label: e.target.value })}
                          placeholder="e.g., Ceremony, Cocktail Hour, Reception"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            type="datetime-local"
                            label="Start Time"
                            value={item.startTimeISO || ''}
                            onChange={(e) =>
                              updateScheduleItem(item.id, { startTimeISO: e.target.value })
                            }
                          />
                          <Input
                            type="datetime-local"
                            label="End Time (Optional)"
                            value={item.endTimeISO || ''}
                            onChange={(e) =>
                              updateScheduleItem(item.id, { endTimeISO: e.target.value })
                            }
                          />
                        </div>
                        <Textarea
                          label="Notes (Optional)"
                          value={item.notes || ''}
                          onChange={(e) => updateScheduleItem(item.id, { notes: e.target.value })}
                          rows={2}
                          placeholder="Additional details"
                        />
                      </div>
                    </div>
                  ))}
                  <Button onClick={addScheduleItem} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Schedule Item
                  </Button>
                </div>
              )}

              {activeModule === 'registry' && (
                <div className="space-y-4">
                  {weddingData.registry.links.map((link) => (
                    <div key={link.id} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-text-primary">Registry Link</h4>
                        <button
                          onClick={() => removeRegistryLink(link.id)}
                          className="text-error hover:text-error-dark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <Input
                          label="Store Name"
                          value={link.label || ''}
                          onChange={(e) => updateRegistryLink(link.id, { label: e.target.value })}
                          placeholder="e.g., Amazon, Target, Zola"
                        />
                        <Input
                          label="Registry URL"
                          value={link.url}
                          onChange={(e) => updateRegistryLink(link.id, { url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  ))}
                  <Button onClick={addRegistryLink} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Registry Link
                  </Button>
                </div>
              )}

              {activeModule === 'faq' && (
                <div className="space-y-4">
                  {weddingData.faq.map((item) => (
                    <div key={item.id} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-text-primary">FAQ Item</h4>
                        <button
                          onClick={() => removeFaq(item.id)}
                          className="text-error hover:text-error-dark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <Input
                          label="Question"
                          value={item.q}
                          onChange={(e) => updateFaq(item.id, { q: e.target.value })}
                          placeholder="e.g., What is the dress code?"
                        />
                        <Textarea
                          label="Answer"
                          value={item.a}
                          onChange={(e) => updateFaq(item.id, { a: e.target.value })}
                          rows={3}
                          placeholder="Your answer here..."
                        />
                      </div>
                    </div>
                  ))}
                  <Button onClick={addFaq} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add FAQ
                  </Button>
                </div>
              )}

              {activeModule === 'travel' && (
                <div className="space-y-4">
                  <p className="text-sm text-text-secondary">
                    Travel information is derived from your venue data. Add venues above to populate this section.
                  </p>
                  {weddingData.venues.length === 0 && (
                    <div className="p-4 bg-surface rounded-lg border border-border text-center">
                      <p className="text-text-secondary">No venues added yet. Add a venue to enable travel information.</p>
                    </div>
                  )}
                  {weddingData.venues.length > 0 && (
                    <div className="space-y-3">
                      {weddingData.venues.map((venue) => (
                        <div key={venue.id} className="p-4 bg-background rounded-lg border border-border">
                          <h4 className="font-medium text-text-primary mb-2">{venue.name || 'Unnamed Venue'}</h4>
                          <p className="text-sm text-text-secondary">{venue.address}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeModule === 'rsvp' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                    <div>
                      <h4 className="font-medium text-text-primary">Enable RSVP</h4>
                      <p className="text-sm text-text-secondary">Allow guests to respond to your invitation</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={weddingData.rsvp.enabled}
                      onChange={(e) =>
                        onChange({
                          ...weddingData,
                          rsvp: { ...weddingData.rsvp, enabled: e.target.checked },
                        })
                      }
                      className="w-5 h-5"
                    />
                  </div>
                  {weddingData.rsvp.enabled && (
                    <Input
                      type="date"
                      label="RSVP Deadline (Optional)"
                      value={weddingData.rsvp.deadlineISO || ''}
                      onChange={(e) =>
                        onChange({
                          ...weddingData,
                          rsvp: { ...weddingData.rsvp, deadlineISO: e.target.value },
                        })
                      }
                    />
                  )}
                </div>
              )}

              {activeModule === 'gallery' && (
                <div className="space-y-4">
                  <Input
                    label="Hero Image URL"
                    value={weddingData.media.heroImageUrl || ''}
                    onChange={(e) =>
                      onChange({
                        ...weddingData,
                        media: { ...weddingData.media, heroImageUrl: e.target.value },
                      })
                    }
                    placeholder="https://..."
                  />
                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Gallery Images</h4>
                    {weddingData.media.gallery.map((img) => (
                      <div
                        key={img.id}
                        className="p-4 bg-background rounded-lg border border-border mb-3"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="font-medium text-text-primary">Image</h5>
                          <button
                            onClick={() => removeGalleryImage(img.id)}
                            className="text-error hover:text-error-dark"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <Input
                            label="Image URL"
                            value={img.url}
                            onChange={(e) => updateGalleryImage(img.id, { url: e.target.value })}
                            placeholder="https://..."
                          />
                          <Input
                            label="Caption (Optional)"
                            value={img.caption || ''}
                            onChange={(e) =>
                              updateGalleryImage(img.id, { caption: e.target.value })
                            }
                            placeholder="Add a caption"
                          />
                        </div>
                      </div>
                    ))}
                    <Button onClick={addGalleryImage} variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Gallery Image
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
              <Button onClick={handleNext} variant="outline">
                <SkipForward className="w-4 h-4 mr-2" />
                Skip for Now
              </Button>
              <Button onClick={onSave} variant="accent" disabled={saving} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Module'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
