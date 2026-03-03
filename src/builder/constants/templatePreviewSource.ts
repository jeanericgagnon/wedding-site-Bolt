import { getAllTemplates } from '../../templates/registry';

export type TemplatePreviewSource = {
  id: string;
  src: string;
  fallbackSrc: string;
  name: string;
};

const FALLBACK_PREVIEW = '/template-previews/_fallback.svg';

const templatePreviewSources = new Map<string, TemplatePreviewSource>(
  getAllTemplates().map((template) => [
    template.id,
    {
      id: template.id,
      name: template.name,
      src: `/template-previews/${template.id}.webp`,
      fallbackSrc: FALLBACK_PREVIEW,
    },
  ])
);

export const getTemplatePreviewSource = (templateId: string): TemplatePreviewSource => {
  return (
    templatePreviewSources.get(templateId) ?? {
      id: templateId,
      name: templateId,
      src: FALLBACK_PREVIEW,
      fallbackSrc: FALLBACK_PREVIEW,
    }
  );
};

export const getAllTemplatePreviewSources = (): TemplatePreviewSource[] => {
  return Array.from(templatePreviewSources.values());
};
