import { For } from "solid-js";
import { useI18n } from "../../../i18n/context";
import { isLocale, LOCALE_LABELS, LOCALES } from "../../../i18n/locales";

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div class="locale-switcher" data-testid="locale-switcher">
      <For each={LOCALES}>
        {(item) => (
          <button
            type="button"
            class="toggle-option"
            classList={{ active: locale() === item }}
            aria-pressed={locale() === item}
            lang={item}
            data-testid={`locale-option-${item}`}
            onClick={() => {
              if (isLocale(item)) setLocale(item);
            }}
          >
            {LOCALE_LABELS[item]}
          </button>
        )}
      </For>
    </div>
  );
}
