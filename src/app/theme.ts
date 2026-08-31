export type AppTheme = "light" | "dark";

export const DEFAULT_THEME: AppTheme = "light";
export const THEME_STORAGE_KEY = "iere.theme";

export type ThemeStorage = {
  read(): string | null;
  write(value: string): void;
};

export const isTheme = (value: unknown): value is AppTheme => value === "light" || value === "dark";

export const readStoredTheme = (storage?: ThemeStorage): AppTheme => {
  const stored = storage?.read();
  return isTheme(stored) ? stored : DEFAULT_THEME;
};
