import chalk from 'chalk';
import { diffLines } from 'diff';

export function renderDiff(before: string, after: string): string {
  const parts = diffLines(before, after);
  const formatted: string[] = [];

  for (const part of parts) {
    const lines = part.value.split('\n').filter(Boolean);

    if (part.added) {
      for (const line of lines) {
        formatted.push(chalk.green(`+ ${line}`));
      }
      continue;
    }

    if (part.removed) {
      for (const line of lines) {
        formatted.push(chalk.red(`- ${line}`));
      }
      continue;
    }

    for (const line of lines) {
      formatted.push(chalk.gray(`  ${line}`));
    }
  }

  return formatted.join('\n');
}
