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
      className="w-5 h-5 rounded-lg border border-black/10 shadow-none flex-shrink-0"
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
          ? 'bg-primary text-white'
          : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
      }`}
    >
      <div className="flex gap-1 flex-shrink-0">
        {swatchColors.map((c, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-lg border border-black/10"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-text-primary'}`}>
          {preset.name}
        </div>
        <div className={`text-xs truncate ${isActive ? 'text-white/70' : 'text-text-tertiary'}`}>
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
  const globalAnimationPreset = state.project?.globalAnimationPreset ?? null;
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
        className="mt-14 mr-0 flex h-[calc(100vh-3.5rem)] w-80 flex-col border-l border-border bg-surface shadow-none pointer-events-auto"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            <Palette size={15} className="text-text-tertiary" />
            <span className="text-sm font-semibold text-text-primary">Color palette</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-surface-subtle hover:text-text-primary"
            aria-label="Close palette panel"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex border-b border-border-subtle">
          <button
            onClick={() => setView('presets')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              view === 'presets'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setView('custom')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              view === 'custom'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            Custom
          </button>
        </div>

        <div className="border-b border-border-subtle bg-surface-subtle/70 px-3 py-2.5">
          <label className="text-[11px] font-semibold text-text-tertiary">Section animation (optional)</label>
          <select
            value={globalAnimationPreset ?? 'none'}
            onChange={(e) => dispatch(builderActions.setGlobalAnimationPreset(e.target.value === 'none' ? null : (e.target.value as NonNullable<typeof globalAnimationPreset>)))}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-surface px-2.5 py-2 text-xs text-text-secondary"
          >
            <option value="none">No shared animation</option>
            <option value="fade-in">Fade in</option>
            <option value="fade-up">Fade up</option>
            <option value="slide-up">Slide up</option>
            <option value="zoom-in">Zoom in</option>
            <option value="stagger">Stagger by section order</option>
            <option value="reveal-left">Reveal from left</option>
            <option value="reveal-right">Reveal from right</option>
            <option value="blur-in">Soft blur in</option>
            <option value="float-in">Float in</option>
            <option value="scale-up">Scale up</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {view === 'presets' && (
            <div className="p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5 border-b border-border-subtle pb-2">
                <button
                  onClick={() => setSelectedPack('all')}
                  className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${selectedPack === 'all' ? 'border-primary bg-primary text-white' : 'border-border-subtle bg-surface text-text-secondary hover:bg-surface-subtle'}`}
                >
                  All packs
                </button>
                {packs.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.id)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${selectedPack === pack.id ? 'border-primary bg-primary text-white' : 'border-border-subtle bg-surface text-text-secondary hover:bg-surface-subtle'}`}
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

              <div className="mt-3 border-t border-border-subtle pt-3">
                <button
                  onClick={() => setView('custom')}
                  className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary"
                >
                  <div className="flex items-center gap-2">
                    <Pipette size={14} className="text-text-tertiary" />
                    <span className="text-sm">Build a custom palette</span>
                  </div>
                  <ChevronRight size={14} className="text-text-tertiary transition-colors group-hover:text-text-primary" />
                </button>
              </div>
            </div>
          )}

          {view === 'custom' && (
            <div className="p-4 space-y-5">
              <p className="text-xs leading-relaxed text-text-tertiary">
                Customize individual colors. Changes preview instantly on the canvas.
              </p>

              {Object.entries(grouped).map(([group, tokens]) => (
                <div key={group}>
                  <div className="mb-2 text-xs font-semibold text-text-tertiary">
                    {group}
                  </div>
                  <div className="space-y-2">
                    {tokens.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customTokens[key]}
                          onChange={e => handleCustomTokenChange(key, e.target.value)}
                          className="h-8 w-8 flex-shrink-0 cursor-pointer rounded-lg border border-border-subtle p-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-text-primary">{label}</div>
                          <input
                            type="text"
                            value={customTokens[key]}
                            onChange={e => {
                              const v = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleCustomTokenChange(key, v);
                            }}
                            className="mt-0.5 w-full border-none bg-transparent p-0 font-mono text-xs text-text-secondary outline-none"
                            spellCheck={false}
                          />
                        </div>
                        <ColorSwatch color={customTokens[key]} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="space-y-2 border-t border-border-subtle pt-3">
                <button
                  onClick={handleApplyCustom}
                  className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  Apply Custom Palette
                </button>
                <button
                  onClick={handleResetToPreset}
                  className="w-full rounded-lg border border-border-subtle bg-surface-subtle py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
                >
                  Reset to Preset
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle bg-surface-subtle px-4 py-3">
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
                  className="w-4 h-4 rounded-lg border border-black/10 shadow-none"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span className="ml-1 text-xs text-text-tertiary">
              {customApplied ? 'Custom palette' : (presets.find(p => p.id === activeThemeId)?.name ?? 'Romantic')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
