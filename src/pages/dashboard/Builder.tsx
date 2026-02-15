import React, { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardContent, Button, Badge } from '../../components/ui';
import { GripVertical, Eye, Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Section {
  id: string;
  type: string;
  title: string;
  variant: string;
  visible: boolean;
  category: 'content' | 'logistics' | 'engagement';
}

interface Toast {
  id: number;
  message: string;
}

const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-surface-raised border border-border shadow-lg rounded-lg p-4 min-w-[300px]"
        >
          <p className="text-sm text-ink">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};

export const DashboardBuilder: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([
    { id: '1', type: 'hero', title: 'Hero', variant: 'classic', visible: true, category: 'content' },
    { id: '2', type: 'story', title: 'Our Story', variant: 'centered', visible: true, category: 'content' },
    { id: '3', type: 'schedule', title: 'Schedule', variant: 'timeline', visible: true, category: 'logistics' },
    { id: '4', type: 'rsvp', title: 'RSVP', variant: 'form', visible: true, category: 'engagement' },
    { id: '5', type: 'travel', title: 'Travel & Accommodations', variant: 'cards', visible: true, category: 'logistics' },
    { id: '6', type: 'gallery', title: 'Gallery', variant: 'grid', visible: false, category: 'content' },
    { id: '7', type: 'faq', title: 'FAQ', variant: 'accordion', visible: true, category: 'content' },
    { id: '8', type: 'registry', title: 'Registry', variant: 'links', visible: true, category: 'engagement' },
  ]);

  const [selectedSection, setSelectedSection] = useState<Section | null>(sections[0]);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('desktop');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'content' | 'logistics' | 'engagement'>('all');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const onTodo = (message: string) => {
    console.log('TODO:', message);
    const newToast: Toast = {
      id: Date.now(),
      message: `TODO: ${message}`,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 2000);
  };

  const filteredSections = sectionFilter === 'all'
    ? sections
    : sections.filter(s => s.category === sectionFilter);

  const variants = {
    hero: ['Classic', 'Minimal', 'Split'],
    story: ['Centered', 'Side by Side', 'Timeline'],
    schedule: ['Timeline', 'Cards', 'Simple List'],
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      setSections(newSections);
    }
  };

  const toggleVisibility = (id: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  return (
    <DashboardLayout currentPage="builder">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Website Builder</h1>
          <p className="text-text-secondary">Customize your wedding site sections and layout</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card variant="bordered" padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Site Sections</h2>
                <Button variant="ghost" size="sm" onClick={() => onTodo('Add new section')}>
                  <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                  Add
                </Button>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-text-secondary mb-2">Filter sections</label>
                <select
                  className="w-full p-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={sectionFilter}
                  onChange={(e) => {
                    setSectionFilter(e.target.value as 'all' | 'content' | 'logistics' | 'engagement');
                    onTodo(`Filter builder sections: ${e.target.value}`);
                  }}
                >
                  <option value="all">All sections</option>
                  <option value="content">Content</option>
                  <option value="logistics">Logistics</option>
                  <option value="engagement">Engagement</option>
                </select>
              </div>

              <div className="space-y-2">
                {filteredSections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedSection?.id === section.id
                        ? 'bg-primary-light border-primary'
                        : 'bg-surface border-border-subtle hover:border-border'
                      }
                    `}
                    onClick={() => setSelectedSection(section)}
                  >
                    <button
                      className="cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-secondary"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{section.title}</p>
                      <p className="text-xs text-text-secondary capitalize">{section.variant}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(section.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          section.visible ? 'text-primary' : 'text-text-tertiary'
                        }`}
                        aria-label={section.visible ? 'Hide section' : 'Show section'}
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      </button>

                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(index, 'up');
                          }}
                          disabled={index === 0}
                          className="p-0.5 rounded hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(index, 'down');
                          }}
                          disabled={index === sections.length - 1}
                          className="p-0.5 rounded hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {selectedSection && (
              <Card variant="bordered" padding="md">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Section Settings</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Section Variant
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {(variants[selectedSection.type as keyof typeof variants] || ['Default']).map((variant) => (
                        <button
                          key={variant}
                          className={`
                            px-4 py-3 rounded-lg border text-sm text-left transition-colors
                            ${selectedSection.variant === variant.toLowerCase()
                              ? 'bg-primary-light border-primary text-primary font-medium'
                              : 'bg-surface border-border-subtle hover:border-border text-text-secondary'
                            }
                          `}
                        >
                          {variant}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-subtle">
                    <Button variant="primary" size="md" fullWidth onClick={() => onTodo(`Edit ${selectedSection.title} content`)}>
                      <Edit className="w-4 h-4 mr-2" aria-hidden="true" />
                      Edit Content
                    </Button>
                  </div>

                  <Button variant="ghost" size="md" fullWidth className="text-error hover:bg-error-light" onClick={() => onTodo(`Remove ${selectedSection.title} section`)}>
                    <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                    Remove Section
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Card variant="bordered" padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Live Preview</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      previewMode === 'mobile'
                        ? 'bg-primary text-text-inverse'
                        : 'text-text-secondary hover:bg-surface-subtle'
                    }`}
                  >
                    Mobile
                  </button>
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      previewMode === 'desktop'
                        ? 'bg-primary text-text-inverse'
                        : 'text-text-secondary hover:bg-surface-subtle'
                    }`}
                  >
                    Desktop
                  </button>
                </div>
              </div>

              <div className="bg-background rounded-lg p-8 min-h-[600px] flex items-center justify-center">
                <div
                  className={`bg-surface rounded-lg shadow-lg overflow-hidden transition-all ${
                    previewMode === 'mobile' ? 'w-[375px]' : 'w-full'
                  }`}
                >
                  <div className="bg-gradient-to-br from-primary-light to-accent-light p-12 text-center">
                    <h1 className="text-4xl font-bold text-text-primary mb-4">Alex & Jordan</h1>
                    <p className="text-lg text-text-secondary">June 15, 2026 • San Francisco, CA</p>
                  </div>

                  {selectedSection && (
                    <div className="p-8 border-t-4 border-primary">
                      <Badge variant="primary" className="mb-4">Currently Editing</Badge>
                      <h2 className="text-2xl font-bold text-text-primary mb-4">{selectedSection.title}</h2>
                      <p className="text-text-secondary mb-4">
                        This is a preview of your <span className="font-medium">{selectedSection.variant}</span> variant.
                        Edit the content to see changes reflected here.
                      </p>
                      <div className="bg-surface-subtle rounded-lg p-6 text-center text-text-tertiary">
                        Section preview content
                      </div>
                    </div>
                  )}

                  <div className="p-6 bg-surface-subtle text-center">
                    <p className="text-sm text-text-secondary">Additional sections appear below</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" size="md" onClick={() => onTodo('Save draft')}>
                  Save Draft
                </Button>
                <Button variant="accent" size="md" onClick={() => onTodo('Publish changes')}>
                  Publish Changes
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </DashboardLayout>
  );
};
