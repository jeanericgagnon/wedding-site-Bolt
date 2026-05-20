import { Layout } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui';
import { getAllTemplates } from '../../../templates/registry';

type SettingsTemplatePanelProps = {
  canEditSettings: boolean;
  changingTemplate: boolean;
  currentTemplate: string;
  onTemplateChange: (templateId: string) => void;
  onToggleVisibility: () => void;
  showTemplateSettings: boolean;
  templateError: string | null;
  templateSuccess: string | null;
};

export function SettingsTemplatePanel({
  canEditSettings,
  changingTemplate,
  currentTemplate,
  onTemplateChange,
  onToggleVisibility,
  showTemplateSettings,
  templateError,
  templateSuccess,
}: SettingsTemplatePanelProps) {
  return (
    <Card variant="bordered" padding="lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              Template
            </CardTitle>
            <CardDescription>Try a different look for your website without losing your content</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onToggleVisibility}>
            {showTemplateSettings ? 'Hide' : 'Show'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showTemplateSettings ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-subtle/40 p-4 text-sm text-text-secondary">
            Hidden by default to keep things calm. Open it when you want to change how your site looks.
          </div>
        ) : (
          <>
            {templateSuccess && (
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                {templateSuccess}
              </div>
            )}
            {templateError && (
              <div className="rounded-2xl border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary">
                {templateError}
              </div>
            )}
            <div>
              <label className="mb-3 block text-sm font-medium text-text-primary">
                Choose a different design
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                {getAllTemplates().map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onTemplateChange(template.id)}
                    disabled={changingTemplate || currentTemplate === template.id || !canEditSettings}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      currentTemplate === template.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-surface-subtle'
                    } ${changingTemplate || !canEditSettings ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <h3 className="mb-1 font-semibold text-text-primary">
                      {template.name}
                      {currentTemplate === template.id && (
                        <Badge variant="primary" className="ml-2">Current</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-text-secondary">
                Your names, details, and content stay in place when you switch designs.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
