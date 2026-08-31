export type PluralForms = {
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

export const plural = (forms: PluralForms): PluralForms => forms;
