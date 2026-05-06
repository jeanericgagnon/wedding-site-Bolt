import React from 'react';

export const SectionTypePreview: React.FC<{ sectionType: string; compact?: boolean }> = ({ sectionType, compact = false }) => {
  const previews: Record<string, React.ReactNode> = {
    hero: (
      <div className="w-full h-16 relative flex flex-col items-center justify-center bg-slate-700">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex flex-col items-center gap-1">
          <div className="text-[7px] text-white/50st font-medium">We are getting married</div>
          <div className="text-[13px] font-bold text-white">Sarah & James</div>
          <div className="text-[7px] text-white/60">June 14, 2025 · New York</div>
          <div className="mt-0.5 px-2.5 py-0.5 border border-white/40 rounded text-[7px] text-white/80 font-semibold">Send RSVP</div>
        </div>
      </div>
    ),
    story: (
      <div className="w-full h-16 flex bg-gray-50">
        <div className="flex-1 flex flex-col justify-center gap-1 px-3">
          <div className="text-[7px] text-gray-400st">Our Story</div>
          <div className="h-1 rounded-sm bg-gray-700 w-20" />
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-300 w-4/5" />
          <div className="h-0.5 rounded-sm bg-gray-300 w-3/5" />
        </div>
        <div className="w-2/5 bg-gray-300" />
      </div>
    ),
    venue: (
      <div className="w-full h-16 flex flex-col bg-white">
        <div className="h-8 w-full relative bg-slate-200">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px)' }} />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-red-400" />
        </div>
        <div className="flex-1 flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
          <div className="flex-1 h-1 rounded-sm bg-gray-200" />
        </div>
      </div>
    ),
    schedule: (
      <div className="w-full h-16 flex flex-col justify-center px-3 gap-0 bg-gray-50">
        <div className="text-[7px] text-gray-400st mb-1">Schedule</div>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-start gap-1.5 py-0.5">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-gray-700' : 'bg-gray-300'}`} />
              {i < 2 && <div className="w-px h-2 bg-gray-200" />}
            </div>
            <div className="flex-1 flex items-center gap-1 pt-0.5">
              <div className={`h-1 rounded-sm flex-1 ${i === 0 ? 'bg-gray-600' : 'bg-gray-200'}`} />
              <div className="text-[6px] text-gray-400 font-mono">{['4pm','5pm','7pm'][i]}</div>
            </div>
          </div>
        ))}
      </div>
    ),
    travel: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400st">Travel details</div>
        {[0,1].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
            <div className="flex-1 h-1 rounded-sm bg-gray-200" />
            <div className="w-8 h-3 rounded text-[6px] flex items-center justify-center font-semibold bg-gray-100 text-gray-500 border border-gray-200">BOOK</div>
          </div>
        ))}
      </div>
    ),
    registry: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-gray-50">
        <div className="text-[7px] text-gray-400st">Registry</div>
        {[0,1].map(i => (
          <div key={i} className="h-5 rounded-lg flex items-center px-2 gap-2 bg-white border border-gray-200">
            <div className="w-2.5 h-2.5 rounded-sm bg-gray-200 flex-shrink-0" />
            <div className="flex-1 h-1 rounded-sm bg-gray-200" />
            <div className="w-8 h-3 rounded text-[6px] flex items-center justify-center font-semibold bg-gray-700 text-white">View</div>
          </div>
        ))}
      </div>
    ),
    faq: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400st">FAQ</div>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center justify-between px-1.5 py-0.5 rounded border border-gray-100 bg-gray-50">
            <div className={`h-1.5 rounded-sm ${i === 0 ? 'w-20 bg-gray-600' : 'w-16 bg-gray-300'}`} />
            <div className="text-[9px] font-bold text-gray-400">{i === 0 ? '−' : '+'}</div>
          </div>
        ))}
      </div>
    ),
    rsvp: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-gray-50">
        <div className="h-4 rounded-md border border-gray-200 bg-white flex items-center px-2">
          <div className="flex-1 h-0.5 rounded-sm bg-gray-200" />
        </div>
        <div className="flex gap-1">
          <div className="flex-1 h-4 rounded-md border border-gray-200 bg-white flex items-center px-1.5 gap-1">
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="text-[6px] text-gray-500 font-medium">Yes</div>
          </div>
          <div className="flex-1 h-4 rounded-md border border-gray-200 bg-white flex items-center px-1.5 gap-1">
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <div className="text-[6px] text-gray-400 font-medium">No</div>
          </div>
        </div>
        <div className="h-4 rounded-md bg-gray-700 flex items-center justify-center">
          <div className="text-[7px] text-white font-semibold">SEND RSVP</div>
        </div>
      </div>
    ),
    gallery: (
      <div className="w-full h-16 flex items-start gap-0.5 px-1.5 pt-1.5 pb-1 bg-gray-50">
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-7 rounded-sm bg-gray-300" />
          <div className="h-4 rounded-sm bg-gray-200" />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-4 rounded-sm bg-gray-200" />
          <div className="h-6 rounded-sm bg-gray-300" />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-5 rounded-sm bg-gray-300" />
          <div className="h-5 rounded-sm bg-gray-200" />
        </div>
      </div>
    ),
    countdown: (
      <div className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-gray-50">
        <div className="text-[7px] text-gray-400st">Counting down</div>
        <div className="flex items-end gap-1.5">
          {[{n:'47',l:'Days'},{n:'12',l:'Hrs'},{n:'38',l:'Min'}].map(({n,l}) => (
            <div key={l} className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold bg-gray-800 text-white">{n}</div>
              <div className="text-[5px] mt-0.5 text-gray-400 font-medium">{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    'wedding-party': (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-2 bg-gray-50">
        <div className="text-[7px] text-gray-400st text-center">Wedding Party</div>
        <div className="flex justify-center gap-1.5">
          {[0,1,2,3].map(i => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full ${i < 2 ? 'bg-gray-300' : 'bg-gray-200'}`} />
              <div className="w-5 h-0.5 rounded-sm bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    ),
    'dress-code': (
      <div className="w-full h-16 flex bg-gray-50">
        <div className="w-1 h-full bg-gray-500" />
        <div className="flex-1 flex flex-col justify-center gap-0.5 px-2">
          <div className="text-[6px] text-gray-400st">What to wear</div>
          <div className="text-[10px] font-bold text-gray-800">Black Tie</div>
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-4/5" />
        </div>
        <div className="w-10 flex items-center justify-center pr-1">
          <div className="w-7 h-8 rounded-sm bg-gray-200 border border-gray-300 flex items-end justify-center pb-0.5">
            <div className="w-3.5 h-5 rounded-t-full bg-gray-300" />
          </div>
        </div>
      </div>
    ),
    accommodations: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400st">Accommodations</div>
        {[0,1].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-sm bg-gray-300 flex-shrink-0" />
            <div className="flex-1 h-1 rounded-sm bg-gray-200" />
            <div className="w-8 h-3 rounded text-[6px] flex items-center justify-center font-semibold bg-gray-100 text-gray-500 border border-gray-200">Book</div>
          </div>
        ))}
      </div>
    ),
    contact: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400st">Need help?</div>
        <div className="flex gap-2">
          {[0,1].map(i => (
            <div key={i} className="flex-1 h-8 rounded-lg p-1.5 flex flex-col gap-0.5 bg-gray-50 border border-gray-100">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
            </div>
          ))}
        </div>
      </div>
    ),
    'footer-cta': (
      <div className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-gray-800">
        <div className="text-[7px] text-white/50">We hope to celebrate with you</div>
        <div className="text-[10px] font-bold text-white">Sarah & James</div>
        <div className="px-3 py-0.5 border border-white/30 rounded-full text-[7px] text-white/70 font-semibold">Send RSVP</div>
      </div>
    ),
    custom: (
      <div className="w-full h-16 bg-amber-50 flex flex-col px-2.5 pt-2 pb-1.5 gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2 rounded-sm bg-amber-400 w-14" />
          <div className="h-1 rounded-sm bg-amber-200 flex-1" />
        </div>
        <div className="flex gap-1.5 flex-1">
          <div className="flex-1 flex flex-col gap-1 border border-dashed border-amber-300 rounded p-1">
            <div className="h-1 rounded-sm bg-amber-300 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-3/4" />
            <div className="mt-auto h-2 rounded bg-amber-400 w-8" />
          </div>
          <div className="flex-1 flex flex-col gap-1 border border-dashed border-amber-300 rounded p-1">
            <div className="h-2.5 rounded-sm bg-amber-200 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-2/3" />
          </div>
          <div className="flex-1 flex flex-col gap-1 border border-dashed border-amber-300 rounded p-1">
            <div className="text-[9px] font-black text-amber-600 leading-none">42</div>
            <div className="h-1 rounded-sm bg-amber-300 w-full" />
            <div className="h-1 rounded-sm bg-amber-200 w-3/4" />
          </div>
        </div>
      </div>
    ),
    quotes: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-gray-50">
        <div className="text-[7px] text-gray-400st">Notes from loved ones</div>
        <div className="flex flex-col gap-0.5">
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-4/5" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-3/5" />
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          <div className="h-0.5 w-12 rounded-sm bg-gray-300" />
        </div>
      </div>
    ),
    menu: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-white">
        <div className="text-[7px] text-gray-400st">Dinner and drinks</div>
        <div className="flex gap-1">
          {['Starter','Main','Dessert'].map(c => (
            <div key={c} className="flex-1 h-3 rounded text-[5px] flex items-center justify-center bg-gray-100 text-gray-500 border border-gray-200 font-medium">{c}</div>
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-3/4" />
        </div>
      </div>
    ),
    music: (
      <div className="w-full h-16 flex flex-col justify-center gap-1 px-3 bg-gray-900">
        <div className="text-[7px] text-gray-400st">Music</div>
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center gap-1">
            <div className="text-[6px] text-gray-500 w-3 text-right">{i+1}</div>
            <div className={`flex-1 h-0.5 rounded-sm ${i === 0 ? 'bg-gray-300' : 'bg-gray-600'}`} />
            <div className="w-4 h-0.5 rounded-sm bg-gray-600" />
          </div>
        ))}
      </div>
    ),
    directions: (
      <div className="w-full h-16 flex bg-white">
        <div className="flex-1 flex flex-col justify-center gap-1 px-2">
          <div className="text-[7px] text-gray-400st">Directions</div>
          <div className="h-0.5 rounded-sm bg-gray-300 w-full" />
          <div className="h-0.5 rounded-sm bg-gray-200 w-4/5" />
          <div className="w-8 h-2.5 rounded text-[5px] flex items-center justify-center bg-gray-700 text-white font-semibold mt-0.5">View map</div>
        </div>
        <div className="w-2/5 relative bg-slate-200">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px), repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 5px)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-red-400" />
        </div>
      </div>
    ),
    video: (
      <div className="w-full h-16 flex flex-col items-center justify-center gap-1 bg-gray-900">
        <div className="text-[7px] text-gray-400st">Video</div>
        <div className="w-8 h-8 rounded-md bg-gray-700 flex items-center justify-center border border-gray-600">
          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-white/70 ml-0.5" />
        </div>
      </div>
    ),
  };

  const preview = previews[sectionType] ?? <div className="w-full h-16 bg-gray-100" />;
  if (compact) {
    return <div className="w-full h-10 overflow-hidden">{preview}</div>;
  }
  return <>{preview}</>;
};
