import { For } from "solid-js";
import { type AppTheme, isTheme } from "../../../app/theme";
import { useI18n } from "../../../i18n/context";

const THEMES: AppTheme[] = ["light", "dark"];

export function ThemeSwitcher(props: { theme: AppTheme; onTheme: (theme: AppTheme) => void }) {
  const { t } = useI18n();
  return (
    <div class="theme-switcher" data-testid="theme-switcher">
      <For each={THEMES}>
        {(theme) => (
          <button
            type="button"
            class="toggle-option"
            classList={{ active: props.theme === theme }}
            aria-pressed={props.theme === theme}
            data-testid={`theme-option-${theme}`}
            onClick={() => {
              if (isTheme(theme)) props.onTheme(theme);
            }}
          >
            {t(`themes.${theme}`)}
          </button>
        )}
      </For>
    </div>
  );
}
