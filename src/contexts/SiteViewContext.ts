import { createContext, useContext } from 'react';

export interface SiteViewContextValue {
  weddingSiteId: string | null;
}

export const SiteViewContext = createContext<SiteViewContextValue>({ weddingSiteId: null });

export function useSiteView() {
  return useContext(SiteViewContext);
}
