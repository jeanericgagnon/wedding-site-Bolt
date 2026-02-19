import { SectionType } from '../layoutConfig';

export type BuilderSectionType = SectionType;

export interface BuilderSectionCapabilities {
  draggable: boolean;
  duplicable: boolean;
  deletable: boolean;
  mediaAware: boolean;
  hasSettings: boolean;
  hasBindings: boolean;
  locked: boolean;
}

export interface BuilderSettingsSchema {
  fields: BuilderSettingsField[];
}

export interface BuilderSettingsField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'toggle' | 'select' | 'color' | 'image' | 'number';
  defaultValue?: string | boolean | number;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export interface BuilderBindingsSchema {
  slots: BuilderBindingSlot[];
}

export interface BuilderBindingSlot {
  key: string;
  label: string;
  dataSource: 'venues' | 'schedule' | 'registry' | 'faq' | 'media' | 'none';
  multiple: boolean;
}

export interface BuilderSectionDefinition {
  type: BuilderSectionType;
  label: string;
  icon: string;
  defaultVariant: string;
  supportedVariants: string[];
  settingsSchema: BuilderSettingsSchema;
  bindingsSchema: BuilderBindingsSchema;
  capabilities: BuilderSectionCapabilities;
  previewImagePath: string;
}

export interface BuilderSectionInstance {
  id: string;
  type: BuilderSectionType;
  variant: string;
  enabled: boolean;
  locked: boolean;
  orderIndex: number;
  settings: Record<string, string | boolean | number | undefined>;
  bindings: {
    venueIds?: string[];
    scheduleItemIds?: string[];
    linkIds?: string[];
    faqIds?: string[];
    mediaAssetIds?: string[];
  };
  styleOverrides: BuilderSectionStyleOverrides;
  meta: {
    createdAtISO: string;
    updatedAtISO: string;
  };
}

export interface BuilderSectionStyleOverrides {
  backgroundColor?: string;
  textColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
  fontFamily?: string;
  customCss?: string;
  sideImage?: string;
  sideImagePosition?: 'left' | 'right';
  sideImageSize?: 'sm' | 'md' | 'lg';
  sideImageFit?: 'cover' | 'contain';
}

export interface BuilderDropZoneModel {
  id: string;
  pageId: string;
  accepts: BuilderSectionType[];
  orderIndex: number;
  isEmpty: boolean;
}

export function createDefaultSectionInstance(
  type: BuilderSectionType,
  variant = 'default',
  orderIndex = 0
): BuilderSectionInstance {
  const now = new Date().toISOString();
  return {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    variant,
    enabled: true,
    locked: false,
    orderIndex,
    settings: { showTitle: true },
    bindings: {},
    styleOverrides: {},
    meta: { createdAtISO: now, updatedAtISO: now },
  };
}
