import type { NameChangeFormCompanion, NameChangeFormCompanionField } from './formCompanion';

export type NameChangeFormCompanionIntakePromptStatus = 'missing' | 'review';

export interface NameChangeFormCompanionIntakePrompt {
  promptKey: string;
  fieldKey: string;
  label: string;
  question: string;
  helperText: string;
  status: NameChangeFormCompanionIntakePromptStatus;
  statusLabel: string;
  priority: number;
  currentValue: string | null;
  formattedValue: string | null;
  impactedForms: string[];
  sourceLabels: string[];
}

function getPromptQuestion(field: NameChangeFormCompanionField) {
  const questionByFieldKey: Record<string, string> = {
    'applicant.currentFirstName': 'What is your current legal first name?',
    'applicant.currentMiddleName': 'What is your current legal middle name or initial?',
    'applicant.currentLastName': 'What is your current legal last name?',
    'applicant.newFirstName': 'What first name should appear after the name change?',
    'applicant.newMiddleName': 'What middle name or initial should appear after the name change?',
    'applicant.newLastName': 'What last name should appear after the name change?',
    'applicant.county': 'What county do you live in?',
    'legal.marriageDate': 'What date is listed on the certified marriage record?',
    'legal.marriageCertificateNumber': 'What certificate, record, or license number is listed on the certified marriage record?',
    'legal.marriageIssuingAuthority': 'Which clerk, recorder, or authority issued the certified marriage record?',
    'identity.passportIssueDate': 'What issue date is printed on the current passport?',
  };

  return questionByFieldKey[field.fieldKey] ?? `What should DayOf use for ${field.label}?`;
}

function getPromptLabel(field: NameChangeFormCompanionField) {
  const labelByFieldKey: Record<string, string> = {
    'applicant.currentFirstName': 'Current first name',
    'applicant.currentMiddleName': 'Current middle name',
    'applicant.currentLastName': 'Current last name',
    'applicant.newFirstName': 'New first name',
    'applicant.newMiddleName': 'New middle name',
    'applicant.newLastName': 'New last name',
    'applicant.county': 'County of residence',
    'legal.marriageDate': 'Marriage date',
    'legal.marriageCertificateNumber': 'Marriage certificate number',
    'legal.marriageIssuingAuthority': 'Marriage record issuing authority',
    'identity.passportIssueDate': 'Passport issue date',
  };

  return labelByFieldKey[field.fieldKey] ?? field.label;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildNameChangeFormCompanionIntakePrompts(
  companions: NameChangeFormCompanion[],
): NameChangeFormCompanionIntakePrompt[] {
  const grouped = new Map<string, {
    field: NameChangeFormCompanionField;
    statuses: NameChangeFormCompanionIntakePromptStatus[];
    impactedForms: string[];
    sourceLabels: string[];
  }>();

  companions.forEach((companion) => {
    companion.fields.forEach((field) => {
      if (field.status !== 'missing' && field.status !== 'review') return;

      const current = grouped.get(field.fieldKey) ?? {
        field,
        statuses: [],
        impactedForms: [],
        sourceLabels: [],
      };
      current.field = current.field.status === 'missing' ? current.field : field;
      current.statuses.push(field.status);
      current.impactedForms.push(companion.formCode);
      current.sourceLabels.push(field.sourceLabel);
      grouped.set(field.fieldKey, current);
    });
  });

  return Array.from(grouped.entries())
    .map(([fieldKey, group]) => {
      const status: NameChangeFormCompanionIntakePromptStatus = group.statuses.includes('missing') ? 'missing' : 'review';
      const impactedForms = uniq(group.impactedForms);
      const statusLabel = status === 'missing' ? 'Needs answer' : 'Needs review';
      const helperText = status === 'missing'
        ? `Answer once to unblock ${impactedForms.join(', ')}.`
        : `Review once before using this value in ${impactedForms.join(', ')}.`;

      return {
        promptKey: `${status}:${fieldKey}`,
        fieldKey,
        label: getPromptLabel(group.field),
        question: getPromptQuestion(group.field),
        helperText,
        status,
        statusLabel,
        priority: status === 'missing' ? 0 : 1,
        currentValue: group.field.value,
        formattedValue: group.field.formattedValue,
        impactedForms,
        sourceLabels: uniq(group.sourceLabels),
      };
    })
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      if (right.impactedForms.length !== left.impactedForms.length) return right.impactedForms.length - left.impactedForms.length;
      return left.label.localeCompare(right.label);
    });
}
