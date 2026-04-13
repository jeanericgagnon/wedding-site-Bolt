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
      explainer: 'The system is pushing your latest site changes live right now.',
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
      label: 'Live site has older changes',
      tone: 'warning',
      explainer: 'Your guests still see the current live version until you publish again.',
    };
  }
  if (input.isPublished) {
    return {
      label: 'Live and up to date',
      tone: 'success',
      explainer: 'Your latest saved version is already live for guests.',
    };
  }
  return {
    label: 'Draft only',
    tone: 'neutral',
    explainer: 'The site is still draft-only until you publish it for guests.',
  };
}
