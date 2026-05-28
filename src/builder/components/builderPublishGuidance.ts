import { getPublishIssue } from '../utils/publishReadiness';

export const getPublishGuidance = (issue: ReturnType<typeof getPublishIssue>): { notice: string; error: string } | null => {
  if (!issue) return null;

  if (issue.kind === 'no-pages') {
    return {
      notice: 'Opened designs so you can add a starting point before sharing with guests.',
      error: `${issue.message} Choose a starting design or add a page first.`,
    };
  }

  if (issue.kind === 'no-enabled-sections') {
    return {
      notice: 'Selected the first section. Turn it on, then try again.',
      error: `${issue.message} Select a section and turn it on in the inspector.`,
    };
  }

  if (issue.kind === 'missing-couple-names') {
    return {
      notice: 'Open couple details in settings and add both names.',
      error: issue.message,
    };
  }

  if (issue.kind === 'missing-event-date') {
    return {
      notice: 'Add your wedding date in event settings.',
      error: issue.message,
    };
  }

  if (issue.kind === 'missing-venue') {
    return {
      notice: 'Add at least one venue before sharing with guests.',
      error: issue.message,
    };
  }

  if (issue.kind === 'rsvp-disabled') {
    return {
      notice: 'Turn RSVP on in settings or remove the RSVP button before sharing with guests.',
      error: issue.message,
    };
  }

  if (issue.kind === 'unsaved-changes') {
    return {
      notice: 'Save your latest draft changes, then try publish again.',
      error: issue.message,
    };
  }

  return null;
};
