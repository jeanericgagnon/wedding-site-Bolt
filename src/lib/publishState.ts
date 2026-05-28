export interface PublishStateInput {
  isPublished?: boolean;
  isPublishing?: boolean;
  hasUnsavedChanges?: boolean;
  error?: string | null;
}

export interface PublishStateDescriptor {
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  explainer: string;
}

export function getPublishStateDescriptor(input: PublishStateInput): PublishStateDescriptor {
  if (input.isPublishing) {
    return {
      label: 'Publishing now',
      tone: 'warning',
      explainer: 'The system is publishing your latest site changes for guests right now.',
    };
  }
  if (input.error) {
    return {
      label: 'Publish needs attention',
      tone: 'danger',
      explainer: input.error,
    };
  }
  if (input.isPublished && input.hasUnsavedChanges) {
    return {
      label: 'Shared site has older changes',
      tone: 'warning',
      explainer: 'Your guests still see the current shared version until you publish again.',
    };
  }
  if (input.isPublished) {
    return {
      label: 'Shared and up to date',
      tone: 'success',
      explainer: 'Your latest saved version is already shared for guests.',
    };
  }
  return {
    label: 'Draft only',
    tone: 'neutral',
    explainer: 'The site stays draft-only until you share it with guests.',
  };
}
