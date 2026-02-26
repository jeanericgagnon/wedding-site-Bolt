import React, { useState, useCallback, useMemo } from 'react';
import { X, Check, Sparkles, Loader2, CheckCircle2, RefreshCw, Crown, Zap } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { getAllTemplatePacks } from '../constants/builderTemplatePacks';
import { BuilderTemplateDefinition, TemplateMoodTag } from '../../types/builder/template';
import { createBuilderSectionFromLibrary } from '../adapters/layoutAdapter';
import { getSectionManifest } from '../registry/sectionManifests';
import { BuilderSectionInstance } from '../../types/builder/section';
import { selectActivePage } from '../state/builderSelectors';

function preserveContentAcrossTemplate(
  existingSections: BuilderSectionInstance[],
  newSections: BuilderSectionInstance[]
): BuilderSectionInstance[] {
  const existingByType = new Map<string, BuilderSectionInstance>();
  for (const sec of existingSections) {
    if (!existingByType.has(sec.type)) {
      existingByType.set(sec.type, sec);
    }
  }
  return newSections.map(newSec => {
    const existing = existingByType.get(newSec.type);
    if (!existing) return newSec;
    return {
      ...newSec,
      settings: { ...newSec.settings, ...existing.settings },
      bindings: { ...newSec.bindings, ...existing.bindings },
      styleOverrides: { ...existing.styleOverrides },
    };
  });
}

const MOOD_FILTERS: { id: TemplateMoodTag | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'modern', label: 'Modern' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'classic', label: 'Classic' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'destination', label: 'Destination' },
  { id: 'floral', label: 'Floral' },
  { id: 'bold', label: 'Bold' },
  { id: 'photo', label: 'Photo-first' },
];

const RECOMMENDED_TEMPLATE_IDS = ['modern-luxe', 'editorial-romance', 'timeless-classic', 'destination-minimal'];
const TEMPLATE_USAGE_KEY = 'dayof_template_usage_v1';

const COLOR_FILTERS = ['all', 'light', 'dark', 'neutral', 'warm', 'cool'] as const;
type ColorFilter = (typeof COLOR_FILTERS)[number];

const SEASON_FILTERS = ['all', 'spring', 'summer', 'fall', 'winter'] as const;
type SeasonFilter = (typeof SEASON_FILTERS)[number];

interface TemplateGalleryPanelProps {
  onSaveRequest?: () => void;
}

interface ApplyResult {
  templateName: string;
  newSections: string[];
  preservedSections: string[];
}

const readTemplateUsage = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(TEMPLATE_USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const bumpTemplateUsage = (templateId: string) => {
  try {
    const usage = readTemplateUsage();
    usage[templateId] = (usage[templateId] || 0) + 1;
    localStorage.setItem(TEMPLATE_USAGE_KEY, JSON.stringify(usage));
  } catch {
    // non-blocking
  }
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return { r: 128, g: 128, b: 128 };
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const classifyColor = (hex: string): ColorFilter => {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;

  if (lightness >= 0.78) return 'light';
  if (lightness <= 0.28) return 'dark';

  const chroma = max - min;
  if (chroma < 0.12) return 'neutral';

  if (r >= g && r >= b) return 'warm';
  if (b >= r && b >= g) return 'cool';
  return g >= b ? 'warm' : 'cool';
};

const inferSeason = (template: BuilderTemplateDefinition): SeasonFilter => {
  const tags = new Set(template.moodTags);
  if (tags.has('floral') || tags.has('garden')) return 'spring';
  if (tags.has('destination') || tags.has('photo')) return 'summer';
  if (tags.has('classic') || tags.has('editorial') || tags.has('luxe')) return 'fall';
  if (tags.has('minimal') || tags.has('modern')) return 'winter';
  return 'all';
};

const ModernLuxePreview = () => (
  <div className="absolute inset-0 flex flex-col bg-[#0C0A09] overflow-hidden">
    <div className="relative flex-1">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(160deg, #1C1917 0%, #0C0A09 60%, #1A1410 100%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 70% 40%, rgba(200,169,110,0.12) 0%, transparent 60%)',
      }} />
      <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
        <div className="space-y-1">
          <div className="h-px w-6 bg-[#C8A96E]" />
          <div className="h-px w-4 bg-[#C8A96E]/40" />
        </div>
        <div className="text-[7px] text-[#C8A96E]/60 tracking-[0.4em] uppercase font-light">S&J</div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
        <div className="text-[8px] text-[#C8A96E] tracking-[0.5em] uppercase font-light mb-3">A Private Celebration</div>
        <div className="text-white font-serif text-[22px] leading-none tracking-tight mb-1">
          Sarah
          <span className="text-[#C8A96E] text-[14px] mx-1.5">&</span>
          James
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="h-px w-8 bg-white/20" />
          <div className="text-white/40 text-[7px] tracking-[0.3em] uppercase">14 June 2026</div>
          <div className="h-px w-8 bg-white/20" />
        </div>
        <div className="text-white/25 text-[7px] tracking-wider mt-1.5">The Ritz · London</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-16 flex">
        {[
          { label: 'Our Story', w: 'flex-1' },
          { label: 'Gallery', w: 'flex-1' },
          { label: 'Schedule', w: 'flex-1' },
          { label: 'RSVP', w: 'flex-1' },
        ].map((s, i) => (
          <div key={i} className={`${s.w} flex flex-col items-center justify-center border-t border-white/[0.06] gap-1`}>
            <div className="w-4 h-4 rounded-full border border-[#C8A96E]/30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C8A96E]/40" />
            </div>
            <span className="text-[5.5px] text-white/25 uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="h-1.5 bg-gradient-to-r from-transparent via-[#C8A96E]/60 to-transparent" />
  </div>
);

const EditorialRomancePreview = () => (
  <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#F8F4EF' }}>
    <div className="flex-1 relative">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(145deg, #F6EFE7 0%, #F8F4EF 45%, #EDE3D7 100%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 75% 22%, rgba(145,102,68,0.16) 0%, transparent 55%)',
      }} />
      <div className="absolute top-4 left-4 text-[6.5px] uppercase tracking-[0.35em]" style={{ color: '#7E6250' }}>Editorial Romance</div>
      <div className="absolute top-4 right-4 text-[6px] uppercase tracking-[0.3em]" style={{ color: '#A9876E' }}>No. 03</div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-[7px] uppercase tracking-[0.45em] mb-4" style={{ color: '#A47757' }}>For the hopeless romantics</div>
        <div className="font-serif text-[30px] leading-none" style={{ color: '#221A16' }}>Emma</div>
        <div className="text-[10px] my-1 tracking-[0.28em]" style={{ color: '#B08860' }}>&amp;</div>
        <div className="font-serif text-[30px] leading-none" style={{ color: '#221A16' }}>Oliver</div>
        <div className="mt-4 text-[7px] tracking-[0.32em] uppercase" style={{ color: '#6C5648' }}>September 18 · 2026</div>
        <div className="mt-1 text-[6.5px] tracking-[0.18em] uppercase" style={{ color: '#8E7566' }}>Villa Borghese · Rome</div>
      </div>
    </div>

    <div className="h-11 border-t grid grid-cols-4" style={{ background: '#FCF9F5', borderColor: '#E2D8CB' }}>
      {['Story', 'Gallery', 'Schedule', 'RSVP'].map(s => (
        <div key={s} className="flex items-center justify-center border-r last:border-0" style={{ borderColor: '#E8DFD4' }}>
          <span className="text-[6px] uppercase tracking-[0.24em]" style={{ color: '#6E5A4B' }}>{s}</span>
        </div>
      ))}
    </div>
  </div>
);

const TimelessClassicPreview = () => (
  <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#FDFBF6' }}>
    <div className="flex-1 flex flex-col items-center justify-center px-5 text-center relative">
      <div className="absolute top-3 left-3 right-3 flex justify-between">
        <div className="flex gap-1 opacity-30">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-0.5 h-3 rounded-full" style={{ background: '#C4983C' }} />
          ))}
        </div>
        <div className="flex gap-1 opacity-30">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-0.5 h-3 rounded-full" style={{ background: '#C4983C' }} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #C4983C)' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#C4983C' }} />
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #C4983C)' }} />
      </div>
      <div className="text-[7px] tracking-[0.5em] uppercase font-medium mb-3" style={{ color: '#C4983C' }}>
        You are cordially invited to
      </div>
      <div className="font-serif text-[11px] mb-0.5" style={{ color: '#0A1624' }}>The Wedding of</div>
      <div className="font-serif text-[20px] leading-tight" style={{ color: '#0A1624' }}>
        Charlotte<br />&amp; William
      </div>
      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #C4983C)' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#C4983C' }} />
        <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #C4983C)' }} />
      </div>
      <div className="text-[7px] tracking-[0.25em] uppercase mb-0.5" style={{ color: '#53647E' }}>
        Saturday, 21st June 2026
      </div>
      <div className="text-[7px] tracking-wider" style={{ color: '#53647E' }}>
        Grand Manor House · Cotswolds
      </div>
    </div>
    <div className="h-9 border-t flex" style={{ background: '#F8F5EE', borderColor: '#D9D2C3' }}>
      {['Our Story', 'Venue', 'Schedule', 'RSVP'].map((s, i) => (
        <div key={s} className="flex-1 flex items-center justify-center border-r last:border-0" style={{ borderColor: '#D9D2C3' }}>
          <span className="text-[5.5px] uppercase tracking-wider" style={{ color: '#53647E' }}>{s}</span>
        </div>
      ))}
    </div>
  </div>
);

const DestinationMinimalPreview = () => (
  <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#F3F8FA' }}>
    <div className="h-[55%] relative overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #1E5F6F 0%, #2A7A8C 40%, #4BAABC 80%, #E6F6F9 100%)',
      }} />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 60% 60%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(75,170,188,0.4) 0%, transparent 40%)',
      }} />
      <div className="absolute bottom-0 left-0 right-0 h-8" style={{
        background: 'linear-gradient(180deg, transparent 0%, #F3F8FA 100%)',
      }} />
      <div className="absolute top-4 left-4">
        <div className="text-[7px] text-white/70 tracking-[0.4em] uppercase mb-0.5">Destination</div>
        <div className="text-white font-light text-[18px] leading-tight tracking-tight">
          Mia &amp; Luca
        </div>
        <div className="text-white/50 text-[7px] tracking-widest mt-1">SANTORINI · JULY 2026</div>
      </div>
    </div>
    <div className="flex-1 px-4 py-3 flex flex-col justify-center">
      <div className="flex gap-2 mb-2.5">
        <div className="flex-1 rounded-lg py-1.5 flex flex-col items-center gap-0.5" style={{ background: '#E4EFF2' }}>
          <div className="w-4 h-3 rounded-sm" style={{ background: '#4BAABC' }} />
          <span className="text-[5.5px] uppercase tracking-wider" style={{ color: '#356270' }}>Venue</span>
        </div>
        <div className="flex-1 rounded-lg py-1.5 flex flex-col items-center gap-0.5" style={{ background: '#E4EFF2' }}>
          <div className="w-4 h-3 rounded-sm" style={{ background: '#1E5F6F' }} />
          <span className="text-[5.5px] uppercase tracking-wider" style={{ color: '#356270' }}>Travel</span>
        </div>
        <div className="flex-1 rounded-lg py-1.5 flex flex-col items-center gap-0.5" style={{ background: '#E4EFF2' }}>
          <div className="w-4 h-3 rounded-sm" style={{ background: '#4BAABC' }} />
          <span className="text-[5.5px] uppercase tracking-wider" style={{ color: '#356270' }}>Hotels</span>
        </div>
      </div>
      <div className="rounded-lg h-5 flex items-center justify-center" style={{ background: '#1E5F6F' }}>
        <span className="text-[6px] text-white uppercase tracking-wider">RSVP Now</span>
      </div>
    </div>
  </div>
);

const BoldContemporaryPreview = () => (
  <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#0C0A09' }}>
    <div className="flex-1 relative overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #1C1917 0%, #0C0A09 100%)',
      }} />
      <div
        className="absolute top-0 right-0 bottom-0 w-[55%]"
        style={{
          background: 'linear-gradient(135deg, #2C2520 0%, #1C1714 100%)',
          clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)',
        }}
      />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 80% 30%, rgba(200,169,110,0.06) 0%, transparent 50%)',
      }} />
      <div className="absolute bottom-6 left-4 right-4">
        <div className="text-[7px] tracking-[0.5em] uppercase mb-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>NYC · 2026</div>
        <div className="font-black uppercase leading-none" style={{
          color: '#FFFFFF',
          fontSize: '28px',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          JADE<br />&amp; MAX
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <div className="h-px flex-1" style={{ background: 'rgba(200,169,110,0.3)' }} />
          <span className="text-[6px] uppercase tracking-[0.3em]" style={{ color: 'rgba(200,169,110,0.5)' }}>Brooklyn · September</span>
        </div>
      </div>
    </div>
    <div className="h-11 grid grid-cols-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      {['Sched.', 'Gallery', 'Venue', 'RSVP'].map(s => (
        <div key={s} className="flex items-center justify-center border-r last:border-0" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#111110' }}>
          <span className="text-[6px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>{s}</span>
        </div>
      ))}
    </div>
  </div>
);

const PhotoStorytellingPreview = () => (
  <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#F9F4F0' }}>
    <div className="flex-1 relative overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1 p-1.5">
        <div
          className="col-span-2 row-span-2 rounded-xl relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #B88975 0%, #8E5F50 100%)' }}
        >
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle at 70% 20%, rgba(255,255,255,0.18) 0%, transparent 45%)',
          }} />
          <div className="absolute left-3 right-3 bottom-3 rounded-lg px-2.5 py-2" style={{ background: 'rgba(249,244,240,0.95)' }}>
            <div className="font-serif text-[11px]" style={{ color: '#2E1D1A' }}>Ava &amp; Noah</div>
            <div className="text-[6px] uppercase tracking-[0.25em] mt-0.5" style={{ color: '#8D6661' }}>October 2026 · Carmel</div>
          </div>
        </div>
        <div className="rounded-xl" style={{ background: 'linear-gradient(140deg, #E8C8B1 0%, #DCA68A 100%)' }} />
        <div className="rounded-xl" style={{ background: 'linear-gradient(140deg, #D3A3A0 0%, #B97B7A 100%)' }} />
      </div>
    </div>
    <div className="h-12 border-t px-3 flex items-center gap-2" style={{ background: '#FFFFFF', borderColor: '#E9DAD3' }}>
      <div className="text-[6px] uppercase tracking-[0.2em]" style={{ color: '#7A5A54' }}>Photo-first</div>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#F3E6E0' }} />
      <div className="rounded-full px-3 h-6 flex items-center justify-center" style={{ background: '#9A5D5C' }}>
        <span className="text-[6px] text-white uppercase tracking-wider font-medium">See details</span>
      </div>
    </div>
  </div>
);

const FloralGardenPreview = () => (
  <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: '#F4F7F1' }}>
    <div className="flex-1 relative overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(140deg, #F3F7F0 0%, #EAF1E7 55%, #F8EFE8 100%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(circle at 20% 25%, rgba(92,138,103,0.22) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(201,131,88,0.16) 0%, transparent 38%)',
      }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5">
        <div className="text-[7px] tracking-[0.35em] uppercase mb-2" style={{ color: '#51785C' }}>Garden Collection</div>
        <div className="font-serif text-[24px] leading-tight" style={{ color: '#1C3222' }}>
          Rose
          <span className="text-[14px] mx-1.5" style={{ color: '#C47A4A' }}>&amp;</span>
          Henry
        </div>
        <div className="mt-2 text-[6.5px] uppercase tracking-[0.3em]" style={{ color: '#5A7A61' }}>May 2026 · Surrey</div>
        <div className="mt-3 rounded-full px-3 py-1 text-[6px] uppercase tracking-[0.25em]" style={{ background: '#E0ECDC', color: '#4E7C5F' }}>
          Floral · Outdoor · Romantic
        </div>
      </div>
    </div>
    <div className="h-11 border-t grid grid-cols-4" style={{ background: '#EDF4EA', borderColor: '#CFDDCC' }}>
      {['Story', 'Photos', 'Venue', 'RSVP'].map(s => (
        <div key={s} className="flex items-center justify-center border-r last:border-0" style={{ borderColor: '#CFDDCC' }}>
          <span className="text-[6px] uppercase tracking-[0.24em]" style={{ color: '#4E7C5F' }}>{s}</span>
        </div>
      ))}
    </div>
  </div>
);

const TEMPLATE_PREVIEWS: Record<string, React.FC> = {
  'modern-luxe': ModernLuxePreview,
  'editorial-romance': EditorialRomancePreview,
  'timeless-classic': TimelessClassicPreview,
  'destination-minimal': DestinationMinimalPreview,
  'bold-contemporary': BoldContemporaryPreview,
  'photo-storytelling': PhotoStorytellingPreview,
  'floral-garden': FloralGardenPreview,
};

function TemplatePreview({ templateId }: { templateId: string }) {
  const Preview = TEMPLATE_PREVIEWS[templateId];
  if (Preview) return <Preview />;
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
      <span className="text-gray-400 text-xs">Preview</span>
    </div>
  );
}

const THEME_DOTS: Record<string, string[]> = {
  'modern-luxe': ['#1C1917', '#C8A96E', '#FAF9F7'],
  'editorial-romance': ['#2D2926', '#B08860', '#F8F5F1'],
  'timeless-classic': ['#1A2B4A', '#C4983C', '#FDFBF6'],
  'destination-minimal': ['#1E5F6F', '#4BAABC', '#F3F8FA'],
  'bold-contemporary': ['#1C1917', '#C8A96E', '#FAF9F7'],
  'photo-storytelling': ['#B5546A', '#D4956A', '#FDF7F4'],
  'floral-garden': ['#4E7C5F', '#C47A4A', '#F6F8F3'],
};

const FONT_LABELS: Record<string, string> = {
  'Playfair Display': 'Playfair',
  'Cormorant Garamond': 'Cormorant',
  'EB Garamond': 'Garamond',
  'DM Serif Display': 'DM Serif',
  'Syne': 'Syne',
  'Libre Baskerville': 'Baskerville',
  'Gilda Display': 'Gilda',
};

export const TemplateGalleryPanel: React.FC<TemplateGalleryPanelProps> = ({ onSaveRequest }) => {
  const { state, dispatch } = useBuilderContext();
  const [activeFilter, setActiveFilter] = useState<TemplateMoodTag | 'all'>('all');
  const [activeColorFilter, setActiveColorFilter] = useState<ColorFilter>('all');
  const [activeSeasonFilter, setActiveSeasonFilter] = useState<SeasonFilter>('all');
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<BuilderTemplateDefinition | null>(null);
  const [detailsTemplate, setDetailsTemplate] = useState<BuilderTemplateDefinition | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  const templates = getAllTemplatePacks();

  const recommendedTemplates = useMemo(() => {
    const usage = readTemplateUsage();

    const byUsage = templates
      .filter((t) => (usage[t.id] || 0) > 0)
      .sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0));

    const fallback = RECOMMENDED_TEMPLATE_IDS
      .map(id => templates.find(t => t.id === id))
      .filter((t): t is BuilderTemplateDefinition => Boolean(t));

    const merged = [...byUsage, ...fallback].reduce<BuilderTemplateDefinition[]>((acc, t) => {
      if (!acc.find(x => x.id === t.id)) acc.push(t);
      return acc;
    }, []);

    return (merged.length > 0 ? merged : templates).slice(0, 4);
  }, [templates]);

  const filtered = templates.filter((t) => {
    const moodOk = activeFilter === 'all' || t.moodTags.includes(activeFilter);
    const firstDot = (THEME_DOTS[t.id] || ['#999999'])[0];
    const colorClass = classifyColor(firstDot);
    const colorOk = activeColorFilter === 'all' || colorClass === activeColorFilter;
    const seasonClass = inferSeason(t);
    const seasonOk = activeSeasonFilter === 'all' || seasonClass === activeSeasonFilter;
    return moodOk && colorOk && seasonOk;
  });

  const currentTemplateId = state.project?.templateId;
  const activePage = selectActivePage(state);

  const handleApplyTemplate = useCallback(async (template: BuilderTemplateDefinition) => {
    if (!activePage) return;
    setApplyingTemplateId(template.id);

    try {
      const existingTypes = new Set(activePage.sections.map(s => s.type));
      const baseSections = template.sectionComposition.map((slot, idx) =>
        createBuilderSectionFromLibrary(slot.type, slot.variant, idx)
      );

      const mergedSections = preserveContentAcrossTemplate(activePage.sections, baseSections);

      const newSectionTypes = template.sectionComposition
        .filter(slot => !existingTypes.has(slot.type))
        .map(slot => slot.type.charAt(0).toUpperCase() + slot.type.slice(1));
      const preservedTypes = template.sectionComposition
        .filter(slot => existingTypes.has(slot.type))
        .map(slot => slot.type.charAt(0).toUpperCase() + slot.type.slice(1));

      dispatch(builderActions.applyTemplate(template.id, mergedSections));
      dispatch(builderActions.applyTheme(template.defaultThemeId));
      bumpTemplateUsage(template.id);
      setConfirmTemplate(null);
      setApplyResult({
        templateName: template.displayName,
        newSections: newSectionTypes,
        preservedSections: preservedTypes,
      });

      if (onSaveRequest) {
        setTimeout(onSaveRequest, 100);
      }
    } finally {
      setApplyingTemplateId(null);
    }
  }, [activePage, dispatch, onSaveRequest]);

  if (!state.templateGalleryOpen && !applyResult) return null;

  if (applyResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={() => setApplyResult(null)} />
        <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">"{applyResult.templateName}" applied</h3>
          <p className="text-sm text-gray-500 mb-5">Your site layout and theme have been updated.</p>

          {applyResult.preservedSections.length > 0 && (
            <div className="mb-3 text-left bg-green-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-700 mb-2">Content preserved from before:</p>
              <ul className="space-y-1">
                {applyResult.preservedSections.map(s => (
                  <li key={s} className="text-xs text-green-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {applyResult.newSections.length > 0 && (
            <div className="mb-5 text-left bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-2">New sections added:</p>
              <ul className="space-y-1">
                {applyResult.newSections.map(s => (
                  <li key={s} className="text-xs text-blue-600 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400 mb-5">
            Undo instantly with <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">⌘Z</kbd>
          </p>

          <button
            onClick={() => setApplyResult(null)}
            className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Got it — continue editing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => dispatch(builderActions.closeTemplateGallery())} />
      <div className="relative ml-auto w-full max-w-4xl bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Template Gallery</h2>
            <p className="text-sm text-gray-400 mt-0.5">Choose a visual identity for your wedding site</p>
          </div>
          <button
            onClick={() => dispatch(builderActions.closeTemplateGallery())}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-7 py-3 border-b border-gray-50 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto">
            {MOOD_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeFilter === f.id
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500">Color</span>
            {COLOR_FILTERS.map((f) => (
              <button
                key={`color-${f}`}
                onClick={() => setActiveColorFilter(f)}
                className={`px-2.5 py-1 rounded-full border transition-colors ${
                  activeColorFilter === f
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500">Season</span>
            {SEASON_FILTERS.map((f) => (
              <button
                key={`season-${f}`}
                onClick={() => setActiveSeasonFilter(f)}
                className={`px-2.5 py-1 rounded-full border transition-colors ${
                  activeSeasonFilter === f
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          <div className="mb-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Recommended templates</div>
            <div className="flex flex-wrap gap-2">
              {recommendedTemplates.map((template) => (
                <button
                  key={`recommended-${template.id}`}
                  onClick={() => setConfirmTemplate(template)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    template.id === currentTemplateId
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {template.displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {filtered.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isCurrent={template.id === currentTemplateId}
                isApplying={applyingTemplateId === template.id}
                onApply={() => setConfirmTemplate(template)}
                onDetails={() => setDetailsTemplate(template)}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400 text-sm">
              No templates match this filter.
            </div>
          )}
        </div>
      </div>

      {detailsTemplate && (
        <TemplateDetailsModal
          template={detailsTemplate}
          onApply={() => {
            setDetailsTemplate(null);
            setConfirmTemplate(detailsTemplate);
          }}
          onClose={() => setDetailsTemplate(null)}
        />
      )}

      {confirmTemplate && (
        <TemplateConfirmModal
          template={confirmTemplate}
          isApplying={applyingTemplateId === confirmTemplate.id}
          onConfirm={() => handleApplyTemplate(confirmTemplate)}
          onCancel={() => setConfirmTemplate(null)}
        />
      )}
    </div>
  );
};

interface TemplateCardProps {
  template: BuilderTemplateDefinition;
  isCurrent: boolean;
  isApplying: boolean;
  onApply: () => void;
  onDetails: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, isCurrent, isApplying, onApply, onDetails }) => {
  const [hovered, setHovered] = useState(false);
  const dots = THEME_DOTS[template.id] || ['#999', '#ccc', '#fff'];
  const fontLabel = FONT_LABELS[template.suggestedFonts.heading] || template.suggestedFonts.heading;

  return (
    <div
      className={`group rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
        isCurrent
          ? 'border-rose-400 shadow-lg shadow-rose-100/60'
          : hovered
          ? 'border-gray-300 shadow-lg shadow-gray-100/80'
          : 'border-gray-100 shadow-sm'
      }`}
      onClick={onApply}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
        <TemplatePreview templateId={template.id} />

        <div className={`absolute inset-0 transition-opacity duration-200 ${hovered && !isCurrent ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'rgba(0,0,0,0.15)' }}
        />

        {isCurrent && (
          <div className="absolute top-2.5 right-2.5 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md">
            <Check size={11} />
          </div>
        )}
        {template.isPremium && !template.isNew && (
          <div className="absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1 shadow-sm"
            style={{ background: 'rgba(200,169,110,0.95)', color: '#2D1F00' }}>
            <Crown size={8} />
            Premium
          </div>
        )}
        {template.isNew && (
          <div className="absolute top-2.5 left-2.5 bg-blue-500 text-white rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm flex items-center gap-1">
            <Zap size={8} />
            New
          </div>
        )}

        {hovered && !isCurrent && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/95 text-gray-900 text-xs font-semibold px-4 py-2 rounded-xl shadow-lg">
              Apply Template
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{template.displayName}</h3>
          <div className="flex items-center gap-1 mt-0.5 flex-shrink-0">
            {dots.map((color, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ background: color }} />
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">{template.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {template.moodTags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                {tag}
              </span>
            ))}
          </div>
          <div className="text-[10px] text-gray-400 italic">{fontLabel}</div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={e => { e.stopPropagation(); onDetails(); }}
            className="w-full py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            See details
          </button>
          <button
            onClick={e => { e.stopPropagation(); onApply(); }}
            disabled={isApplying}
            className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
              isCurrent
                ? 'bg-rose-50 text-rose-500 border border-rose-200/80'
                : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]'
            }`}
          >
          {isApplying ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 size={11} className="animate-spin" />
              Applying…
            </span>
          ) : isCurrent ? (
            <span className="flex items-center justify-center gap-1.5">
              <Check size={11} />
              Current Template
            </span>
          ) : 'Apply Template'}
        </button>
      </div>
      </div>
    </div>
  );
};

interface TemplateDetailsModalProps {
  template: BuilderTemplateDefinition;
  onApply: () => void;
  onClose: () => void;
}

const TemplateDetailsModal: React.FC<TemplateDetailsModalProps> = ({ template, onApply, onClose }) => {
  const dots = THEME_DOTS[template.id] || ['#999', '#ccc', '#fff'];
  const sections = template.sectionComposition.slice(0, 6).map((s) => getSectionManifest(s.type).label);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-2xl w-full mx-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{template.displayName}</h3>
            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {template.moodTags.map((tag) => (
                <span key={tag} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{tag}</span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50 aspect-[4/3]">
            <TemplatePreview templateId={template.id} />
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Palette</div>
              <div className="flex gap-1.5">{dots.map((c, i) => <div key={i} className="w-5 h-5 rounded-full border border-gray-200" style={{ background: c }} />)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Includes sections</div>
              <ul className="text-sm text-gray-700 space-y-1">
                {sections.map((label) => <li key={label}>• {label}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">Close</button>
          <button onClick={onApply} className="px-4 py-2 rounded-xl text-sm bg-gray-900 text-white hover:bg-gray-800">Apply template</button>
        </div>
      </div>
    </div>
  );
};

interface TemplateConfirmModalProps {
  template: BuilderTemplateDefinition;
  isApplying: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TemplateConfirmModal: React.FC<TemplateConfirmModalProps> = ({ template, isApplying, onConfirm, onCancel }) => (
  <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
          <div className="w-5 h-5 rounded relative overflow-hidden">
            <TemplatePreview templateId={template.id} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Apply "{template.displayName}"?</h3>
          <p className="text-xs text-gray-400 mt-0.5">This will update your site layout and theme.</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-2.5 p-3 bg-green-50 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-green-700">
            <span className="font-semibold">Preserved:</span> All text, images, and media stay exactly as they are.
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl">
          <RefreshCw className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700">
            <span className="font-semibold">Updated:</span> Section layout and color theme will switch to "{template.displayName}".
          </div>
        </div>
        <p className="text-xs text-gray-400 pl-1">You can undo this immediately with ⌘Z.</p>
      </div>
      <div className="flex gap-3 mt-5">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isApplying}
          className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isApplying ? (
            <span className="flex items-center justify-center gap-1.5">
              <Loader2 size={13} className="animate-spin" />
              Applying…
            </span>
          ) : 'Apply Template'}
        </button>
      </div>
    </div>
  </div>
);
