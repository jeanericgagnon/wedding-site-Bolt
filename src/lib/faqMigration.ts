export interface FaqMigrationLine {
  question: string;
  answer: string;
}

function normalizeQuestion(question: string): string {
  const trimmed = question.trim().replace(/^[-•*\s]+/, '').replace(/:+$/, '').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('?') ? trimmed : `${trimmed}?`;
}

function normalizeAnswer(answer: string): string {
  return answer.trim().replace(/^[-•*\s]+/, '').replace(/^:+/, '').trim();
}

export function shapeImportedFaqLines(raw: string | null | undefined): FaqMigrationLine[] {
  if (!raw?.trim()) return [];

  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.includes('::')) {
        const [question, ...rest] = line.split('::');
        return { question: normalizeQuestion(question), answer: normalizeAnswer(rest.join('::')) };
      }

      if (line.includes('?')) {
        const idx = line.indexOf('?');
        return {
          question: normalizeQuestion(line.slice(0, idx + 1)),
          answer: normalizeAnswer(line.slice(idx + 1)),
        };
      }

      if (line.includes(' - ')) {
        const [question, ...rest] = line.split(' - ');
        return { question: normalizeQuestion(question), answer: normalizeAnswer(rest.join(' - ')) };
      }

      return null;
    })
    .filter((item): item is FaqMigrationLine => Boolean(item?.question && item?.answer));
}

export function serializeImportedFaqLines(lines: FaqMigrationLine[]): string {
  return lines.map((line) => `${line.question}::${line.answer}`).join('\n');
}
