export function getBuilderCanvasEmptyState(pageTitle: string, isPreview: boolean) {
  if (isPreview) {
    return {
      title: `${pageTitle} has no sections yet`,
      detail: 'Exit preview and add a first section before sharing this page.',
    };
  }

  return {
    title: `${pageTitle} is ready for its first section`,
    detail: 'Start with a hero or another anchor section so this page has something real to shape.',
  };
}
