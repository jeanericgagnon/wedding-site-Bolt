import React from 'react';
import { X, ChevronDown, ImageIcon } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { selectSelectedSection, selectActivePage } from '../state/builderSelectors';
import { getSectionManifest } from '../registry/sectionManifests';
import { BuilderSettingsField } from '../../types/builder/section';

export const BuilderInspectorPanel: React.FC = () => {
  const { state, dispatch } = useBuilderContext();
  const selectedSection = selectSelectedSection(state);
  const activePage = selectActivePage(state);

  if (!selectedSection || !activePage) {
    return (
      <aside className="w-72 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-gray-400 text-lg">✦</span>
            </div>
            <p className="text-sm font-medium text-gray-500">Select a section</p>
            <p className="text-xs text-gray-400 mt-1">Click any section on the canvas to inspect and edit it</p>
          </div>
        </div>
      </aside>
    );
  }

  const manifest = getSectionManifest(selectedSection.type);

  const handleUpdateSetting = (key: string, value: string | boolean | number) => {
    dispatch(
      builderActions.updateSection(activePage.id, selectedSection.id, {
        settings: { ...selectedSection.settings, [key]: value },
      })
    );
  };

  const handleChangeVariant = (variant: string) => {
    dispatch(
      builderActions.updateSection(activePage.id, selectedSection.id, { variant })
    );
  };

  return (
    <aside className="w-72 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{manifest.label}</h3>
          <p className="text-xs text-gray-400">{selectedSection.type} section</p>
        </div>
        <button
          onClick={() => dispatch(builderActions.selectSection(null))}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <InspectorSection title="Variant">
          <div className="relative">
            <select
              value={selectedSection.variant}
              onChange={e => handleChangeVariant(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 pr-8 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              {manifest.supportedVariants.map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </InspectorSection>

        <InspectorSection title="Settings">
          {manifest.settingsSchema.fields.map(field => (
            <InspectorField
              key={field.key}
              field={field}
              value={selectedSection.settings[field.key] ?? field.defaultValue}
              onChange={val => handleUpdateSetting(field.key, val)}
              sectionId={selectedSection.id}
            />
          ))}
        </InspectorSection>

        {manifest.capabilities.hasBindings && manifest.bindingsSchema.slots.length > 0 && (
          <InspectorSection title="Data Bindings">
            {manifest.bindingsSchema.slots.map(slot => (
              <div key={slot.key} className="mb-3">
                <label className="text-xs font-medium text-gray-500 block mb-1">{slot.label}</label>
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  Auto-bound from {slot.dataSource} data
                </div>
              </div>
            ))}
          </InspectorSection>
        )}

        <InspectorSection title="Style Overrides">
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-500 block mb-1">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedSection.styleOverrides?.backgroundColor ?? '#ffffff'}
                onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                  styleOverrides: { ...selectedSection.styleOverrides, backgroundColor: e.target.value },
                }))}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={selectedSection.styleOverrides?.backgroundColor ?? ''}
                onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                  styleOverrides: { ...selectedSection.styleOverrides, backgroundColor: e.target.value },
                }))}
                placeholder="e.g. #f9fafb"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-500 block mb-1">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedSection.styleOverrides?.textColor ?? '#111827'}
                onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                  styleOverrides: { ...selectedSection.styleOverrides, textColor: e.target.value },
                }))}
                className="w-8 h-8 rounded cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={selectedSection.styleOverrides?.textColor ?? ''}
                onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                  styleOverrides: { ...selectedSection.styleOverrides, textColor: e.target.value },
                }))}
                placeholder="e.g. #111827"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>
        </InspectorSection>
      </div>
    </aside>
  );
};

const InspectorSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border-b border-gray-100 px-4 py-3">
    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h4>
    {children}
  </div>
);

interface InspectorFieldProps {
  field: BuilderSettingsField;
  value: string | boolean | number | undefined;
  onChange: (val: string | boolean | number) => void;
  sectionId?: string;
}

const InspectorField: React.FC<InspectorFieldProps> = ({ field, value, onChange, sectionId }) => {
  const { dispatch } = useBuilderContext();
  switch (field.type) {
    case 'toggle':
      return (
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-gray-600">{field.label}</label>
          <button
            onClick={() => onChange(!(value as boolean))}
            className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-rose-500' : 'bg-gray-200'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>
      );

    case 'textarea':
      return (
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500 block mb-1">{field.label}</label>
          <textarea
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
          />
        </div>
      );

    case 'select':
      return (
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500 block mb-1">{field.label}</label>
          <div className="relative">
            <select
              value={(value as string) ?? ''}
              onChange={e => onChange(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 pr-8 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      );

    case 'color':
      return (
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500 block mb-1">{field.label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(value as string) ?? '#000000'}
              onChange={e => onChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200"
            />
            <input
              type="text"
              value={(value as string) ?? ''}
              onChange={e => onChange(e.target.value)}
              placeholder={field.placeholder ?? 'e.g. #000000'}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500 block mb-1">{field.label}</label>
          {value ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200 aspect-video bg-gray-100 mb-2">
              <img src={value as string} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => onChange('')}
                className="absolute top-1 right-1 p-1 bg-white rounded shadow text-gray-500 hover:text-red-500 transition-colors"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          ) : null}
          <button
            onClick={() => dispatch(builderActions.openMediaLibrary(sectionId))}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-3 text-xs text-gray-400 hover:border-rose-300 hover:text-rose-400 transition-colors"
          >
            <ImageIcon size={14} />
            {value ? 'Change image' : 'Select from media library'}
          </button>
        </div>
      );

    case 'number':
      return (
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500 block mb-1">{field.label}</label>
          <input
            type="number"
            value={(value as number) ?? 0}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
      );

    default:
      return (
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500 block mb-1">{field.label}</label>
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
      );
  }
};
