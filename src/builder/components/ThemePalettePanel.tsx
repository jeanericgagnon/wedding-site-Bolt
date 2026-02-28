import React, { useState, useEffect, useRef } from 'react';
import { X, Palette, Check, ChevronRight, Pipette } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { getAllThemePresets, getThemePacks, ThemeTokens, applyThemePreset } from '../../lib/themePresets';

interface ThemePalettePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type PanelView = 'presets' | 'custom';

const TOKEN_LABELS: { key: keyof ThemeTokens; label: string; group: string }[] = [
  { key: 'colorPrimary', label: 'Primary', group: 'Brand' },
  { key: 'colorAccent', label: 'Accent', group: 'Brand' },
  { key: 'colorSecondary', label: 'Secondary / Gold', group: 'Brand' },
  { key: 'colorBackground', label: 'Page Background', group: 'Surface' },
  { key: 'colorSurface', label: 'Card Surface', group: 'Surface' },
  { key: 'colorBorder', label: 'Border', group: 'Surface' },
  { key: 'colorTextPrimary', label: 'Primary Text', group: 'Text' },
  { key: 'colorTextSecondary', label: 'Secondary Text', group: 'Text' },
];

function ColorSwatch({ color }: { color: string }) {
  return (
    <div
      className="w-5 h-5 rounded-full border border-black/10 shadow-sm flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function PresetRow({
  preset,
  isActive,
  onSelect,
}: {
  preset: ReturnType<typeof getAllThemePresets>[number];
  isActive: boolean;
  onSelect: () => void;
}) {
  const swatchColors = [
    preset.tokens.colorPrimary,
    preset.tokens.colorAccent,
    preset.tokens.colorSecondary,
    preset.tokens.colorBackground,
  ];

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
        isActive
          ? 'bg-gray-900 text-white'
          : 'hover:bg-gray-50 text-gray-700'
      }`}
    >
      <div className="flex gap-1 flex-shrink-0">
        {swatchColors.map((c, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full border border-black/10"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-800'}`}>
          {preset.name}
        </div>
        <div className={`text-xs truncate ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
          {preset.description}
        </div>
      </div>
      {isActive && <Check size={14} className="text-white flex-shrink-0" />}
    </button>
  );
}

export const ThemePalettePanel: React.FC<ThemePalettePanelProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useBuilderContext();
  const activeThemeId = state.project?.themeId ?? 'romantic';
  const presets = getAllThemePresets();
  const packs = getThemePacks();

  const [view, setView] = useState<PanelView>('presets');
  const [selectedPack, setSelectedPack] = useState<string>('all');
  const [customTokens, setCustomTokens] = useState<ThemeTokens>(() => {
    const active = presets.find(p => p.id === activeThemeId);
    return active?.tokens ?? presets[0].tokens;
  });
  const [customApplied, setCustomApplied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  const handleSelectPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      dispatch(builderActions.applyThemeTokens(presetId, preset.tokens));
      applyThemePreset(presetId);
      setCustomTokens(preset.tokens);
    }
    setCustomApplied(false);
  };

  const handleCustomTokenChange = (key: keyof ThemeTokens, value: string) => {
    const updated = { ...customTokens, [key]: value };
    setCustomTokens(updated);

    const el = document.documentElement;
    const map: Record<keyof ThemeTokens, string> = {
      colorPrimary: '--color-primary',
      colorPrimaryHover: '--color-primary-hover',
      colorPrimaryLight: '--color-primary-light',
      colorAccent: '--color-accent',
      colorAccentHover: '--color-accent-hover',
      colorAccentLight: '--color-accent-light',
      colorSecondary: '--color-secondary',
      colorBackground: '--color-background',
      colorSurface: '--color-surface',
      colorSurfaceSubtle: '--color-surface-subtle',
      colorBorder: '--color-border',
      colorTextPrimary: '--color-text-primary',
      colorTextSecondary: '--color-text-secondary',
    };
    el.style.setProperty(map[key], value);
    setCustomApplied(true);
  };

  const handleApplyCustom = () => {
    dispatch(builderActions.applyThemeTokens('custom', customTokens));
    setCustomApplied(true);
  };

  const handleResetToPreset = () => {
    const preset = presets.find(p => p.id === activeThemeId) ?? presets[0];
    setCustomTokens(preset.tokens);
    applyThemePreset(preset.id);
    setCustomApplied(false);
  };

  const filteredPresets = selectedPack === 'all'
    ? presets
    : presets.filter((preset) => preset.pack === selectedPack);

  const grouped = TOKEN_LABELS.reduce<Record<string, typeof TOKEN_LABELS>>((acc, t) => {
    if (!acc[t.group]) acc[t.group] = [];
    acc[t.group].push(t);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pointer-events-none">
      <div
        ref={panelRef}
        className="mt-14 mr-0 w-80 bg-white border-l border-gray-200 shadow-2xl h-[calc(100vh-3.5rem)] flex flex-col pointer-events-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Palette size={15} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-800">Color Palette</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close palette panel"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setView('presets')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              view === 'presets'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setView('custom')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              view === 'custom'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Custom
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {view === 'presets' && (
            <div className="p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-100">
                <button
                  onClick={() => setSelectedPack('all')}
                  className={`px-2 py-1 rounded-full text-[11px] font-medium border ${selectedPack === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  All packs
                </button>
                {packs.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.id)}
                    className={`px-2 py-1 rounded-full text-[11px] font-medium border ${selectedPack === pack.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {pack.label}
                  </button>
                ))}
              </div>

              {filteredPresets.map(preset => (
                <PresetRow
                  key={preset.id}
                  preset={preset}
                  isActive={activeThemeId === preset.id && !customApplied}
                  onSelect={() => handleSelectPreset(preset.id)}
                />
              ))}

              <div className="pt-3 border-t border-gray-100 mt-3">
                <button
                  onClick={() => setView('custom')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 transition-colors text-gray-600 group"
                >
                  <div className="flex items-center gap-2">
                    <Pipette size={14} className="text-gray-400" />
                    <span className="text-sm">Build custom palette</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </button>
              </div>
            </div>
          )}

          {view === 'custom' && (
            <div className="p-4 space-y-5">
              <p className="text-xs text-gray-400 leading-relaxed">
                Customize individual colors. Changes preview instantly on the canvas.
              </p>

              {Object.entries(grouped).map(([group, tokens]) => (
                <div key={group}>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {group}
                  </div>
                  <div className="space-y-2">
                    {tokens.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customTokens[key]}
                          onChange={e => handleCustomTokenChange(key, e.target.value)}
                          className="w-8 h-8 rounded-md cursor-pointer border border-gray-200 p-0.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-700 font-medium">{label}</div>
                          <input
                            type="text"
                            value={customTokens[key]}
                            onChange={e => {
                              const v = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleCustomTokenChange(key, v);
                            }}
                            className="w-full text-xs text-gray-500 font-mono bg-transparent border-none outline-none p-0 mt-0.5"
                            spellCheck={false}
                          />
                        </div>
                        <ColorSwatch color={customTokens[key]} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-gray-100 space-y-2">
                <button
                  onClick={handleApplyCustom}
                  className="w-full py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Apply Custom Palette
                </button>
                <button
                  onClick={handleResetToPreset}
                  className="w-full py-2 rounded-lg bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  Reset to Preset
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[
                customTokens.colorPrimary,
                customTokens.colorAccent,
                customTokens.colorSecondary,
                customTokens.colorBackground,
                customTokens.colorTextPrimary,
              ].map((c, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-1">
              {customApplied ? 'Custom palette' : (presets.find(p => p.id === activeThemeId)?.name ?? 'Romantic')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
