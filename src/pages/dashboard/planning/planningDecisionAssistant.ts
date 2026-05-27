import type { PlanningTask, PlanningBudgetItem, PlanningVendor } from './planningService';
import { isTaskDueBetween, isTaskDueOnOrBefore } from './taskDueDate';
import { isVendorDateBetween } from './vendorDate';

export interface PlanningDecisionAction {
  label: string;
  target: 'overview' | 'tasks' | 'budget' | 'vendors' | 'seating' | 'itinerary';
}

export interface PlanningDecisionCardModel {
  eyebrow: string;
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  badges: string[];
  sequence: Array<{
    id: 'stabilize' | 'check' | 'settle';
    status: 'current' | 'next' | 'then';
    title: string;
    detail: string;
  }>;
  primaryAction?: PlanningDecisionAction;
  secondaryAction?: PlanningDecisionAction;
}

interface SeatingReadiness {
  attending: number;
  seated: number;
  unassigned: number;
}

function dueWindows() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  return { today, in7Days };
}

function currency(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function buildPlanningSequence(
  current: { title: string; detail: string },
  next: { title: string; detail: string },
  then: { title: string; detail: string },
) {
  return [
    {
      id: 'stabilize' as const,
      status: 'current' as const,
      title: current.title,
      detail: current.detail,
    },
    {
      id: 'check' as const,
      status: 'next' as const,
      title: next.title,
      detail: next.detail,
    },
    {
      id: 'settle' as const,
      status: 'then' as const,
      title: then.title,
      detail: then.detail,
    },
  ];
}

export function buildPlanningOverviewDecisionCard(args: {
  tasks: PlanningTask[];
  budgetItems: PlanningBudgetItem[];
  vendors: PlanningVendor[];
  seatingReadiness: SeatingReadiness;
  daysUntilWedding?: number | null;
  itineraryEventCount?: number | null;
}): PlanningDecisionCardModel {
  const { tasks, budgetItems, vendors, seatingReadiness, daysUntilWedding = null, itineraryEventCount = null } = args;
  const { today, in7Days } = dueWindows();
  const overdueTasks = tasks.filter((task) => task.status !== 'done' && isTaskDueOnOrBefore(task.due_date, today));
  const dueSoonVendors = vendors.filter((vendor) => vendor.balance_due > 0 && isVendorDateBetween(vendor.next_payment_due, today, in7Days));
  const totalEstimated = budgetItems.reduce((sum, item) => sum + (item.estimated_amount || 0), 0);
  const totalActual = budgetItems.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
  const overBudget = totalEstimated > 0 && totalActual > totalEstimated;
  const weddingSoon = daysUntilWedding !== null && daysUntilWedding >= 0 && daysUntilWedding <= 21;

  if (overdueTasks.length > 0) {
    return {
      eyebrow: 'Planning assistant',
      title: 'Clear the overdue work first',
      detail: `${overdueTasks.length} planning task${overdueTasks.length === 1 ? ' is' : 's are'} already past due. The fastest way to calm the board is to close or reschedule the work that is already slipping.`,
      focusTitle: 'Recover trust in the task board first',
      focusDetail: 'Once overdue work is resolved or honestly rescheduled, the rest of the planning board becomes much easier to trust again.',
      bestNextMove: 'Open the overdue tasks first, close or reschedule the ones already slipping, then come back to the rest of the board once the dates are honest again.',
      decisionRule: 'If work is already late, fix that truth before you optimize budget, wording, or polish.',
      watchout: 'Do not hide overdue work under prettier categories or fresh polish. If the dates are already lying, every calmer-looking part of the board is less trustworthy until that is fixed.',
      badges: [
        `${overdueTasks.length} overdue`,
        `${tasks.filter((task) => task.priority === 'high' && task.status !== 'done').length} high priority still open`,
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Resolve or reschedule the late work',
          detail: 'Use the overdue items to restore date truth before you trust any calmer-looking part of the board.',
        },
        {
          title: 'Re-check the next pressure point',
          detail: 'Once the dates are honest again, look at whether seating, vendor timing, or budget drift still deserves the next pass.',
        },
        {
          title: 'Return to polish only after truth holds',
          detail: 'Let the board earn its calmer state before you spend energy on softer optimization.',
        },
      ),
      primaryAction: { label: 'Open tasks', target: 'tasks' },
      secondaryAction: seatingReadiness.unassigned > 0 ? { label: 'Check seating', target: 'seating' } : undefined,
    };
  }

  if (dueSoonVendors.length > 0) {
    return {
      eyebrow: 'Planning assistant',
      title: 'Vendor money is the next pressure point',
      detail: `${dueSoonVendors.length} vendor payment${dueSoonVendors.length === 1 ? ' is' : 's are'} coming up within a week. Confirm who is due next before the timeline gets crowded.`,
      focusTitle: 'Keep the next payment decision calm',
      focusDetail: 'You do not need a broad vendor review yet. You need one clear pass on the invoices and due dates that are about to matter.',
      bestNextMove: 'Review the next due vendor payment now, decide exactly who gets paid next, and only then reopen any broader vendor questions.',
      decisionRule: 'When money is due soon, timing beats research: confirm the next payment move before you reopen broader vendor questions.',
      watchout: 'Do not turn one imminent payment into a full vendor spiral. When money is due soon, broad comparison work usually just delays the only decision that already matters.',
      badges: [
        `${currency(dueSoonVendors.reduce((sum, vendor) => sum + (vendor.balance_due || 0), 0))} due soon`,
        `${vendors.filter((vendor) => (vendor.balance_due || 0) > 0).length} vendors still open`,
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Confirm the next due payment',
          detail: 'Use the next week as the boundary and decide exactly which vendor money move matters first.',
        },
        {
          title: 'Check whether budget drift changes the call',
          detail: 'After the timing move is clear, verify whether the surrounding spend story still supports it cleanly.',
        },
        {
          title: 'Reopen broader vendor thinking later',
          detail: 'Once the time-sensitive payment is handled, deeper sourcing and note cleanup can happen without pressure distortion.',
        },
      ),
      primaryAction: { label: 'Review vendors', target: 'vendors' },
      secondaryAction: overBudget ? { label: 'Check budget', target: 'budget' } : undefined,
    };
  }

  if (overBudget) {
    return {
      eyebrow: 'Planning assistant',
      title: 'Budget drift is the next thing to steady',
      detail: `Actual spend is ahead of plan by ${currency(totalActual - totalEstimated)}. A quick review of category overages will keep the rest of the board honest.`,
      focusTitle: 'Correct the categories that are teaching the wrong lesson',
      focusDetail: 'The goal is not staring at totals. It is deciding which overages are real, acceptable, or worth tightening before they mislead the rest of the plan.',
      bestNextMove: 'Open the budget categories that drifted, decide which overages are real versus avoidable, and steady those before you trust the broader plan again.',
      decisionRule: 'If spend is drifting, steady the categories first; do not let a soft budget story sit underneath hard planning decisions.',
      watchout: 'Do not let a vague total hide the categories doing the real damage. If drift is real, category truth matters more than a reassuring top-line number.',
      badges: [
        `${currency(totalActual)} spent`,
        `${currency(Math.max(totalActual - totalEstimated, 0))} over plan`,
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Steady the drifting categories first',
          detail: 'Separate real committed overages from avoidable drift before you trust the larger budget story.',
        },
        {
          title: 'Check what still deserves real money',
          detail: 'Once the overages are honest, decide what upcoming spend still earns space in the plan.',
        },
        {
          title: 'Let the rest of the budget stay light',
          detail: 'After the pressure categories settle, avoid turning the whole budget into a heavier review than it needs.',
        },
      ),
      primaryAction: { label: 'Review budget', target: 'budget' },
      secondaryAction: seatingReadiness.unassigned > 0 ? { label: 'Check seating', target: 'seating' } : undefined,
    };
  }

  if (seatingReadiness.unassigned > 0) {
    return {
      eyebrow: 'Planning assistant',
      title: 'Seating is the next place to finish the loop',
      detail: `${seatingReadiness.unassigned} attending guest${seatingReadiness.unassigned === 1 ? ' is' : 's are'} still unassigned. The rest of the plan is calmer once every confirmed guest has a place.`,
      focusTitle: 'Turn confirmed attendance into a real room',
      focusDetail: 'This is the moment to close the gap between RSVP truth and the actual seating plan so later decisions stop compensating for missing placements.',
      bestNextMove: 'Place the remaining confirmed guests first, then come back to tasks or polish only after the room matches the RSVP truth.',
      decisionRule: 'If confirmed guests are still floating, place them before you spend energy on softer planning polish.',
      watchout: 'Do not treat floating confirmed guests like a minor detail. As long as the room does not match the RSVP truth, other planning surfaces are compensating for a missing reality.',
      badges: [
        `${seatingReadiness.seated}/${seatingReadiness.attending} seated`,
        `${tasks.filter((task) => task.status === 'in_progress').length} tasks in progress`,
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Place the floating confirmed guests',
          detail: 'Turn RSVP truth into a real room before you ask the rest of the plan to behave as if seating is settled.',
        },
        {
          title: 'Check the board again once the room is real',
          detail: 'After the placements exist, you can see more honestly whether tasks or timeline work still deserve the next pass.',
        },
        {
          title: 'Return to polish after the room holds',
          detail: 'Once seating matches the guest truth, the calmer parts of planning become worth touching again.',
        },
      ),
      primaryAction: { label: 'Open seating', target: 'seating' },
      secondaryAction: { label: 'Open tasks', target: 'tasks' },
    };
  }

  if (weddingSoon && itineraryEventCount === 0) {
    return {
      eyebrow: 'Planning assistant',
      title: 'The weekend still needs its schedule anchors',
      detail: 'Before the final stretch feels calm, guests need a real ceremony, reception, and key event timeline to trust. Add those anchor events before you spend energy on softer polish.',
      focusTitle: 'Give the wedding a schedule spine first',
      focusDetail: 'Once the anchor events exist, guest messaging, seating, and live-day coordination can all work from the same trustworthy timeline.',
      bestNextMove: 'Add the ceremony, reception, and other anchor events now, then preview the itinerary before you return to seating or softer polish.',
      decisionRule: 'Near the wedding, schedule anchors beat aesthetic polish every time.',
      watchout: 'Do not ask guests or coordinators to infer the weekend from scattered notes. If the anchor events are missing, every later layer inherits that uncertainty.',
      badges: [
        daysUntilWedding === 0 ? 'Wedding day' : `${daysUntilWedding} days left`,
        'No itinerary events yet',
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Add the anchor events now',
          detail: 'Give the weekend a ceremony, reception, and other guest-critical anchors before you spend time on softer polish.',
        },
        {
          title: 'Preview the guest-facing timeline',
          detail: 'Use the first honest itinerary pass to make sure the weekend reads clearly once the anchors exist.',
        },
        {
          title: 'Return to seating or planning polish after the spine is real',
          detail: 'Once the schedule can carry trust, the rest of the board can improve without guessing around a missing timeline.',
        },
      ),
      primaryAction: { label: 'Build itinerary anchors', target: 'itinerary' },
      secondaryAction: { label: 'Check seating', target: 'seating' },
    };
  }

  return {
    eyebrow: 'Planning assistant',
    title: 'The board is calm enough to polish',
    detail: 'Nothing is obviously on fire. This is the moment to tighten wording, follow-ups, and small planning edges before they turn into deadline work.',
    focusTitle: 'Use the calm to remove future friction',
    focusDetail: 'A steady board is your chance to tighten the small things that usually turn into deadline noise later.',
    bestNextMove: 'Pick one small planning edge to tighten now, then leave the rest of the board alone while it is still calm.',
    decisionRule: 'When no pressure point is obvious, improve the edges that will keep the board trustworthy later.',
    watchout: 'Do not mistake a calm board for permission to reopen everything. The risk in steady planning is creating churn that was not there a minute ago.',
    badges: [
      `${tasks.filter((task) => task.status !== 'done').length} tasks still open`,
      `${vendors.filter((vendor) => (vendor.balance_due || 0) === 0).length} vendors fully paid`,
    ],
    sequence: buildPlanningSequence(
      {
        title: 'Pick one calm edge to tighten',
        detail: 'Use the lack of pressure to improve one believable next step instead of manufacturing a bigger planning churn.',
      },
      {
        title: 'Check that the board still feels honest',
        detail: 'After the small improvement, verify that you did not disturb a steadier part of the system unnecessarily.',
      },
      {
        title: 'Leave the rest of the board alone',
        detail: 'The calmer move is preserving the healthy surfaces once the one useful edge has been tightened.',
      },
    ),
    primaryAction: { label: 'Review tasks', target: 'tasks' },
  };
}

export function buildTasksDecisionCard(tasks: PlanningTask[]): PlanningDecisionCardModel {
  const { today, in7Days } = dueWindows();
  const overdueTasks = tasks.filter((task) => task.status !== 'done' && isTaskDueOnOrBefore(task.due_date, today));
  const dueSoonHighPriority = tasks.filter((task) => task.status !== 'done' && task.priority === 'high' && isTaskDueBetween(task.due_date, today, in7Days));
  const inProgressCount = tasks.filter((task) => task.status === 'in_progress').length;

  if (overdueTasks.length > 0) {
    return {
      eyebrow: 'Task coach',
      title: 'Resolve the overdue tasks before you add more',
      detail: `${overdueTasks.length} task${overdueTasks.length === 1 ? ' is' : 's are'} already late. Finish, delegate, or reschedule those first so the task list stays trustworthy.`,
      focusTitle: 'Make the task list honest again',
      focusDetail: 'The best task system is not the fullest one. It is the one where the dates and statuses still mean what they say.',
      bestNextMove: 'Resolve the overdue tasks before you add or reorder anything else, so the list earns the right to guide the week again.',
      decisionRule: 'If a task is already late, resolve or reset it before you add more planning noise to the board.',
      watchout: 'Do not respond to overdue work by adding more structure around it. If the task dates already stopped meaning what they say, the only useful move is to make them honest again.',
      badges: [
        `${overdueTasks.length} overdue`,
        `${dueSoonHighPriority.length} high-priority due this week`,
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Resolve the late tasks first',
          detail: 'Clear the tasks whose dates already stopped telling the truth before you add or reorder anything else.',
        },
        {
          title: 'Check the upcoming high-priority lane',
          detail: 'Once the overdue pressure is gone, confirm whether this week’s important work still needs owner or date tightening.',
        },
        {
          title: 'Return to calmer task hygiene later',
          detail: 'Only after the list is honest again should you reopen softer organization or cleanup passes.',
        },
      ),
    };
  }

  if (dueSoonHighPriority.length > 0) {
    return {
      eyebrow: 'Task coach',
      title: 'High-priority work needs a short weekly pass',
      detail: `${dueSoonHighPriority.length} high-priority task${dueSoonHighPriority.length === 1 ? ' is' : 's are'} due within a week. This is the right moment to tighten owners and dates.`,
      focusTitle: 'Protect the work that will matter this week',
      focusDetail: 'A short pass on ownership and due dates now keeps these tasks from becoming next week’s overdue cleanup.',
      bestNextMove: 'Confirm the owners and due dates on this week’s high-priority tasks before you reorganize the calmer rest of the list.',
      decisionRule: 'When high-priority work is due soon, tighten owners and dates before you reorganize the rest of the board.',
      watchout: 'Do not burn weekly focus on low-stakes reorganization while the near-term tasks still have fuzzy owners or dates. The board only feels calm if this week is grounded first.',
      badges: [
        `${dueSoonHighPriority.length} high-priority due soon`,
        `${inProgressCount} already in progress`,
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Tighten the owners and due dates',
          detail: 'Use this pass to make the short-horizon tasks believable before they become next week’s overdue cleanup.',
        },
        {
          title: 'Check the in-progress work next',
          detail: 'After the due-soon tasks are grounded, verify that the work already underway still has the right shape and owner.',
        },
        {
          title: 'Leave the calmer list structure alone',
          detail: 'The stable parts of the task board do not need a reorganization pass just because one weekly lane got attention.',
        },
      ),
    };
  }

  return {
    eyebrow: 'Task coach',
    title: 'Use this list to keep momentum visible',
    detail: 'The task board looks stable. Use it to keep ownership clear and turn vague planning work into a small set of real next steps.',
    focusTitle: 'Keep ownership clearer than urgency',
    focusDetail: 'The task list is doing its job when every open item has a believable owner and a next step that does not need translation.',
    bestNextMove: 'Use the calm to tighten one fuzzy task into a real owner-and-next-step pair, then leave the stable parts alone.',
    decisionRule: 'When the list is calm, use it to preserve ownership clarity instead of inventing busier task churn.',
    watchout: 'Do not use a stable task list as an excuse to reorganize for sport. If ownership is already clear, more movement usually makes the next step fuzzier, not better.',
    badges: [
      `${tasks.filter((task) => task.status !== 'done').length} open`,
      `${inProgressCount} in progress`,
    ],
    sequence: buildPlanningSequence(
      {
        title: 'Tighten one fuzzy task into a real move',
        detail: 'Use the calm to improve one owner-and-next-step pair instead of broadening the task list.',
      },
      {
        title: 'Check that ownership still feels clear',
        detail: 'After the small correction, make sure the visible in-progress lane still reads cleanly.',
      },
      {
        title: 'Leave the stable tasks alone',
        detail: 'Once the list is clear enough again, preserve that calm instead of creating more churn.',
      },
    ),
  };
}

export function buildBudgetDecisionCard(items: PlanningBudgetItem[], totalBudget: number): PlanningDecisionCardModel {
  const totalEstimated = items.reduce((sum, item) => sum + (item.estimated_amount || 0), 0);
  const totalActual = items.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
  const remaining = totalBudget - totalActual;
  const overBudgetCategories = Array.from(new Set(items
    .filter((item) => item.actual_amount > item.estimated_amount && item.estimated_amount > 0)
    .map((item) => item.category)))
    .filter(Boolean);

  if (totalBudget > 0 && totalActual > totalBudget) {
    return {
      eyebrow: 'Budget coach',
      title: 'The actual spend already passed the goal',
      detail: `You are over the budget goal by ${currency(totalActual - totalBudget)}. Review the categories that drifted first, then decide what still needs real money.`,
      focusTitle: 'Separate unavoidable spend from avoidable drift',
      focusDetail: 'You need one honest pass on what is already committed, what still has wiggle room, and what no longer fits the plan.',
      bestNextMove: 'Review the categories pushing the budget over goal first, then decide what still deserves real money before you cut elsewhere.',
      decisionRule: 'When the goal is already breached, category truth matters more than reassuring totals.',
      watchout: 'Do not smooth over a breached budget with a softer story. Once the goal is passed, false reassurance makes every later funding decision harder.',
      badges: [
        `${currency(totalActual)} spent`,
        `${currency(Math.max(totalActual - totalBudget, 0))} over goal`,
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Audit the categories that breached the goal',
          detail: 'Start where actual money already outran the plan so the budget story becomes honest again.',
        },
        {
          title: 'Check what still deserves funding',
          detail: 'Once the drift is real on paper, decide which remaining spends are still meaningful enough to keep.',
        },
        {
          title: 'Let the rest of the budget settle',
          detail: 'After the pressure categories are decided, avoid widening the review into a general ledger obsession.',
        },
      ),
    };
  }

  if (overBudgetCategories.length > 0) {
    return {
      eyebrow: 'Budget coach',
      title: 'A few categories need a second pass',
      detail: `The biggest drift is showing up in ${overBudgetCategories.slice(0, 3).join(', ')}${overBudgetCategories.length > 3 ? ', and other categories' : ''}. Tightening those is more useful than staring at the grand total.`,
      focusTitle: 'Review the categories that are teaching the wrong story',
      focusDetail: 'A calm budget comes from understanding the few places that drifted, not treating every line item like equal pressure.',
      bestNextMove: 'Open the over-budget categories first and decide which drift is acceptable before you widen the review to the whole budget.',
      decisionRule: 'If only a few categories drifted, fix those first instead of broadening the review.',
      watchout: 'Do not widen a narrow budget problem into full-budget anxiety. If only a few categories drifted, dragging every line item into review usually hides the real lesson.',
      badges: [
        `${overBudgetCategories.length} categories over estimate`,
        `${currency(remaining)} remaining`,
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Review the few categories that drifted',
          detail: 'Keep the pass narrow so the real problem categories stop teaching the wrong story.',
        },
        {
          title: 'Check whether the remaining budget still holds',
          detail: 'After those categories are honest, see whether the rest of the plan still feels calm without reopening every line item.',
        },
        {
          title: 'Return to lightweight budget maintenance',
          detail: 'Once the drift is understood, let the steadier categories stay quiet instead of dragging them into extra review.',
        },
      ),
    };
  }

  return {
    eyebrow: 'Budget coach',
    title: 'The budget is steady enough to guide decisions',
    detail: 'Use this view to decide what still needs money, not just to log receipts. When the goal and the actuals stay close, the rest of the plan gets easier.',
    focusTitle: 'Use the budget as a decision tool, not a ledger',
    focusDetail: 'A steady budget helps you decide what should still get real money and what can stay intentionally lighter.',
    bestNextMove: 'Use the calm to make the next funding decision clearly, then keep the budget light instead of turning it into receipt archaeology.',
    decisionRule: 'When the totals are steady, let the budget guide future choices instead of turning it into receipt archaeology.',
    watchout: 'Do not turn a steady budget into receipt archaeology just because it is available. The point is clearer future decisions, not heavier bookkeeping theater.',
    badges: [
      `${currency(totalEstimated)} estimated`,
      `${currency(remaining)} remaining`,
    ],
    sequence: buildPlanningSequence(
      {
        title: 'Use the calm to decide the next real spend',
        detail: 'Treat the budget as a forward-looking decision tool instead of a place to linger on old receipts.',
      },
      {
        title: 'Check whether that spend preserves the plan',
        detail: 'After the next funding move is clear, confirm the overall budget still feels believable and light.',
      },
      {
        title: 'Leave the steady categories alone',
        detail: 'The healthiest budget is the one that stays quiet once the next choice is made cleanly.',
      },
    ),
  };
}

export function buildVendorsDecisionCard(vendors: PlanningVendor[]): PlanningDecisionCardModel {
  const { today, in7Days } = dueWindows();
  const dueSoonVendors = vendors.filter((vendor) => vendor.balance_due > 0 && isVendorDateBetween(vendor.next_payment_due, today, in7Days));
  const openBalanceCount = vendors.filter((vendor) => (vendor.balance_due || 0) > 0).length;
  const missingContactCount = vendors.filter((vendor) => !vendor.email && !vendor.phone).length;

  if (dueSoonVendors.length > 0) {
    return {
      eyebrow: 'Vendor coach',
      title: 'The next vendor follow-up is about timing, not research',
      detail: `${dueSoonVendors.length} vendor payment${dueSoonVendors.length === 1 ? ' is' : 's are'} due inside a week. This is the right time to confirm who needs attention next.`,
      focusTitle: 'Handle the next due vendor cleanly',
      focusDetail: 'This is not a broad sourcing moment. It is a timing pass on the vendors whose money or reply windows are about to matter.',
      bestNextMove: 'Confirm the next due vendor payment now, then leave deeper sourcing or note cleanup for after the timing pressure passes.',
      decisionRule: 'When vendor timing is imminent, resolve the next due move before you widen the conversation.',
      watchout: 'Do not hide a due-now vendor decision inside broader sourcing talk. Timing pressure only gets louder when the next concrete move stays blurry.',
      badges: [
        `${currency(dueSoonVendors.reduce((sum, vendor) => sum + (vendor.balance_due || 0), 0))} due soon`,
        `${openBalanceCount} vendors still open`,
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Confirm the next due vendor move',
          detail: 'Use the upcoming due dates to decide which payment or reply needs attention before the rest of the lane.',
        },
        {
          title: 'Check whether budget or contact truth changes it',
          detail: 'Once the timing call is clear, verify that the supporting budget and contact details still hold cleanly.',
        },
        {
          title: 'Return to broader vendor research later',
          detail: 'After the due move is handled, deeper notes and sourcing work can stay calm instead of reactive.',
        },
      ),
    };
  }

  if (missingContactCount > 0) {
    return {
      eyebrow: 'Vendor coach',
      title: 'A few vendors still need cleaner contact details',
      detail: `${missingContactCount} vendor record${missingContactCount === 1 ? ' is' : 's are'} missing both phone and email. Tightening that up now will matter more than adding more notes later.`,
      focusTitle: 'Give every active vendor one reliable contact path',
      focusDetail: 'The board gets calmer once each vendor record can actually support a quick follow-up without hunting through old threads.',
      bestNextMove: 'Fill in one reliable contact path for the missing vendor records before you add more notes, comparisons, or research.',
      decisionRule: 'If contact truth is missing, fix that before you add more vendor notes or comparisons.',
      watchout: 'Do not stack notes onto vendor records that still cannot support a real follow-up. If contact truth is missing, extra comparison detail mostly hides the real problem.',
      badges: [
        `${missingContactCount} missing direct contact`,
        `${openBalanceCount} still carrying balance`,
      ],
      sequence: buildPlanningSequence(
        {
          title: 'Fill in one reliable contact path',
          detail: 'Give each active vendor a reachable phone or email before you keep expanding the record.',
        },
        {
          title: 'Check whether follow-up timing is now usable',
          detail: 'After the missing contacts exist, make sure the board can actually support the next real vendor question.',
        },
        {
          title: 'Leave deeper note cleanup for later',
          detail: 'Once contact truth is solid, broader comparisons and extra notes can happen without blocking follow-through.',
        },
      ),
    };
  }

  return {
    eyebrow: 'Vendor coach',
    title: 'Vendor tracking is steady enough to maintain',
    detail: 'The vendor list looks calm. Keep contact details, payment timing, and follow-up notes current so this stays a control surface instead of becoming archaeology.',
    focusTitle: 'Maintain the vendor board as active truth',
    focusDetail: 'A calm vendor list is valuable because it stays ready for the next real question, not because it collects every past detail.',
    bestNextMove: 'Use the calm to refresh the next vendor follow-up truth, then leave the rest of the board stable and ready.',
    decisionRule: 'When vendors are calm, preserve clean follow-up truth instead of expanding the record for its own sake.',
    watchout: 'Do not use a calm vendor board as a reason to inflate the record. If the next follow-up truth is already clear, extra maintenance can create noise instead of confidence.',
    badges: [
      `${openBalanceCount} open balances`,
      `${vendors.length} total vendors`,
    ],
    sequence: buildPlanningSequence(
      {
        title: 'Refresh the next real vendor follow-up',
        detail: 'Use the calm to keep one upcoming payment or contact move truthful without turning the board into archive work.',
      },
      {
        title: 'Check that the rest of the lane stays readable',
        detail: 'After the next move is clear, confirm the board still shows enough truth without collecting noise.',
      },
      {
        title: 'Leave the steady vendor records alone',
        detail: 'The calm win is preserving a ready board, not expanding it just because it looks quiet.',
      },
    ),
  };
}
