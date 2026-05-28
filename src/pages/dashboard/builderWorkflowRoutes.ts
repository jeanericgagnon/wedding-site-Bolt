import { getBuilderLaunchChecklistRoute, getBuilderPolishRoute } from '../builderCutoverRoute';

export type BuilderWorkflowTarget = 'builder-launch' | 'builder-polish';

export function resolveBuilderWorkflowRoute(target: BuilderWorkflowTarget): string {
  return target === 'builder-launch' ? getBuilderLaunchChecklistRoute() : getBuilderPolishRoute();
}
