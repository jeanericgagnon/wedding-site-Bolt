import type { PlannerAccessRole, PlannerPermissionKey } from '../../../lib/plannerAccess';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput, NameChangePlan, NameChangeReminderInput } from '../../../lib/nameChange/types';
import { canEditPlanningBudget, canEditPlanningTasks, canEditPlanningVendors } from '../../../lib/plannerAccess';
import type { PlanningBudgetItem, PlanningTask, PlanningVendor, StarterPlannerSuite } from './planningService';
import { AddressCollectionTab } from './AddressCollectionTab';
import { BudgetTab } from './BudgetTab';
import { NameChangePlannerTab } from './NameChangePlannerTab';
import { PaymentsTab } from './PaymentsTab';
import { PlanningOverviewTab } from './PlanningOverviewTab';
import { SongRequestsTab } from './SongRequestsTab';
import { TasksTab } from './TasksTab';
import { VendorsTab } from './VendorsTab';
import type { VendorMetaMap } from './vendorMetaStorage';

type Tab = 'overview' | 'tasks' | 'budget' | 'payments' | 'vendors' | 'songs' | 'addresses' | 'nameChange';

interface StarterSuiteRun {
  taskIds: string[];
  budgetItemIds: string[];
  vendorIds: string[];
  createdAt: string;
}

type Props = {
  activeTab: Tab;
  applyingStarterSuite: boolean;
  budgetItems: PlanningBudgetItem[];
  isDemoMode: boolean;
  lastStarterSuiteRun: StarterSuiteRun | null;
  loading: boolean;
  nameChangeDocuments: NameChangeDocumentInput[];
  nameChangeDraft: NameChangeCaseInput;
  nameChangeExtractedFields: NameChangeExtractedFieldInput[];
  nameChangePlan: NameChangePlan;
  nameChangeReminders: NameChangeReminderInput[];
  nameChangeSaving: boolean;
  planningPermissions: PlannerPermissionKey[] | null;
  planningRole: PlannerAccessRole;
  seatingReadiness: {
    attending: number;
    seated: number;
    unassigned: number;
  };
  siteId: string | null;
  starterSuite: StarterPlannerSuite | null;
  tasks: PlanningTask[];
  totalBudget: number;
  vendorMeta: VendorMetaMap;
  undoingStarterSuite: boolean;
  vendors: PlanningVendor[];
  weddingDate: string | null;
  onAddBudgetItem: (item: Partial<PlanningBudgetItem>) => Promise<void>;
  onAddTask: (task: Partial<PlanningTask>) => Promise<void>;
  onAddVendor: (vendor: Partial<PlanningVendor>) => Promise<void>;
  onApplyStarterSuite: () => Promise<void>;
  onCreateMilestones: () => Promise<void>;
  onDeleteBudgetItem: (id: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onDeleteVendor: (id: string) => Promise<void>;
  onDraftChange: (updates: Partial<NameChangeCaseInput>) => void;
  onDocumentsChange: (nextDocuments: NameChangeDocumentInput[]) => void;
  onExtractedFieldsChange: (nextFields: NameChangeExtractedFieldInput[]) => void;
  onRemindersChange: (nextReminders: NameChangeReminderInput[], context?: { action: 'single-update' | 'bulk-update' | 'schedule-stale' }) => void;
  onSaveNameChange: () => Promise<void>;
  onSaveTotalBudget: (value: number) => Promise<void>;
  onSaveVendorMeta: (meta: VendorMetaMap) => Promise<void>;
  onStepExecutionNoteChange: (stepId: string, note: string) => void;
  onStepExecutionStatusChange: (stepId: string, executionStatus: 'todo' | 'in_progress' | 'complete') => void;
  onStructuredIntakeChange: (key: string, value: unknown) => void;
  onTabChange: (tab: Tab) => void;
  onUndoStarterSuite: () => Promise<void>;
  onUpdateBudgetItem: (id: string, updates: Partial<PlanningBudgetItem>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<PlanningTask>) => Promise<void>;
  onUpdateVendor: (id: string, updates: Partial<PlanningVendor>) => Promise<void>;
};

export function PlanningDashboardTabContent({
  activeTab,
  applyingStarterSuite,
  budgetItems,
  isDemoMode,
  lastStarterSuiteRun,
  loading,
  nameChangeDocuments,
  nameChangeDraft,
  nameChangeExtractedFields,
  nameChangePlan,
  nameChangeReminders,
  nameChangeSaving,
  planningPermissions,
  planningRole,
  seatingReadiness,
  siteId,
  starterSuite,
  tasks,
  totalBudget,
  vendorMeta,
  undoingStarterSuite,
  vendors,
  weddingDate,
  onAddBudgetItem,
  onAddTask,
  onAddVendor,
  onApplyStarterSuite,
  onCreateMilestones,
  onDeleteBudgetItem,
  onDeleteTask,
  onDeleteVendor,
  onDraftChange,
  onDocumentsChange,
  onExtractedFieldsChange,
  onRemindersChange,
  onSaveNameChange,
  onSaveTotalBudget,
  onSaveVendorMeta,
  onStepExecutionNoteChange,
  onStepExecutionStatusChange,
  onStructuredIntakeChange,
  onTabChange,
  onUndoStarterSuite,
  onUpdateBudgetItem,
  onUpdateTask,
  onUpdateVendor,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse" aria-hidden="true">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 rounded-lg bg-surface-subtle border border-border-subtle" />
          <div className="h-24 rounded-lg bg-surface-subtle border border-border-subtle" />
          <div className="h-24 rounded-lg bg-surface-subtle border border-border-subtle" />
        </div>
        <div className="h-56 rounded-lg bg-surface-subtle border border-border-subtle" />
      </div>
    );
  }

  return (
    <>
      {activeTab === 'overview' && (
        <PlanningOverviewTab
          tasks={tasks}
          budgetItems={budgetItems}
          vendors={vendors}
          seatingReadiness={seatingReadiness}
          weddingDate={weddingDate}
          nameChangePlan={nameChangePlan}
          onTabChange={(tab) => onTabChange(tab as Tab)}
          starterSuite={starterSuite}
          onApplyStarterSuite={onApplyStarterSuite}
          applyingStarterSuite={applyingStarterSuite}
          lastStarterSuiteRun={lastStarterSuiteRun}
          onUndoStarterSuite={onUndoStarterSuite}
          undoingStarterSuite={undoingStarterSuite}
        />
      )}
      {activeTab === 'tasks' && (
        <TasksTab
          tasks={tasks}
          weddingDate={weddingDate}
          onAdd={onAddTask}
          onUpdate={onUpdateTask}
          onDelete={onDeleteTask}
          onCreateMilestones={onCreateMilestones}
          canEdit={canEditPlanningTasks(planningRole, planningPermissions)}
        />
      )}
      {activeTab === 'budget' && (
        <BudgetTab
          items={budgetItems}
          vendors={vendors}
          vendorMeta={vendorMeta}
          totalBudget={totalBudget}
          onTotalBudgetChange={onSaveTotalBudget}
          onAdd={onAddBudgetItem}
          onUpdate={onUpdateBudgetItem}
          onDelete={onDeleteBudgetItem}
          canEdit={canEditPlanningBudget(planningRole, planningPermissions)}
        />
      )}
      {activeTab === 'payments' && (
        <PaymentsTab
          items={budgetItems}
          vendorMeta={vendorMeta}
          vendors={vendors}
          onUpdateBudgetItem={onUpdateBudgetItem}
          onUpdateVendor={onUpdateVendor}
          canEdit={canEditPlanningBudget(planningRole, planningPermissions) || canEditPlanningVendors(planningRole, planningPermissions)}
        />
      )}
      {activeTab === 'vendors' && (
        <VendorsTab
          vendorMeta={vendorMeta}
          vendors={vendors}
          onAdd={onAddVendor}
          onSaveVendorMeta={onSaveVendorMeta}
          onUpdate={onUpdateVendor}
          onDelete={onDeleteVendor}
          canEdit={canEditPlanningVendors(planningRole, planningPermissions)}
        />
      )}
      {activeTab === 'songs' && (
        <SongRequestsTab
          siteId={siteId}
          isDemoMode={isDemoMode}
          canEdit={canEditPlanningTasks(planningRole, planningPermissions)}
        />
      )}
      {activeTab === 'addresses' && (
        <AddressCollectionTab
          siteId={siteId}
          isDemoMode={isDemoMode}
        />
      )}
      {activeTab === 'nameChange' && (
        <NameChangePlannerTab
          draft={nameChangeDraft}
          documents={nameChangeDocuments}
          extractedFields={nameChangeExtractedFields}
          plan={nameChangePlan}
          reminders={nameChangeReminders}
          saving={nameChangeSaving}
          onDraftChange={onDraftChange}
          onStructuredIntakeChange={onStructuredIntakeChange}
          onDocumentsChange={onDocumentsChange}
          onExtractedFieldsChange={onExtractedFieldsChange}
          onRemindersChange={onRemindersChange}
          onStepExecutionStatusChange={onStepExecutionStatusChange}
          onStepExecutionNoteChange={onStepExecutionNoteChange}
          onSave={onSaveNameChange}
        />
      )}
    </>
  );
}
