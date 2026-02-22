import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Wand2, SlidersHorizontal, ArrowRight } from 'lucide-react';

export const BuilderV2Lab: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-14 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Builder v2 Lab</p>
            <h1 className="text-3xl md:text-4xl font-bold mt-2">Parallel sandbox preview</h1>
            <p className="text-text-secondary mt-2 max-w-2xl">
              Isolated redesign area for a premium builder UX. No production data writes. Use this URL to review the shell, interaction model, and design direction.
            </p>
          </div>
          <Link to="/product" className="text-sm text-primary hover:text-primary-hover inline-flex items-center gap-1">
            Back to Product <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4">
          <aside className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Structure</h2>
            </div>
            <div className="space-y-2">
              {['Hero', 'Story', 'Schedule', 'Travel', 'Registry', 'RSVP'].map((name, idx) => (
                <div key={name} className={`px-3 py-2 rounded-lg border text-sm ${idx === 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-surface-subtle border-border text-text-secondary'}`}>
                  {name}
                </div>
              ))}
            </div>
          </aside>

          <main className="rounded-2xl border border-border bg-surface p-4 min-h-[520px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Canvas</h2>
              <span className="text-xs text-text-tertiary">Preview mode</span>
            </div>
            <div className="h-[460px] rounded-xl border border-border-subtle bg-surface-subtle p-5 flex flex-col gap-4">
              <div className="h-28 rounded-xl bg-white border border-border-subtle" />
              <div className="h-24 rounded-xl bg-white border border-border-subtle" />
              <div className="h-20 rounded-xl bg-white border border-border-subtle" />
              <div className="h-16 rounded-xl bg-white border border-border-subtle" />
            </div>
          </main>

          <aside className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Properties</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border-subtle p-3 bg-surface-subtle">
                <p className="font-medium">Variant</p>
                <p className="text-text-secondary text-xs mt-1">Countdown Focus</p>
              </div>
              <div className="rounded-lg border border-border-subtle p-3 bg-surface-subtle">
                <p className="font-medium">Section Style</p>
                <p className="text-text-secondary text-xs mt-1">Typography, spacing, image fit</p>
              </div>
              <div className="rounded-lg border border-border-subtle p-3 bg-surface-subtle">
                <p className="font-medium">Data Binding</p>
                <p className="text-text-secondary text-xs mt-1">Guest-safe defaults + live content map</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Wand2 className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="font-semibold text-text-primary">V2 direction</p>
            <p className="text-sm text-text-secondary">
              Next steps: command palette, undo/redo timeline, real variant mini-previews, and state-isolated panel architecture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
