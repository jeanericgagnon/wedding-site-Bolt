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
  decisionRule: string;
  badges: string[];
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
      decisionRule: 'If work is already late, fix that truth before you optimize budget, wording, or polish.',
      badges: [
        `${overdueTasks.length} overdue`,
        `${tasks.filter((task) => task.priority === 'high' && task.status !== 'done').length} high priority still open`,
      ],
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
      decisionRule: 'When money is due soon, timing beats research: confirm the next payment move before you reopen broader vendor questions.',
      badges: [
        `${currency(dueSoonVendors.reduce((sum, vendor) => sum + (vendor.balance_due || 0), 0))} due soon`,
        `${vendors.filter((vendor) => (vendor.balance_due || 0) > 0).length} vendors still open`,
      ],
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
      decisionRule: 'If spend is drifting, steady the categories first; do not let a soft budget story sit underneath hard planning decisions.',
      badges: [
        `${currency(totalActual)} spent`,
        `${currency(Math.max(totalActual - totalEstimated, 0))} over plan`,
      ],
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
      decisionRule: 'If confirmed guests are still floating, place them before you spend energy on softer planning polish.',
      badges: [
        `${seatingReadiness.seated}/${seatingReadiness.attending} seated`,
        `${tasks.filter((task) => task.status === 'in_progress').length} tasks in progress`,
      ],
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
      decisionRule: 'Near the wedding, schedule anchors beat aesthetic polish every time.',
      badges: [
        daysUntilWedding === 0 ? 'Wedding day' : `${daysUntilWedding} days left`,
        'No itinerary events yet',
      ],
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
    decisionRule: 'When no pressure point is obvious, improve the edges that will keep the board trustworthy later.',
    badges: [
      `${tasks.filter((task) => task.status !== 'done').length} tasks still open`,
      `${vendors.filter((vendor) => (vendor.balance_due || 0) === 0).length} vendors fully paid`,
    ],
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
      decisionRule: 'If a task is already late, resolve or reset it before you add more planning noise to the board.',
      badges: [
        `${overdueTasks.length} overdue`,
        `${dueSoonHighPriority.length} high-priority due this week`,
      ],
    };
  }

  if (dueSoonHighPriority.length > 0) {
    return {
      eyebrow: 'Task coach',
      title: 'High-priority work needs a short weekly pass',
      detail: `${dueSoonHighPriority.length} high-priority task${dueSoonHighPriority.length === 1 ? ' is' : 's are'} due within a week. This is the right moment to tighten owners and dates.`,
      focusTitle: 'Protect the work that will matter this week',
      focusDetail: 'A short pass on ownership and due dates now keeps these tasks from becoming next week’s overdue cleanup.',
      decisionRule: 'When high-priority work is due soon, tighten owners and dates before you reorganize the rest of the board.',
      badges: [
        `${dueSoonHighPriority.length} high-priority due soon`,
        `${inProgressCount} already in progress`,
      ],
    };
  }

  return {
    eyebrow: 'Task coach',
    title: 'Use this list to keep momentum visible',
    detail: 'The task board looks stable. Use it to keep ownership clear and turn vague planning work into a small set of real next steps.',
    focusTitle: 'Keep ownership clearer than urgency',
    focusDetail: 'The task list is doing its job when every open item has a believable owner and a next step that does not need translation.',
    decisionRule: 'When the list is calm, use it to preserve ownership clarity instead of inventing busier task churn.',
    badges: [
      `${tasks.filter((task) => task.status !== 'done').length} open`,
      `${inProgressCount} in progress`,
    ],
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
      decisionRule: 'When the goal is already breached, category truth matters more than reassuring totals.',
      badges: [
        `${currency(totalActual)} spent`,
        `${currency(Math.max(totalActual - totalBudget, 0))} over goal`,
      ],
    };
  }

  if (overBudgetCategories.length > 0) {
    return {
      eyebrow: 'Budget coach',
      title: 'A few categories need a second pass',
      detail: `The biggest drift is showing up in ${overBudgetCategories.slice(0, 3).join(', ')}${overBudgetCategories.length > 3 ? ', and other categories' : ''}. Tightening those is more useful than staring at the grand total.`,
      focusTitle: 'Review the categories that are teaching the wrong story',
      focusDetail: 'A calm budget comes from understanding the few places that drifted, not treating every line item like equal pressure.',
      decisionRule: 'If only a few categories drifted, fix those first instead of broadening the review.',
      badges: [
        `${overBudgetCategories.length} categories over estimate`,
        `${currency(remaining)} remaining`,
      ],
    };
  }

  return {
    eyebrow: 'Budget coach',
    title: 'The budget is steady enough to guide decisions',
    detail: 'Use this view to decide what still needs money, not just to log receipts. When the goal and the actuals stay close, the rest of the plan gets easier.',
    focusTitle: 'Use the budget as a decision tool, not a ledger',
    focusDetail: 'A steady budget helps you decide what should still get real money and what can stay intentionally lighter.',
    decisionRule: 'When the totals are steady, let the budget guide future choices instead of turning it into receipt archaeology.',
    badges: [
      `${currency(totalEstimated)} estimated`,
      `${currency(remaining)} remaining`,
    ],
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
      decisionRule: 'When vendor timing is imminent, resolve the next due move before you widen the conversation.',
      badges: [
        `${currency(dueSoonVendors.reduce((sum, vendor) => sum + (vendor.balance_due || 0), 0))} due soon`,
        `${openBalanceCount} vendors still open`,
      ],
    };
  }

  if (missingContactCount > 0) {
    return {
      eyebrow: 'Vendor coach',
      title: 'A few vendors still need cleaner contact details',
      detail: `${missingContactCount} vendor record${missingContactCount === 1 ? ' is' : 's are'} missing both phone and email. Tightening that up now will matter more than adding more notes later.`,
      focusTitle: 'Give every active vendor one reliable contact path',
      focusDetail: 'The board gets calmer once each vendor record can actually support a quick follow-up without hunting through old threads.',
      decisionRule: 'If contact truth is missing, fix that before you add more vendor notes or comparisons.',
      badges: [
        `${missingContactCount} missing direct contact`,
        `${openBalanceCount} still carrying balance`,
      ],
    };
  }

  return {
    eyebrow: 'Vendor coach',
    title: 'Vendor tracking is steady enough to maintain',
    detail: 'The vendor list looks calm. Keep contact details, payment timing, and follow-up notes current so this stays a control surface instead of becoming archaeology.',
    focusTitle: 'Maintain the vendor board as active truth',
    focusDetail: 'A calm vendor list is valuable because it stays ready for the next real question, not because it collects every past detail.',
    decisionRule: 'When vendors are calm, preserve clean follow-up truth instead of expanding the record for its own sake.',
    badges: [
      `${openBalanceCount} open balances`,
      `${vendors.length} total vendors`,
    ],
  };
}
