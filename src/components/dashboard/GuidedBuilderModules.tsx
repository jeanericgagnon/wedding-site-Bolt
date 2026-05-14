import React, { useState } from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { LayoutConfigV1, SectionType } from '../../types/layoutConfig';
import { Button, Input, Textarea, Card } from '../ui';
import { Check, ChevronRight, Save, SkipForward, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { AddressInput } from '../ui/AddressInput';
import { buildTravelGuestPortalReadiness } from '../../lib/travelGuestPortal';

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
    title: 'Welcome section',
    description: 'Names, date, and the first impression guests see',
    sectionType: 'hero',
  },
  {
    id: 'story',
    title: 'Your Story',
    description: 'Share a little more about the two of you',
    sectionType: 'story',
  },
  {
    id: 'venue',
    title: 'Venue details',
    description: 'Ceremony, reception, and where guests need to go',
    sectionType: 'venue',
  },
  {
    id: 'schedule',
    title: 'Schedule',
    description: 'What happens when, and in what order',
    sectionType: 'schedule',
  },
  {
    id: 'travel',
    title: 'Travel',
    description: 'Travel help, hotel notes, and useful guest info',
    sectionType: 'travel',
  },
  {
    id: 'registry',
    title: 'Registry',
    description: 'Registry links, funds, and gift details',
    sectionType: 'registry',
  },
  {
    id: 'faq',
    title: 'FAQ',
    description: 'Helpful answers for guests before they ask',
    sectionType: 'faq',
  },
  {
    id: 'rsvp',
    title: 'RSVP',
    description: 'How guests reply and what they need to know',
    sectionType: 'rsvp',
  },
  {
    id: 'gallery',
    title: 'Photos',
    description: 'Hero photo and gallery moments',
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
  const travelPortalReadiness = buildTravelGuestPortalReadiness({
    flightInfo: weddingData.travel?.flightInfo,
    hotelInfo: weddingData.travel?.hotelInfo,
    parkingInfo: weddingData.travel?.parkingInfo,
    notes: weddingData.travel?.notes,
    hotelCount: Array.isArray(weddingData.travel?.hotels) ? weddingData.travel.hotels.length : 0,
    roomBlockCount: Array.isArray(weddingData.travel?.roomBlocks) ? weddingData.travel.roomBlocks.length : 0,
    shuttleCount: Array.isArray(weddingData.travel?.shuttles) ? weddingData.travel.shuttles.length : 0,
    visaTipCount: Array.isArray(weddingData.travel?.visaTips) ? weddingData.travel.visaTips.length : 0,
    culturalTipCount: Array.isArray(weddingData.travel?.culturalTips) ? weddingData.travel.culturalTips.length : 0,
    venueCount: weddingData.venues.length,
    venueAddressCount: weddingData.venues.filter((venue) => Boolean(venue.address?.trim())).length,
    scheduleCount: weddingData.schedule.length,
    eventInviteScoped: Boolean(weddingData.rsvp?.enabled),
  });
  const normalizeModuleSectionType = (type: string) => type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const isSectionEnabled = (sectionType: SectionType): boolean => {
    return layoutConfig.pages[0].sections.some(
      (s) => normalizeModuleSectionType(s.type) === normalizeModuleSectionType(sectionType) && s.enabled
    );
  };

  const toggleSection = (sectionType: SectionType) => {
    const updatedSections = layoutConfig.pages[0].sections.map((s) =>
      normalizeModuleSectionType(s.type) === normalizeModuleSectionType(sectionType) ? { ...s, enabled: !s.enabled } : s
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
    switch (normalizeModuleSectionType(moduleId)) {
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
        return weddingData.venues.length > 0 || !!(weddingData.travel?.notes || weddingData.travel?.flightInfo || weddingData.travel?.hotelInfo) ? 'complete' : 'incomplete';
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

  const updateVenue = (id: string, updates: Partial<WeddingDataV1['venues'][number]>) => {
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

  const updateScheduleItem = (id: string, updates: Partial<WeddingDataV1['schedule'][number]>) => {
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

  const updateRegistryLink = (id: string, updates: Partial<WeddingDataV1['registry']['links'][number]>) => {
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

  const updateFaq = (id: string, updates: Partial<WeddingDataV1['faq'][number]>) => {
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

  const updateGalleryImage = (id: string, updates: Partial<WeddingDataV1['media']['gallery'][number]>) => {
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
        <h3 className="text-sm font-semibold text-text-secondary mb-3 px-2">Site sections</h3>
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
                    placeholder="First partner’s name"
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
                    placeholder="Second partner’s name"
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
                    label="Wedding date"
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
                  label="Your story"
                  value={weddingData.couple.story || ''}
                  onChange={(e) =>
                    onChange({
                      ...weddingData,
                      couple: { ...weddingData.couple, story: e.target.value },
                    })
                  }
                  rows={8}
                  placeholder="Share how you met, what matters to you, or anything guests would love to know..."
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
                          placeholder="For example: Central Park"
                        />
                        <AddressInput
                          label="Address"
                          value={venue.address || ''}
                          onChange={(address, coordinates) =>
                            updateVenue(venue.id, { address, lat: coordinates?.lat, lng: coordinates?.lng })
                          }
                          placeholder="Search for venue address"
                        />
                        <Textarea
                          label="Notes (Optional)"
                          value={venue.notes || ''}
                          onChange={(e) => updateVenue(venue.id, { notes: e.target.value })}
                          rows={2}
                          placeholder="Anything guests should know about this location"
                        />
                      </div>
                    </div>
                  ))}
                  <Button onClick={addVenue} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add venue
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
                          label="Event name"
                          value={item.label}
                          onChange={(e) => updateScheduleItem(item.id, { label: e.target.value })}
                          placeholder="For example: Ceremony, Cocktail Hour, Reception"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            type="datetime-local"
                            label="Start time"
                            value={item.startTimeISO || ''}
                            onChange={(e) =>
                              updateScheduleItem(item.id, { startTimeISO: e.target.value })
                            }
                          />
                          <Input
                            type="datetime-local"
                            label="End time (optional)"
                            value={item.endTimeISO || ''}
                            onChange={(e) =>
                              updateScheduleItem(item.id, { endTimeISO: e.target.value })
                            }
                          />
                        </div>
                        <Textarea
                          label="Notes (optional)"
                          value={item.notes || ''}
                          onChange={(e) => updateScheduleItem(item.id, { notes: e.target.value })}
                          rows={2}
                          placeholder="Anything guests should know"
                        />
                      </div>
                    </div>
                  ))}
                  <Button onClick={addScheduleItem} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add schedule item
                  </Button>
                </div>
              )}

              {activeModule === 'registry' && (
                <div className="space-y-4">
                  {weddingData.registry.links.map((link) => (
                    <div key={link.id} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-text-primary">Registry link</h4>
                        <button
                          onClick={() => removeRegistryLink(link.id)}
                          className="text-error hover:text-error-dark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <Input
                          label="Store name"
                          value={link.label || ''}
                          onChange={(e) => updateRegistryLink(link.id, { label: e.target.value })}
                          placeholder="For example: Amazon, Target, Zola"
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
                    Add registry link
                  </Button>
                </div>
              )}

              {activeModule === 'faq' && (
                <div className="space-y-4">
                  {weddingData.faq.map((item) => (
                    <div key={item.id} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-text-primary">Guest question</h4>
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
                          placeholder="For example: What is the dress code?"
                        />
                        <Textarea
                          label="Answer"
                          value={item.a}
                          onChange={(e) => updateFaq(item.id, { a: e.target.value })}
                          rows={3}
                          placeholder="Add the answer guests should see"
                        />
                      </div>
                    </div>
                  ))}
                  <Button onClick={addFaq} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add guest question
                  </Button>
                </div>
              )}

              {activeModule === 'travel' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="font-medium text-text-primary">Guest travel portal readiness</h4>
                        <p className="mt-1 text-sm text-text-secondary">Keep arrival, lodging, transport, venue, and schedule guidance together before guests rely on it from the hub.</p>
                      </div>
                      <span className="inline-flex w-fit rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1 text-xs font-medium text-text-primary">
                        {travelPortalReadiness.readyCount} of {travelPortalReadiness.steps.length} ready
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-text-tertiary">{travelPortalReadiness.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {travelPortalReadiness.coverageBadges.map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex rounded-lg border border-border-subtle bg-surface-subtle px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {travelPortalReadiness.steps.map((step) => (
                        <div key={step.id} className="rounded-lg border border-border-subtle bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-text-primary">{step.label}</p>
                            <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                              step.status === 'ready'
                                ? 'bg-success/10 text-success'
                                : step.status === 'needs-info'
                                  ? 'bg-warning/10 text-warning'
                                  : step.status === 'planned'
                                    ? 'bg-surface-subtle text-text-tertiary'
                                    : 'bg-white text-text-tertiary'
                            }`}>
                              {step.status === 'ready' ? 'Ready' : step.status === 'needs-info' ? 'Needs info' : step.status === 'planned' ? 'Planned' : 'Empty'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-sm text-text-secondary">
                    Venue addresses already appear automatically. Add extra travel details here if guests need more help.
                  </p>
                  {weddingData.venues.length > 0 && (
                    <div className="space-y-2">
                      {weddingData.venues.map((venue) => (
                        <div key={venue.id} className="p-3 bg-background rounded-lg border border-border flex items-center gap-2">
                          <span className="font-medium text-text-primary text-sm">{venue.name || 'Unnamed Venue'}</span>
                          {venue.address && <span className="text-xs text-text-secondary truncate">{venue.address}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <Textarea
                    label="General travel notes"
                    value={weddingData.travel?.notes || ''}
                    onChange={(e) =>
                      onChange({
                        ...weddingData,
                        travel: { ...weddingData.travel, notes: e.target.value },
                      })
                    }
                    rows={3}
                    placeholder="General travel tips or planning notes for guests..."
                  />
                  <Textarea
                    label="Getting here (flights / transport)"
                    value={weddingData.travel?.flightInfo || ''}
                    onChange={(e) =>
                      onChange({
                        ...weddingData,
                        travel: { ...weddingData.travel, flightInfo: e.target.value },
                      })
                    }
                    rows={3}
                    placeholder="Nearest airports, train stations, or transport options..."
                  />
                  <Textarea
                    label="Hotel recommendations"
                    value={weddingData.travel?.hotelInfo || ''}
                    onChange={(e) =>
                      onChange({
                        ...weddingData,
                        travel: { ...weddingData.travel, hotelInfo: e.target.value },
                      })
                    }
                    rows={3}
                    placeholder="Recommended hotels, room blocks, or stay suggestions..."
                  />
                  <Textarea
                    label="Parking information"
                    value={weddingData.travel?.parkingInfo || ''}
                    onChange={(e) =>
                      onChange({
                        ...weddingData,
                        travel: { ...weddingData.travel, parkingInfo: e.target.value },
                      })
                    }
                    rows={2}
                    placeholder="Parking instructions, lot locations, or valet details..."
                  />
                </div>
              )}

              {activeModule === 'rsvp' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                    <div>
                      <h4 className="font-medium text-text-primary">Enable RSVP</h4>
                      <p className="text-sm text-text-secondary">Let guests reply through your website</p>
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
                      label="RSVP deadline (optional)"
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
                    label="Hero image URL"
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
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Gallery images</h4>
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
                            label="Caption (optional)"
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
                      Add gallery image
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
              <Button onClick={handleNext} variant="outline">
                <SkipForward className="w-4 h-4 mr-2" />
                Skip for now
              </Button>
              <Button onClick={onSave} variant="accent" disabled={saving} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save section'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
