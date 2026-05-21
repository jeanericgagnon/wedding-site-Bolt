import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import {
  getAccountUpdateTemplateContextLines,
  getAccountUpdateTemplateCopyButtonLabel,
} from '../../../lib/nameChange/actionFeed';
import type { NameChangePlan } from '../../../lib/nameChange/types';
import {
  getAccountUpdateTemplateBodyText,
  getAccountUpdateTemplateStatusChip,
  getAccountUpdateTemplateSubjectText,
  getExecutionSummaryTone,
} from './nameChangePlannerUi';

type AccountUpdateTemplate = NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number];

interface NameChangeAccountUpdateTemplatesCardProps {
  copiedTemplateId: string | null;
  templates: AccountUpdateTemplate[];
  onCopyTemplate: (template: AccountUpdateTemplate) => void;
}

export function NameChangeAccountUpdateTemplatesCard({
  copiedTemplateId,
  templates,
  onCopyTemplate,
}: NameChangeAccountUpdateTemplatesCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Prewritten update templates</h3>
          <p className="mt-1 text-sm text-text-secondary">Copy, stage, or send when the proof chain is ready. Payroll, bank, insurance, and other downstream updates should not require fresh writing every time.</p>
        </div>
        <span className="rounded-xl bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{templates.length} templates</span>
      </div>

      <div className="mt-4 space-y-3">
        {templates.map((template) => {
          const subjectText = getAccountUpdateTemplateSubjectText(template);
          const bodyText = getAccountUpdateTemplateBodyText(template);

          return (
            <div id={`account-update-template-${template.id}`} key={template.id} className="scroll-mt-24 rounded-[20px] border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-text-tertiary">{template.audience}</p>
                  {subjectText ? <p className="mt-2 text-sm font-semibold text-text-primary">{subjectText}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-xl px-2 py-1 text-xs ${getExecutionSummaryTone(template.readiness)}`}>
                    {getAccountUpdateTemplateStatusChip(template)}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => onCopyTemplate(template)}>
                    {getAccountUpdateTemplateCopyButtonLabel(template, copiedTemplateId)}
                  </Button>
                </div>
              </div>
              {getAccountUpdateTemplateContextLines(template, {
                includeSubject: false,
                includeMessage: false,
                prefixReadiness: false,
              }).map((line) => (
                <p key={line} className="mt-2 text-xs text-text-secondary">{line}</p>
              ))}
              {bodyText ? <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{bodyText}</p> : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
