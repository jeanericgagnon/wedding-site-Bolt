import { BuilderSectionInstance } from './section';
import { ThemeTokens } from '../../lib/themePresets';

export type PublishStatus = 'draft' | 'publishing' | 'published' | 'failed';

export interface BuilderProject {
  id: string;
  weddingId: string;
  templateId: string;
  themeId: string;
  themeTokens?: ThemeTokens;
  globalAnimationPreset?: 'none' | 'fade-in' | 'fade-up' | 'slide-up' | 'zoom-in' | 'stagger';
  pages: BuilderPage[];
  draftVersion: number;
  publishedVersion: number | null;
  publishStatus: PublishStatus;
  lastPublishedAt: string | null;
  meta: {
    createdAtISO: string;
    updatedAtISO: string;
  };
}

export interface BuilderPage {
  id: string;
  title: string;
  slug: string;
  orderIndex: number;
  sections: BuilderSectionInstance[];
  meta: {
    isHome: boolean;
    isHidden: boolean;
  };
}

export function createEmptyBuilderPage(overrides?: Partial<BuilderPage>): BuilderPage {
  return {
    id: generateBuilderId(),
    title: 'Home',
    slug: 'home',
    orderIndex: 0,
    sections: [],
    meta: { isHome: true, isHidden: false },
    ...overrides,
  };
}

export function createEmptyBuilderProject(weddingId: string, templateId = 'modern-luxe'): BuilderProject {
  const now = new Date().toISOString();
  return {
    id: generateBuilderId(),
    weddingId,
    templateId,
    themeId: 'romantic',
    pages: [createEmptyBuilderPage()],
    draftVersion: 1,
    publishedVersion: null,
    publishStatus: 'draft',
    lastPublishedAt: null,
    meta: { createdAtISO: now, updatedAtISO: now },
  };
}

export function generateBuilderId(): string {
  return `bld_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
