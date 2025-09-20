import enquirer from 'enquirer';

const prompt = enquirer.prompt.bind(enquirer) as typeof enquirer.prompt;
type PromptQuestion = Parameters<typeof prompt>[0];

export async function confirmPrompt(message: string, initial = true): Promise<boolean> {
  const { value } = await prompt<{ value: boolean }>({
    type: 'confirm' as const,
    name: 'value',
    message,
    initial,
  });
  return value;
}

export async function passwordPrompt(message: string): Promise<string> {
  const { value } = await prompt<{ value: string }>({
    type: 'password' as const,
    name: 'value',
    message,
    validate: (input: string) => input.trim().length > 0 || 'Value required',
  });
  return value;
}

export interface MultiSelectChoice {
  name: string;
  message?: string;
  hint?: string;
}

export async function multiSelectPrompt(message: string, choices: MultiSelectChoice[], initial: string[] = []): Promise<string[]> {
  const question = {
    type: 'multiselect' as const,
    name: 'value',
    message,
    choices: choices.map((choice) => ({
      name: choice.name,
      message: choice.message || choice.name,
      hint: choice.hint,
      value: choice.name,
    })),
    initial,
  } as PromptQuestion;

  const { value } = await prompt<{ value: string[] }>(question);
  return value;
}

export async function selectPrompt(message: string, choices: string[], initial?: string): Promise<string> {
  const question = {
    type: 'select' as const,
    name: 'value',
    message,
    choices,
    initial,
  } as PromptQuestion;

  const { value } = await prompt<{ value: string }>(question);
  return value;
}
