export interface BuilderKeyboardShortcut {
  id: string;
  label: string;
  keys: string[];
  description: string;
}

export const BUILDER_SHORTCUTS: BuilderKeyboardShortcut[] = [
  { id: 'save', label: 'Save Draft', keys: ['Meta+s', 'Ctrl+s'], description: 'Save the current draft' },
  { id: 'undo', label: 'Undo', keys: ['Meta+z', 'Ctrl+z'], description: 'Undo last action' },
  { id: 'redo', label: 'Redo', keys: ['Meta+Shift+z', 'Ctrl+Shift+z'], description: 'Redo last undone action' },
  { id: 'preview', label: 'Toggle Preview', keys: ['Meta+p', 'Ctrl+p'], description: 'Toggle preview mode' },
  { id: 'deselect', label: 'Deselect Section', keys: ['Escape'], description: 'Deselect the active section' },
  { id: 'delete', label: 'Delete Section', keys: ['Backspace', 'Delete'], description: 'Delete selected section' },
];

export const BUILDER_SHORTCUT_MAP: Record<string, string> = Object.fromEntries(
  BUILDER_SHORTCUTS.flatMap(s => s.keys.map(k => [k, s.id]))
);
