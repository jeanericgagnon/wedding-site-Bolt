import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../../../components/ui/Toast';
import { TasksTab } from './TasksTab';
import type { PlanningTask } from './planningService';

const baseTasks: PlanningTask[] = [
  {
    id: 'task-1',
    wedding_site_id: 'site-1',
    title: 'Confirm rentals',
    description: 'Check chair count and linens.',
    category: 'Logistics',
    due_date: '2026-06-01',
    status: 'todo',
    priority: 'medium',
    owner_name: 'Alex',
    linked_event_id: null,
    linked_vendor_id: null,
    sort_order: 0,
    created_at: '2026-05-01T12:00:00.000Z',
    updated_at: '2026-05-01T12:00:00.000Z',
  },
];

describe('TasksTab', () => {
  it('restores the add-task save button after a failed save', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockRejectedValueOnce(new Error('save failed'));

    render(
      <ToastProvider>
        <TasksTab
          tasks={[]}
          weddingDate={null}
          onAdd={onAdd}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
          onCreateMilestones={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /add task/i }));
    await user.type(screen.getByLabelText(/title/i), 'Pack welcome bags');

    const saveButton = screen.getByRole('button', { name: /save task/i });
    await user.click(saveButton);

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /save task/i })).toBeEnabled();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Pack welcome bags');
    expect(screen.getByText(/couldn’t save that task right now\./i)).toBeInTheDocument();
  });

  it('restores the checklist button after a failed milestone build', async () => {
    const user = userEvent.setup();
    const onCreateMilestones = vi.fn().mockRejectedValueOnce(new Error('build failed'));

    render(
      <ToastProvider>
        <TasksTab
          tasks={baseTasks}
          weddingDate="2026-10-10"
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
          onCreateMilestones={onCreateMilestones}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /wedding checklist/i }));
    await user.click(screen.getByRole('button', { name: /build checklist/i }));

    expect(onCreateMilestones).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /build checklist/i })).toBeEnabled();
    expect(screen.getByText(/build a wedding checklist\?/i)).toBeInTheDocument();
    expect(screen.getByText(/couldn’t build the wedding checklist right now\./i)).toBeInTheDocument();
  });

  it('restores the bulk-complete action after a failed update', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockRejectedValueOnce(new Error('bulk failed'));

    render(
      <ToastProvider>
        <TasksTab
          tasks={baseTasks}
          weddingDate={null}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={onUpdate}
          onDelete={vi.fn().mockResolvedValue(undefined)}
          onCreateMilestones={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /mark 1 complete/i }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /mark 1 complete/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t mark those tasks complete right now\./i)).toBeInTheDocument();
  });

  it('shows a toast when the quick complete toggle fails', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockRejectedValueOnce(new Error('toggle failed'));

    render(
      <ToastProvider>
        <TasksTab
          tasks={baseTasks}
          weddingDate={null}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={onUpdate}
          onDelete={vi.fn().mockResolvedValue(undefined)}
          onCreateMilestones={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /mark task confirm rentals complete/i }));

    expect(onUpdate).toHaveBeenCalledWith('task-1', { status: 'done' });
    expect(await screen.findByText(/couldn’t update that task right now\./i)).toBeInTheDocument();
  });

  it('shows a toast when the quick delete action fails', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValueOnce(new Error('delete failed'));

    render(
      <ToastProvider>
        <TasksTab
          tasks={baseTasks}
          weddingDate={null}
          onAdd={vi.fn().mockResolvedValue(undefined)}
          onUpdate={vi.fn().mockResolvedValue(undefined)}
          onDelete={onDelete}
          onCreateMilestones={vi.fn().mockResolvedValue(undefined)}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: /delete task confirm rentals/i }));

    expect(onDelete).toHaveBeenCalledWith('task-1');
    expect(await screen.findByText(/couldn’t delete that task right now\./i)).toBeInTheDocument();
  });
});
