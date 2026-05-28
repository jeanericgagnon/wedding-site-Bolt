import { BUILDER_WORKSPACE_ROUTES } from '../../lib/builderWorkspaceRoutes';
import { getBuilderLaunchChecklistRoute } from '../builderCutoverRoute';

export interface OverviewChecklistStats {
  coupleName1: string;
  coupleName2: string;
  weddingDate: string;
  venueName: string;
  venueLocation: string;
  registryItemCount: number;
  photoAlbumCount: number;
  isPublished: boolean;
  siteSlug: string;
  templateName: string;
}

export interface ChecklistItemDef {
  id: string;
  label: string;
  done: boolean;
  actionLabel: string;
  route: string;
  action?: () => void;
}

export const getPublishBuilderRoute = (isPublished: boolean): string =>
  isPublished ? BUILDER_WORKSPACE_ROUTES.defaultEditor : getBuilderLaunchChecklistRoute();

export const getOverviewPublishActionLabel = (isPublished: boolean): string =>
  isPublished ? 'Open site editor' : 'Open launch review';

export const buildSetupChecklist = (stats: OverviewChecklistStats): ChecklistItemDef[] => [
  {
    id: 'names',
    label: 'Add couple names',
    done: Boolean(stats.coupleName1 && stats.coupleName2),
    actionLabel: 'Edit settings',
    route: '/dashboard/settings',
  },
  {
    id: 'date',
    label: 'Set wedding date',
    done: Boolean(stats.weddingDate),
    actionLabel: 'Edit date',
    route: '/dashboard/settings',
  },
  {
    id: 'venue',
    label: 'Add venue/address',
    done: Boolean(stats.venueName || stats.venueLocation),
    actionLabel: 'Add venue',
    route: '/dashboard/settings',
  },
  {
    id: 'registry',
    label: 'Add at least 1 registry item',
    done: stats.registryItemCount > 0,
    actionLabel: 'Open registry',
    route: '/dashboard/registry',
  },
  {
    id: 'photos',
    label: 'Create first photo sharing album',
    done: stats.photoAlbumCount > 0,
    actionLabel: 'Open photos',
    route: '/dashboard/photos',
  },
  {
    id: 'publish',
    label: 'Share with guests once',
    done: stats.isPublished,
    actionLabel: getOverviewPublishActionLabel(stats.isPublished),
    route: getPublishBuilderRoute(stats.isPublished),
  },
];

export const buildPublishReadinessItems = (stats: OverviewChecklistStats): ChecklistItemDef[] => [
  {
    id: 'names',
    label: 'Couple names are filled in',
    done: Boolean(stats.coupleName1 && stats.coupleName2),
    actionLabel: 'Open settings',
    route: '/dashboard/settings',
  },
  {
    id: 'date',
    label: 'Wedding date is set',
    done: Boolean(stats.weddingDate),
    actionLabel: 'Set date',
    route: '/dashboard/settings',
  },
  {
    id: 'venue',
    label: 'Venue details are ready',
    done: Boolean(stats.venueName || stats.venueLocation),
    actionLabel: 'Add venue',
    route: '/dashboard/settings',
  },
  {
    id: 'slug',
    label: 'Website URL is set',
    done: Boolean(stats.siteSlug),
    actionLabel: 'Open settings',
    route: '/dashboard/settings',
  },
  {
    id: 'template',
    label: 'Design is chosen',
    done: Boolean(stats.templateName),
    actionLabel: 'Open templates',
    route: '/templates',
  },
  {
    id: 'published',
    label: 'Website has been shared with guests once',
    done: Boolean(stats.isPublished),
    actionLabel: getOverviewPublishActionLabel(stats.isPublished),
    route: getPublishBuilderRoute(stats.isPublished),
  },
];

export const getFirstIncompleteChecklistItem = (items: ChecklistItemDef[]): ChecklistItemDef | null => {
  return items.find((item) => !item.done) ?? null;
};

export const getChecklistProgress = (items: ChecklistItemDef[]): { done: number; total: number } => ({
  done: items.filter((item) => item.done).length,
  total: items.length,
});

export const getIncompleteChecklistItems = (items: ChecklistItemDef[]): ChecklistItemDef[] =>
  items.filter((item) => !item.done);

export const getArchivePhotoMemoryCopy = () => ({
  cardDetail: 'Review shared guest photos and turn the best moments into a slideshow keepsake.',
  actionLabel: 'Open photo sharing',
});
