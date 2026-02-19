import React, { useRef, useEffect } from 'react';
import { X, ChevronDown, ImageIcon, Eye, EyeOff, Pencil, Palette, Database } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { selectSelectedSection, selectActivePage } from '../state/builderSelectors';
import { getSectionManifest } from '../registry/sectionManifests';
import { BuilderSettingsField } from '../../types/builder/section';

type InspectorTab = 'content' | 'style' | 'data';

export const BuilderInspectorPanel: React.FC = () => {
  const { state, dispatch } = useBuilderContext();
  const [activeTab, setActiveTab] = React.useState<InspectorTab>('content');
  const selectedSection = selectSelectedSection(state);
  const activePage = selectActivePage(state);

  useEffect(() => {
    if (selectedSection) setActiveTab('content');
  }, [selectedSection?.id]);

  if (!selectedSection || !activePage) {
    return (
      <aside className="w-72 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Pencil size={18} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-1">No section selected</p>
            <p className="text-xs text-gray-400 leading-relaxed">Click any section on the canvas to edit its content and style</p>
          </div>
        </div>
      </aside>
    );
  }

  const manifest = getSectionManifest(selectedSection.type);
  const hasBindings = manifest.capabilities.hasBindings && manifest.bindingsSchema.slots.length > 0;

  const handleUpdateSetting = (key: string, value: string | boolean | number) => {
    dispatch(
      builderActions.updateSection(activePage.id, selectedSection.id, {
        settings: { ...selectedSection.settings, [key]: value },
      })
    );
  };

  const handleChangeVariant = (variant: string) => {
    dispatch(builderActions.updateSection(activePage.id, selectedSection.id, { variant }));
  };

  const handleToggleVisibility = () => {
    dispatch(builderActions.toggleSectionVisibility(activePage.id, selectedSection.id));
  };

  const tabs: { id: InspectorTab; icon: React.FC<{ size?: number; className?: string }>; label: string; show: boolean }[] = [
    { id: 'content', icon: Pencil, label: 'Content', show: manifest.settingsSchema.fields.length > 0 },
    { id: 'style', icon: Palette, label: 'Style', show: true },
    { id: 'data', icon: Database, label: 'Data', show: hasBindings },
  ].filter(t => t.show);

  return (
    <aside className="w-72 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800 truncate">{manifest.label}</h3>
            {!selectedSection.enabled && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100">Hidden</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-gray-400">Variant:</span>
            <select
              value={selectedSection.variant}
              onChange={e => handleChangeVariant(e.target.value)}
              className="text-[10px] text-gray-600 font-medium bg-transparent border-none outline-none cursor-pointer"
            >
              {manifest.supportedVariants.map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleToggleVisibility}
            title={selectedSection.enabled ? 'Hide section' : 'Show section'}
            className={`p-1.5 rounded-lg transition-colors ${
              selectedSection.enabled
                ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                : 'text-amber-500 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            {selectedSection.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={() => dispatch(builderActions.selectSection(null))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="flex border-b border-gray-100 px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors mr-1 ${
                activeTab === tab.id
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'content' && (
          <div className="p-4 space-y-1">
            {manifest.settingsSchema.fields.map(field => (
              <InspectorField
                key={field.key}
                field={field}
                value={selectedSection.settings[field.key] ?? field.defaultValue}
                onChange={val => handleUpdateSetting(field.key, val)}
                sectionId={selectedSection.id}
              />
            ))}
            {manifest.settingsSchema.fields.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No editable content fields for this section.</p>
            )}
          </div>
        )}

        {activeTab === 'style' && (
          <div className="p-4 space-y-5">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Colors</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedSection.styleOverrides?.backgroundColor ?? '#ffffff'}
                      onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                        styleOverrides: { ...selectedSection.styleOverrides, backgroundColor: e.target.value },
                      }))}
                      className="w-8 h-8 rounded-md cursor-pointer border border-gray-200 p-0.5 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedSection.styleOverrides?.backgroundColor ?? ''}
                      onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                        styleOverrides: { ...selectedSection.styleOverrides, backgroundColor: e.target.value },
                      }))}
                      placeholder="inherit"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono bg-gray-50 focus:bg-white transition-colors"
                    />
                    {selectedSection.styleOverrides?.backgroundColor && (
                      <button
                        onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                          styleOverrides: { ...selectedSection.styleOverrides, backgroundColor: undefined },
                        }))}
                        title="Clear"
                        className="text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedSection.styleOverrides?.textColor ?? '#111827'}
                      onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                        styleOverrides: { ...selectedSection.styleOverrides, textColor: e.target.value },
                      }))}
                      className="w-8 h-8 rounded-md cursor-pointer border border-gray-200 p-0.5 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedSection.styleOverrides?.textColor ?? ''}
                      onChange={e => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                        styleOverrides: { ...selectedSection.styleOverrides, textColor: e.target.value },
                      }))}
                      placeholder="inherit"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono bg-gray-50 focus:bg-white transition-colors"
                    />
                    {selectedSection.styleOverrides?.textColor && (
                      <button
                        onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                          styleOverrides: { ...selectedSection.styleOverrides, textColor: undefined },
                        }))}
                        title="Clear"
                        className="text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Spacing</p>
              <SpacingControl
                label="Padding Top"
                value={selectedSection.styleOverrides?.paddingTop ?? ''}
                onChange={val => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                  styleOverrides: { ...selectedSection.styleOverrides, paddingTop: val || undefined },
                }))}
              />
              <SpacingControl
                label="Padding Bottom"
                value={selectedSection.styleOverrides?.paddingBottom ?? ''}
                onChange={val => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                  styleOverrides: { ...selectedSection.styleOverrides, paddingBottom: val || undefined },
                }))}
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Side Image</p>
                {selectedSection.styleOverrides?.sideImage && (
                  <button
                    onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                      styleOverrides: { ...selectedSection.styleOverrides, sideImage: undefined },
                    }))}
                    className="text-[10px] text-red-400 hover:text-red-600 font-medium transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              {selectedSection.styleOverrides?.sideImage ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100 group">
                    <img
                      src={selectedSection.styleOverrides.sideImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => dispatch(builderActions.openSideImagePicker(selectedSection.id))}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
                    >
                      Change Image
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Position</label>
                    <div className="flex gap-1.5">
                      {(['left', 'right'] as const).map(pos => (
                        <button
                          key={pos}
                          onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                            styleOverrides: { ...selectedSection.styleOverrides, sideImagePosition: pos },
                          }))}
                          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                            (selectedSection.styleOverrides?.sideImagePosition ?? 'right') === pos
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Width</label>
                    <div className="flex gap-1.5">
                      {([['sm', '25%'], ['md', '40%'], ['lg', '50%']] as const).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                            styleOverrides: { ...selectedSection.styleOverrides, sideImageSize: key },
                          }))}
                          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            (selectedSection.styleOverrides?.sideImageSize ?? 'md') === key
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Fit</label>
                    <div className="flex gap-1.5">
                      {(['cover', 'contain'] as const).map(fit => (
                        <button
                          key={fit}
                          onClick={() => dispatch(builderActions.updateSection(activePage.id, selectedSection.id, {
                            styleOverrides: { ...selectedSection.styleOverrides, sideImageFit: fit },
                          }))}
                          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                            (selectedSection.styleOverrides?.sideImageFit ?? 'cover') === fit
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {fit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => dispatch(builderActions.openSideImagePicker(selectedSection.id))}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 text-xs text-gray-400 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                >
                  <ImageIcon size={15} />
                  Add a side image
                </button>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Layout</p>
              <div className="relative">
                <select
                  value={selectedSection.variant}
                  onChange={e => handleChangeVariant(e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 pr-8 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-colors"
                >
                  {manifest.variantMeta.map(v => (
                    <option key={v.id} value={v.id}>{v.label} — {v.description}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && hasBindings && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              This section automatically pulls data from your wedding information. Manage the source data from the dashboard.
            </p>
            {manifest.bindingsSchema.slots.map(slot => (
              <div key={slot.key} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-0.5">{slot.label}</p>
                <p className="text-xs text-gray-400">Auto-bound from <span className="font-medium text-gray-500">{slot.dataSource}</span> data</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

interface InspectorFieldProps {
  field: BuilderSettingsField;
  value: string | boolean | number | undefined;
  onChange: (val: string | boolean | number) => void;
  sectionId?: string;
}

const InspectorField: React.FC<InspectorFieldProps> = ({ field, value, onChange, sectionId }) => {
  const { dispatch } = useBuilderContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  switch (field.type) {
    case 'toggle':
      return (
        <div className="flex items-center justify-between py-2">
          <label className="text-sm text-gray-700 font-medium">{field.label}</label>
          <button
            onClick={() => onChange(!(value as boolean))}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-rose-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-4' : ''}`} />
          </button>
        </div>
      );

    case 'textarea':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{field.label}</label>
          <textarea
            ref={textareaRef}
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none bg-gray-50 focus:bg-white transition-colors"
          />
        </div>
      );

    case 'select':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{field.label}</label>
          <div className="relative">
            <select
              value={(value as string) ?? ''}
              onChange={e => onChange(e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-700 pr-8 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-colors"
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
        <div className="py-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{field.label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={(value as string) ?? '#000000'}
              onChange={e => onChange(e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5"
            />
            <input
              type="text"
              value={(value as string) ?? ''}
              onChange={e => onChange(e.target.value)}
              placeholder={field.placeholder ?? 'e.g. #000000'}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono bg-gray-50"
            />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{field.label}</label>
          {value ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100 mb-2 group">
              <img src={value as string} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => onChange('')}
                  className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}
          <button
            onClick={() => dispatch(builderActions.openMediaLibrary(sectionId))}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-3 text-xs text-gray-400 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
          >
            <ImageIcon size={14} />
            {value ? 'Change image' : 'Choose from media library'}
          </button>
        </div>
      );

    case 'number':
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{field.label}</label>
          <input
            type="number"
            value={(value as number) ?? 0}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition-colors"
          />
        </div>
      );

    default:
      return (
        <div className="py-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">{field.label}</label>
          <input
            type="text"
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gray-50 focus:bg-white transition-colors"
          />
        </div>
      );
  }
};

const SPACING_PRESETS = [
  { label: 'None', value: '0px' },
  { label: 'S', value: '2rem' },
  { label: 'M', value: '4rem' },
  { label: 'L', value: '6rem' },
  { label: 'XL', value: '10rem' },
];

const SpacingControl: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ label, value, onChange }) => {
  const activePreset = SPACING_PRESETS.find(p => p.value === value);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        {value && (
          <span className="text-[10px] font-mono text-gray-400">{value}</span>
        )}
      </div>
      <div className="flex gap-1 mb-2">
        {SPACING_PRESETS.map(preset => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value === value ? '' : preset.value)}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
              activePreset?.value === preset.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. 4rem, 64px, 10%"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono bg-gray-50 focus:bg-white transition-colors"
      />
    </div>
  );
};
