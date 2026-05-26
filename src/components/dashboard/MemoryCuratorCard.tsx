import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import type { MemoryCuratorModel } from '../../lib/memoryCurator';

interface Props {
  model: MemoryCuratorModel;
}

export const MemoryCuratorCard: React.FC<Props> = ({ model }) => {
  return (
    <Card className="border-rose-200 bg-rose-50/70 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-rose-100 p-2.5">
          <Sparkles className="h-5 w-5 text-rose-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700/80">{model.eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-950">{model.title}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-700">{model.detail}</p>
          {model.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-600">
              {model.badges.map((badge) => (
                <span key={badge} className="rounded-full bg-white px-2.5 py-1 shadow-sm">
                  {badge}
                </span>
              ))}
            </div>
          )}
          {model.nextMoves.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Next best moves</p>
              <ul className="mt-2 space-y-2 text-sm text-neutral-700">
                {model.nextMoves.map((move) => (
                  <li key={move} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                    <span>{move}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
