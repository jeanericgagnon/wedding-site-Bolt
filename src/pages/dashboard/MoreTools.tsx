import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Home, MoreHorizontal, Pin, PinOff } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import {
  DASHBOARD_HOME_PIN_STORAGE_KEY,
  DASHBOARD_NAV_PIN_STORAGE_KEY,
  DASHBOARD_TOOL_GROUPS,
  PINNABLE_NAV_TOOL_IDS,
  readStoredToolPins,
  writeStoredToolPins,
  type DashboardToolId,
} from './dashboardToolLibrary';

function togglePin(ids: DashboardToolId[], id: DashboardToolId) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export const DashboardMoreTools: React.FC = () => {
  const [navPins, setNavPins] = useState<DashboardToolId[]>([]);
  const [homePins, setHomePins] = useState<DashboardToolId[]>([]);

  useEffect(() => {
    const sync = () => {
      setNavPins(readStoredToolPins(DASHBOARD_NAV_PIN_STORAGE_KEY));
      setHomePins(readStoredToolPins(DASHBOARD_HOME_PIN_STORAGE_KEY));
    };
    sync();
    window.addEventListener('dayof:dashboard-tool-pins-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('dayof:dashboard-tool-pins-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const navPinSet = useMemo(() => new Set(navPins), [navPins]);
  const homePinSet = useMemo(() => new Set(homePins), [homePins]);

  return (
    <DashboardLayout currentPage="tools">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="border-b border-border-subtle pb-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">More Tools</p>
            <h1 className="mt-3 font-serif text-4xl font-normal leading-tight text-text-primary md:text-5xl">
              Keep your workspace focused.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
              Bring forward the tools you use often, and leave the rest neatly organized.
            </p>
          </div>
        </section>

        {DASHBOARD_TOOL_GROUPS.map((group) => (
          <section key={group.title} className="space-y-4">
            <div className="max-w-2xl">
              <h2 className="font-serif text-2xl font-normal text-text-primary">{group.title}</h2>
              <p className="mt-1 text-sm leading-6 text-text-secondary">{group.description}</p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border-subtle bg-white shadow-sm">
              {group.tools.map((tool, index) => {
                const Icon = tool.icon;
                const canShowInNav = tool.canPinToNav && PINNABLE_NAV_TOOL_IDS.includes(tool.id);
                const isShownInSidebar = navPinSet.has(tool.id);
                const isShownOnHome = homePinSet.has(tool.id);

                return (
                  <div key={tool.id} className={`grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${index > 0 ? 'border-t border-border-subtle' : ''}`}>
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-text-primary">{tool.name}</h3>
                          <span className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-text-tertiary">{tool.primaryHome}</span>
                          {tool.adminOnly && <span className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-text-tertiary">Admin only</span>}
                        </div>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">{tool.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Link to={tool.path} className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-primary-hover">
                        {tool.actionLabel}
                      </Link>
                      <div className="flex flex-col gap-2 text-sm">
                        <button
                          type="button"
                          disabled={!canShowInNav}
                          onClick={() => writeStoredToolPins(DASHBOARD_NAV_PIN_STORAGE_KEY, togglePin(navPins, tool.id))}
                          className={`inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            isShownInSidebar
                              ? 'border-primary/25 bg-primary/10 text-primary'
                              : 'border-border-subtle bg-white text-text-tertiary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40'
                          }`}
                        >
                          {isShownInSidebar ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          <span>{canShowInNav ? (isShownInSidebar ? 'Keep tucked away' : 'Show in sidebar') : 'Stays in More Tools'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={!tool.canPinToHome}
                          onClick={() => writeStoredToolPins(DASHBOARD_HOME_PIN_STORAGE_KEY, togglePin(homePins, tool.id))}
                          className={`inline-flex min-h-[38px] items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            isShownOnHome
                              ? 'border-primary/25 bg-primary/10 text-primary'
                              : 'border-border-subtle bg-white text-text-tertiary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40'
                          }`}
                        >
                          {isShownOnHome ? <Check className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                          <span>{tool.canPinToHome ? (isShownOnHome ? 'Added to Home' : 'Add to Home') : 'Home shortcut unavailable'}</span>
                        </button>
                        <details className="group">
                          <summary className="inline-flex min-h-[34px] cursor-pointer list-none items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-subtle">
                            <MoreHorizontal className="h-4 w-4" />
                            More actions
                          </summary>
                          <div className="mt-2 rounded-lg border border-border-subtle bg-surface-subtle/40 p-2 text-xs text-text-secondary">
                            <button type="button" className="block w-full rounded px-2 py-1.5 text-left hover:bg-white" onClick={() => writeStoredToolPins(DASHBOARD_NAV_PIN_STORAGE_KEY, navPins.filter((id) => id !== tool.id))}>Remove from sidebar</button>
                            <button type="button" className="block w-full rounded px-2 py-1.5 text-left hover:bg-white" onClick={() => writeStoredToolPins(DASHBOARD_HOME_PIN_STORAGE_KEY, homePins.filter((id) => id !== tool.id))}>Remove from Home</button>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default DashboardMoreTools;
