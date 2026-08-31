import { createContext, createSignal, type JSX, useContext } from "solid-js";
import { createI18n, type I18n } from "./create-i18n";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { type LocaleStorage, readStoredLocale } from "./storage";

const I18nContext = createContext<I18n>();

export function I18nProvider(props: {
  children: JSX.Element;
  storage?: LocaleStorage;
  /** Overrides the stored locale, for tests and for rendering a fixed language. */
  initial?: Locale;
}) {
  const [locale, setLocale] = createSignal<Locale>(
    // Both props are infrastructure fixed at mount — a storage adapter and a one-time
    // override — so reading them once here is the intent, not a missed subscription.
    // eslint-disable-next-line solid/reactivity
    props.initial ?? readStoredLocale(props.storage) ?? DEFAULT_LOCALE,
  );
  const i18n = createI18n(locale, (next) => {
    setLocale(next);
    props.storage?.write(next);
  });

  return <I18nContext.Provider value={i18n}>{props.children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside an I18nProvider.");
  return context;
}
