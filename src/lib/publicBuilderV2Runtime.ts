import type { BuilderPage } from '../types/builder/project';
import type { BuilderV2Document } from '../builder-v2/contracts';
import { builderV2DocumentToBuilderPages } from '../builder-v2/adapter';

export const getPublicBuilderPagesFromV2Document = (document: BuilderV2Document): BuilderPage[] => (
  builderV2DocumentToBuilderPages(document, document.updatedAtISO)
);
