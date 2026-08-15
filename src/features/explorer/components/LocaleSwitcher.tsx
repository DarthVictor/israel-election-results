import { For } from "solid-js";
import { useI18n } from "../../../i18n/context";
import { isLocale, LOCALES, LOCALE_LABELS } from "../../../i18n/locales";

/**
 * A native select rather than a custom menu: it is keyboard- and screen-reader-correct for
 * free, and each option is labelled in its own language so it is readable from any locale.
 */
export function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <select
      class="locale-switcher"
      data-testid="locale-switcher"
      aria-label={t("header.locale")}
      value={locale()}
      onInput={(event) => {
        const next = event.currentTarget.value;
        if (isLocale(next)) setLocale(next);
      }}
    >
      <For each={LOCALES}>
        {(item) => (
          // The option text is always in its own language, so it never needs translating.
          <option value={item} lang={item}>
            {LOCALE_LABELS[item]}
          </option>
        )}
      </For>
    </select>
  );
}
