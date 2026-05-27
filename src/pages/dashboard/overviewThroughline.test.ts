import { describe, expect, it } from 'vitest';
import { buildOverviewThroughline } from './overviewThroughline';

describe('buildOverviewThroughline', () => {
  it('stitches couple focus, measured next move, and board handoff into one sequence', () => {
    const throughline = buildOverviewThroughline({
      coupleFocus: {
        headline: 'Guest follow-through is the main couple focus',
        summary: 'The right next move is guest confidence, not more internal tweaking.',
        steps: [
          {
            id: 'guests',
            status: 'current',
            title: 'Send the next RSVP nudge',
            detail: '12 guests are still pending a response.',
            target: 'messages',
            ctaLabel: 'Open messages',
          },
        ],
      },
      analyticsNextMove: {
        priorityLabel: 'Response pressure',
        title: 'Close the RSVP gap before trusting the board more deeply',
        detail: '12 guests can still materially change how the rest of the board feels.',
        whyNow: 'Pending replies can still change the truth of every later planning and messaging decision.',
        decisionRule: 'If RSVPs can still materially move the board, close that gap before you trust calmer-looking metrics.',
        ctaLabel: 'Review guests',
        target: 'guests',
      },
      controlTowerBriefing: {
        eyebrow: 'Control tower briefing',
        title: 'Guest response follow-up is the pressure point right now',
        detail: 'The calmest next move is tightening outreach instead of waiting for the board to improve on its own.',
        focusTitle: 'Turn waiting into deliberate follow-up',
        focusDetail: 'The job is one clean outreach pass, not more passive dashboard watching.',
        bestNextMove: 'Review the pending guests, send the next reminder, and only then come back to the board.',
        decisionRule: 'If reply pressure is still real, outreach beats passive monitoring.',
        watchout: 'Do not confuse stagnant reply counts with a need for constant nudging.',
        badges: ['12 pending RSVP'],
        signals: [],
        sequence: [
          { label: 'Review pending guests', detail: 'Start with the guests who can still materially change how the board feels.', status: 'current' },
          { label: 'Send the next reminder', detail: 'Turn that guest list review into one clean outreach pass instead of waiting for passive movement.', status: 'next' },
          { label: 'Re-check the board', detail: 'Let the reminder results change the next move before you reopen any softer polish work.', status: 'then' },
        ],
        primaryAction: { label: 'Review guests', target: 'guests' },
        secondaryAction: { label: 'Open messages', target: 'messages' },
      },
    });

    expect(throughline.eyebrow).toBe('One calm plan');
    expect(throughline.title).toContain('couple focus');
    expect(throughline.steps.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(throughline.steps[1]?.title).toContain('RSVP gap');
    expect(throughline.steps[2]?.title).toContain('Review pending guests');
  });
});
