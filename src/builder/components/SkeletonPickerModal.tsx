import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { CUSTOM_SKELETONS, CustomSectionSkeleton } from '../../sections/variants/custom/skeletons';

interface SkeletonPickerModalProps {
  onSelect: (skeleton: CustomSectionSkeleton) => void;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  blank: 'Blank',
  announcement: 'Announcements',
  content: 'Content',
  cta: 'Call to Action',
  details: 'Details',
  stats: 'Stats',
  numbers: 'Numbers',
};

const SkeletonThumbnail: React.FC<{ skeleton: CustomSectionSkeleton; selected: boolean }> = ({ skeleton, selected }) => {
  const bg = skeleton.backgroundColor;
  const isDark = (() => {
    const h = bg.replace('#', '');
    if (h.length < 6) return false;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.4;
  })();

  const line = isDark ? 'bg-white/30' : 'bg-stone-300';
  const lineDark = isDark ? 'bg-white/15' : 'bg-stone-200';
  const lineMid = isDark ? 'bg-white/20' : 'bg-stone-250';
  const numColor = isDark ? 'text-white/80' : 'text-gray-700';

  const thumbnails: Record<string, React.ReactNode> = {
    blank: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-2 rounded ${line}`} />
        <div className={`w-24 h-1.5 rounded ${lineDark}`} />
        <div className={`w-20 h-1.5 rounded ${lineDark}`} />
      </div>
    ),
    announcement: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-14 h-1.5 rounded-full border ${isDark ? 'border-white/30' : 'border-stone-300'}`} />
        <div className={`w-20 h-2.5 rounded ${line}`} />
        <div className={`w-24 h-1 rounded ${lineDark}`} />
        <div className={`w-12 h-1 rounded ${lineDark}`} />
        <div className={`w-10 h-5 rounded-full ${line} mt-1`} />
      </div>
    ),
    'notice-banner': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-3" style={{ backgroundColor: bg }}>
        <div className="w-12 h-1.5 rounded-full border border-white/30" />
        <div className="w-24 h-2 rounded bg-white/30" />
        <div className="w-20 h-1 rounded bg-white/15" />
      </div>
    ),
    'date-save': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-1 rounded ${lineDark}`} />
        <div className={`w-24 h-3 rounded ${line}`} />
        <div className={`w-10 h-px ${isDark ? 'bg-white/20' : 'bg-stone-300'}`} />
        <div className={`w-16 h-1.5 rounded ${lineMid ?? line}`} />
        <div className={`w-20 h-1 rounded ${lineDark}`} />
        <div className={`w-12 h-4 rounded-full ${line} mt-1`} />
      </div>
    ),
    'two-column': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-2 rounded ${line} mb-1`} />
        <div className="flex gap-2 w-full px-1">
          <div className="flex-1 flex flex-col gap-1">
            <div className={`h-1.5 rounded ${line}`} />
            <div className={`h-1 rounded ${lineDark}`} />
            <div className={`h-1 rounded ${lineDark}`} />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className={`h-1.5 rounded ${line}`} />
            <div className={`h-1 rounded ${lineDark}`} />
            <div className={`h-1 rounded ${lineDark}`} />
          </div>
        </div>
      </div>
    ),
    'image-text': (
      <div className="w-full h-full flex items-center gap-2 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-12 h-12 rounded-lg ${lineDark} flex-shrink-0`} />
        <div className="flex-1 flex flex-col gap-1">
          <div className={`h-1.5 rounded ${line}`} />
          <div className={`h-1 rounded ${lineDark}`} />
          <div className={`h-1 rounded ${lineDark}`} />
          <div className={`w-8 h-4 rounded-full ${line} mt-1`} />
        </div>
      </div>
    ),
    cta: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-20 h-2.5 rounded ${isDark ? 'bg-white/50' : 'bg-stone-400'}`} />
        <div className={`w-24 h-1 rounded ${isDark ? 'bg-white/25' : 'bg-stone-200'}`} />
        <div className={`w-12 h-5 rounded-full mt-1 ${isDark ? 'border border-white/40' : 'bg-stone-800'}`} />
      </div>
    ),
    'cta-light': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className="w-14 h-1.5 rounded-full border border-stone-300" />
        <div className="w-20 h-2.5 rounded bg-stone-700" />
        <div className="w-24 h-1 rounded bg-stone-200" />
        <div className="w-14 h-5 rounded-full bg-stone-800 mt-1" />
      </div>
    ),
    'info-cards': (
      <div className="w-full h-full flex flex-col items-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-2 rounded ${line} mb-1`} />
        <div className="flex gap-1.5 w-full">
          {[0,1,2].map(i => (
            <div key={i} className={`flex-1 rounded p-1.5 flex flex-col gap-0.5 ${isDark ? 'bg-white/10' : 'bg-white border border-stone-100'}`}>
              <div className={`h-1.5 rounded ${line}`} />
              <div className={`h-1 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'full-width': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-20 h-2.5 rounded ${line}`} />
        <div className={`w-8 h-px ${isDark ? 'bg-white/20' : 'bg-stone-300'}`} />
        <div className={`w-24 h-1 rounded ${lineDark}`} />
        <div className={`w-22 h-1 rounded ${lineDark}`} />
        <div className={`w-20 h-1 rounded ${lineDark}`} />
      </div>
    ),
    'pull-quote': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3" style={{ backgroundColor: bg }}>
        <div className="text-[20px] font-serif leading-none" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }}>"</div>
        <div className={`w-24 h-1.5 rounded ${isDark ? 'bg-white/40' : 'bg-stone-400'}`} />
        <div className={`w-20 h-1 rounded ${isDark ? 'bg-white/25' : 'bg-stone-300'}`} />
        <div className={`w-16 h-1 rounded ${isDark ? 'bg-white/25' : 'bg-stone-300'}`} />
        <div className={`w-12 h-1 rounded ${isDark ? 'bg-white/15' : 'bg-stone-200'} mt-1`} />
      </div>
    ),
    'three-columns': (
      <div className="w-full h-full flex flex-col items-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-2 rounded ${line} mb-1`} />
        <div className="flex gap-1.5 w-full">
          {[0,1,2].map(i => (
            <div key={i} className="flex-1 flex flex-col gap-1 items-center">
              <div className={`h-1.5 rounded w-full ${line}`} />
              <div className={`h-1 rounded w-full ${lineDark}`} />
              <div className={`h-1 rounded w-4/5 ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    details: (
      <div className="w-full h-full flex flex-col items-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-14 h-2 rounded ${line} mb-1`} />
        <div className="grid grid-cols-2 gap-1.5 w-full">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex flex-col gap-0.5 items-center">
              <div className={`h-1.5 w-10 rounded ${line}`} />
              <div className={`h-1 w-12 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    checklist: (
      <div className="w-full h-full flex flex-col justify-center p-3 gap-1" style={{ backgroundColor: bg }}>
        <div className={`w-20 h-2 rounded ${line} mb-1`} />
        {[0,1,2,3].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-sm ${line} flex-shrink-0`} />
            <div className={`flex-1 h-1 rounded ${lineDark}`} />
          </div>
        ))}
      </div>
    ),

    /* ── STATS ── */
    'stat-trio': (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-1.5 rounded ${line} mb-1`} />
        <div className="flex gap-2 w-full">
          {[0,1,2].map(i => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`text-[14px] font-extrabold leading-none ${numColor}`}>{['8','150','1'][i]}</div>
              <div className={`w-full h-1 rounded ${line}`} />
              <div className={`w-3/4 h-0.5 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'stat-dark': (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className="w-20 h-1 rounded bg-white/20 mb-0.5" />
        <div className="w-24 h-2 rounded bg-white/35" />
        <div className="flex gap-2 w-full mt-1">
          {['2017','14','2025','∞'].map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`text-[9px] font-extrabold leading-none text-white/70`}>{n}</div>
              <div className="w-full h-0.5 rounded bg-white/15" />
            </div>
          ))}
        </div>
      </div>
    ),
    'metric-split': (
      <div className="w-full h-full flex items-center gap-3 p-3" style={{ backgroundColor: bg }}>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className={`text-[18px] font-extrabold leading-none ${numColor}`}>2,847</div>
          <div className={`w-full h-1 rounded ${line}`} />
        </div>
        <div className="w-px h-10 bg-stone-200" />
        <div className="flex-1 flex flex-col gap-1">
          <div className={`h-1.5 rounded ${line}`} />
          <div className={`h-1 rounded ${lineDark}`} />
          <div className={`h-1 rounded ${lineDark}`} />
          <div className={`w-8 h-3.5 rounded-full ${line} mt-0.5`} />
        </div>
      </div>
    ),
    'countdown-stats': (
      <div className="w-full h-full flex flex-col items-center justify-center p-2.5 gap-1" style={{ backgroundColor: bg }}>
        <div className="w-12 h-1.5 rounded-full border border-stone-200" />
        <div className={`text-[16px] font-extrabold leading-none ${numColor}`}>47 Days</div>
        <div className={`w-20 h-0.5 rounded ${lineDark}`} />
        <div className={`w-6 h-px bg-stone-300 my-0.5`} />
        <div className="flex gap-2 w-full">
          {['150','5','1'].map(n => (
            <div key={n} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`text-[10px] font-extrabold leading-none ${numColor}`}>{n}</div>
              <div className={`w-full h-0.5 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'numbers-grid': (
      <div className="w-full h-full flex flex-col items-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-1.5 rounded ${line} mb-0.5`} />
        <div className="grid grid-cols-2 gap-2 w-full">
          {['8','23','3','1'].map((n, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`text-[14px] font-extrabold leading-none ${numColor}`}>{n}</div>
              <div className={`w-full h-1 rounded ${line}`} />
              <div className={`w-3/4 h-0.5 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'year-timeline': (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-1.5 rounded ${line} mb-1`} />
        <div className="flex gap-1.5 w-full">
          {['2017','2019','2023','2025'].map((y, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`text-[9px] font-extrabold leading-none ${numColor}`}>{y}</div>
              <div className={`w-full h-0.5 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── NEW STATS ── */
    'stat-wide-bar': (
      <div className="w-full h-full flex items-center justify-center p-2.5" style={{ backgroundColor: bg }}>
        <div className="flex gap-1 w-full">
          {['8','150','23','5','1'].map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 border-r border-white/10 last:border-0">
              <div className="text-[11px] font-extrabold leading-none text-white/80">{n}</div>
              <div className="w-full h-0.5 rounded bg-white/15" />
            </div>
          ))}
        </div>
      </div>
    ),
    'stat-accent': (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-1.5 rounded ${line}`} />
        <div className={`w-20 h-1 rounded ${lineDark}`} />
        <div className="flex gap-2 w-full mt-1">
          {['8','2','150+'].map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`text-[13px] font-extrabold leading-none ${numColor}`}>{n}</div>
              <div className={`w-full h-1 rounded ${line}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'stat-minimal': (
      <div className="w-full h-full flex items-center justify-center p-2.5" style={{ backgroundColor: bg }}>
        <div className="flex gap-1.5 w-full">
          {['06.14','4 PM','150','5'].map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`text-[8px] font-extrabold leading-none ${numColor}`}>{n}</div>
              <div className={`w-full h-0.5 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'stat-bordered': (
      <div className="w-full h-full flex flex-col items-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-1.5 rounded ${line} mb-0.5`} />
        <div className="flex gap-1.5 w-full">
          {['180','7','3'].map((n, i) => (
            <div key={i} className={`flex-1 flex flex-col items-center gap-0.5 rounded border p-1 ${isDark ? 'border-white/15' : 'border-stone-200 bg-white'}`}>
              <div className={`text-[13px] font-extrabold leading-none ${numColor}`}>{n}</div>
              <div className={`w-full h-1 rounded ${line}`} />
              <div className={`w-3/4 h-0.5 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── NEW NUMBERS ── */
    'numbers-dark-grid': (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className="w-20 h-1 rounded bg-white/20 mb-0.5" />
        <div className="w-24 h-2 rounded bg-white/35" />
        <div className="flex gap-2 w-full mt-1">
          {['8','23','150','∞'].map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="text-[10px] font-extrabold leading-none text-white/75">{n}</div>
              <div className="w-full h-0.5 rounded bg-white/15" />
            </div>
          ))}
        </div>
      </div>
    ),
    'single-hero-number': (
      <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-1" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-1 rounded ${lineDark}`} />
        <div className={`text-[24px] font-extrabold leading-none ${numColor}`}>2,847</div>
        <div className={`w-14 h-1 rounded ${lineDark}`} />
        <div className={`w-6 h-px my-0.5 ${isDark ? 'bg-white/20' : 'bg-stone-300'}`} />
        <div className={`w-20 h-1 rounded ${lineDark}`} />
      </div>
    ),
    'number-split-dark': (
      <div className="w-full h-full flex items-center gap-2 p-3" style={{ backgroundColor: bg }}>
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className="text-[20px] font-extrabold leading-none text-white/80">150</div>
          <div className="w-full h-1 rounded bg-white/25" />
        </div>
        <div className="w-px h-10 bg-white/15" />
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-1.5 rounded bg-white/30" />
          <div className="h-1 rounded bg-white/15" />
          <div className="h-1 rounded bg-white/15" />
          <div className="w-8 h-3.5 rounded-full border border-white/30 mt-0.5" />
        </div>
      </div>
    ),
    'numbered-steps': (
      <div className="w-full h-full flex flex-col p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-1.5 rounded ${line} mb-0.5 self-center`} />
        <div className="grid grid-cols-2 gap-1.5 flex-1">
          {['01','02','03','04'].map((n, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className={`text-[11px] font-extrabold leading-none ${numColor}`}>{n}</div>
              <div className={`h-1 rounded ${line}`} />
              <div className={`h-0.5 rounded ${lineDark}`} />
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── NEW ANNOUNCEMENTS ── */
    'change-update': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className="w-12 h-1.5 rounded-full border border-amber-400" />
        <div className="w-22 h-2 rounded bg-amber-600/50" />
        <div className="w-24 h-1 rounded bg-amber-400/30" />
        <div className="w-20 h-1 rounded bg-amber-400/30" />
        <div className="w-16 h-4 rounded-full bg-amber-500/40 mt-1" />
      </div>
    ),
    'welcome-note': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-22 h-2.5 rounded ${line}`} />
        <div className={`w-8 h-px ${isDark ? 'bg-white/20' : 'bg-stone-300'}`} />
        <div className={`w-24 h-1 rounded ${lineDark}`} />
        <div className={`w-20 h-1 rounded ${lineDark}`} />
        <div className={`w-16 h-1 rounded ${lineDark}`} />
        <div className={`w-12 h-1 rounded ${lineDark} mt-0.5`} />
      </div>
    ),
    'late-addition': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className="w-16 h-1.5 rounded-full border border-pink-300" />
        <div className="w-20 h-2.5 rounded bg-pink-400/40" />
        <div className="w-24 h-1 rounded bg-pink-300/30" />
        <div className="w-14 h-4 rounded-full bg-pink-400/30 mt-1" />
      </div>
    ),

    /* ── NEW CONTENT ── */
    'text-right-image': (
      <div className="w-full h-full flex items-center gap-2 p-3" style={{ backgroundColor: bg }}>
        <div className="flex-1 flex flex-col gap-1">
          <div className={`h-1 rounded-full border ${isDark ? 'border-white/25' : 'border-stone-300'} w-10`} />
          <div className={`h-2 rounded ${line} w-full`} />
          <div className={`h-1 rounded ${lineDark}`} />
          <div className={`h-1 rounded ${lineDark} w-4/5`} />
          <div className={`w-10 h-3.5 rounded-full ${line} mt-1`} />
        </div>
        <div className={`w-14 h-14 rounded-lg ${lineDark} flex-shrink-0`} />
      </div>
    ),
    'centered-intro': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-12 h-1.5 rounded-full border ${isDark ? 'border-white/30' : 'border-stone-300'}`} />
        <div className={`w-20 h-2.5 rounded ${line}`} />
        <div className={`w-24 h-1 rounded ${lineDark}`} />
        <div className={`w-20 h-1 rounded ${lineDark}`} />
        <div className={`w-8 h-px ${isDark ? 'bg-white/20' : 'bg-stone-300'} my-0.5`} />
        <div className={`w-16 h-1 rounded ${lineDark}`} />
      </div>
    ),
    'story-timeline': (
      <div className="w-full h-full flex flex-col p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-16 h-1.5 rounded ${line} self-center mb-0.5`} />
        <div className="grid grid-cols-2 gap-1.5 flex-1">
          {['2017','2019','2023','2025'].map((y, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className={`text-[9px] font-bold leading-none ${numColor}`}>{y}</div>
              <div className={`h-1 rounded ${lineDark}`} />
              <div className={`h-1 rounded ${lineDark} w-3/4`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'photo-caption': (
      <div className="w-full h-full flex flex-col items-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-full flex-1 rounded-lg ${lineDark}`} />
        <div className={`w-20 h-2 rounded ${line}`} />
        <div className={`w-24 h-1 rounded ${lineDark}`} />
      </div>
    ),
    'alternating-cols': (
      <div className="w-full h-full flex flex-col p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-14 h-1.5 rounded ${line} self-center mb-0.5`} />
        <div className="flex gap-1.5 flex-1">
          <div className={`w-10 h-full rounded ${lineDark}`} />
          <div className="flex-1 flex flex-col gap-1 justify-center">
            <div className={`h-1.5 rounded ${line}`} />
            <div className={`h-1 rounded ${lineDark}`} />
            <div className={`h-1 rounded ${lineDark} w-3/4`} />
          </div>
        </div>
        <div className="flex gap-1.5 flex-1">
          <div className="flex-1 flex flex-col gap-1 justify-center">
            <div className={`h-1.5 rounded ${line}`} />
            <div className={`h-1 rounded ${lineDark}`} />
            <div className={`h-1 rounded ${lineDark} w-3/4`} />
          </div>
          <div className={`w-10 h-full rounded ${lineDark}`} />
        </div>
      </div>
    ),

    /* ── NEW CTA ── */
    'cta-warm': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className="w-20 h-1 rounded bg-orange-300/50" />
        <div className="w-20 h-2.5 rounded bg-orange-700/50" />
        <div className="w-24 h-1 rounded bg-orange-400/30" />
        <div className="w-16 h-5 rounded-full bg-orange-500/50 mt-1" />
      </div>
    ),
    'cta-split': (
      <div className="w-full h-full flex items-center gap-3 p-3" style={{ backgroundColor: bg }}>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-2.5 rounded bg-white/40 w-full" />
          <div className="h-1 rounded bg-white/20 w-3/4" />
        </div>
        <div className="w-16 h-7 rounded-full border border-white/40 flex-shrink-0" />
      </div>
    ),
    'cta-minimal': (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3" style={{ backgroundColor: bg }}>
        <div className={`w-20 h-2.5 rounded ${line}`} />
        <div className={`w-8 h-px ${isDark ? 'bg-white/20' : 'bg-stone-300'}`} />
        <div className={`w-20 h-1 rounded ${lineDark}`} />
        <div className={`w-10 h-5 rounded-full ${isDark ? 'bg-white/20' : 'bg-stone-800'} mt-1`} />
      </div>
    ),

    /* ── NEW DETAILS ── */
    'faq-simple': (
      <div className="w-full h-full flex flex-col p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-20 h-1.5 rounded ${line} self-center mb-0.5`} />
        <div className="flex gap-2 flex-1">
          <div className="flex-1 flex flex-col gap-1">
            <div className={`h-1.5 rounded ${line}`} />
            <div className={`h-1 rounded ${lineDark}`} />
            <div className={`h-1 rounded ${lineDark} w-3/4`} />
            <div className={`h-1.5 rounded ${line} mt-1`} />
            <div className={`h-1 rounded ${lineDark}`} />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className={`h-1.5 rounded ${line}`} />
            <div className={`h-1 rounded ${lineDark}`} />
            <div className={`h-1.5 rounded ${line} mt-1`} />
            <div className={`h-1 rounded ${lineDark}`} />
            <div className={`h-1 rounded ${lineDark} w-3/4`} />
          </div>
        </div>
      </div>
    ),
    'two-col-details': (
      <div className="w-full h-full flex flex-col p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-14 h-1.5 rounded ${line} self-center mb-0.5`} />
        <div className="flex gap-2 flex-1">
          {[0, 1].map(i => (
            <div key={i} className="flex-1 flex flex-col gap-1">
              <div className={`h-1.5 rounded ${line}`} />
              <div className={`h-1 rounded ${lineDark}`} />
              <div className={`h-1 rounded ${lineDark}`} />
              <div className={`h-1 rounded ${lineDark} w-3/4`} />
              <div className={`w-10 h-3 rounded-full ${line} mt-0.5`} />
            </div>
          ))}
        </div>
      </div>
    ),
    'contact-block': (
      <div className="w-full h-full flex flex-col items-center p-3 gap-1.5" style={{ backgroundColor: bg }}>
        <div className={`w-12 h-2 rounded ${line}`} />
        <div className={`w-24 h-1 rounded ${lineDark}`} />
        <div className="flex gap-2 w-full mt-1">
          {[0, 1].map(i => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`h-1.5 rounded ${line} w-full`} />
              <div className={`h-1 rounded ${lineDark} w-full`} />
              <div className={`h-1 rounded ${lineDark} w-3/4`} />
            </div>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <div className={`w-full aspect-[4/3] rounded-lg overflow-hidden transition-all ${
      selected ? 'ring-2 ring-rose-500 ring-offset-1' : ''
    }`}>
      {thumbnails[skeleton.thumbnail] ?? (
        <div className="w-full h-full" style={{ backgroundColor: bg }} />
      )}
    </div>
  );
};

const CATEGORIES = ['blank', 'stats', 'numbers', 'announcement', 'content', 'cta', 'details'] as const;

export const SkeletonPickerModal: React.FC<SkeletonPickerModalProps> = ({ onSelect, onClose }) => {
  const [selected, setSelected] = useState<string>(CUSTOM_SKELETONS[0].id);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = activeCategory === 'all'
    ? CUSTOM_SKELETONS
    : CUSTOM_SKELETONS.filter(s => s.category === activeCategory);

  const selectedSkeleton = CUSTOM_SKELETONS.find(s => s.id === selected) ?? CUSTOM_SKELETONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Choose a Section Layout</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pick a skeleton to start from — you can customize everything</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-1.5 px-6 pt-4 pb-2 flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {filtered.map(skeleton => (
              <button
                key={skeleton.id}
                onClick={() => setSelected(skeleton.id)}
                className={`group text-left rounded-xl overflow-hidden border-2 transition-all ${
                  selected === skeleton.id
                    ? 'border-rose-500 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <SkeletonThumbnail skeleton={skeleton} selected={selected === skeleton.id} />
                <div className="px-3 py-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{skeleton.label}</span>
                    {selected === skeleton.id && (
                      <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                        <Check size={9} className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{skeleton.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Selected: <span className="font-medium text-gray-600">{selectedSkeleton.label}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSelect(selectedSkeleton)}
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Add Section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
