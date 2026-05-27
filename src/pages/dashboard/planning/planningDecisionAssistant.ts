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
    badges: [
      `${openBalanceCount} open balances`,
      `${vendors.length} total vendors`,
    ],
  };
}
