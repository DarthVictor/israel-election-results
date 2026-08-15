import { createEffect } from "solid-js";
import { render } from "solid-js/web";
import { App } from "./app/App";
import { createLocaleStorage } from "./app/create-browser-explorer-dependencies";
import { I18nProvider, useI18n } from "./i18n/context";
import en from "./i18n/dictionaries/en";
import "./styles/base.css";

const root = document.getElementById("root");

if (!root) {
  // Thrown before the provider exists, so this one message cannot be translated.
  throw new Error(en.app.rootMissing);
}

/**
 * index.html carries the same attributes for the stored locale before first paint; this keeps
 * them correct after a switch, and is also what re-mirrors the layout without a reload.
 */
function DocumentLanguage() {
  const { locale, direction } = useI18n();
  createEffect(() => {
    document.documentElement.lang = locale();
    document.documentElement.dir = direction();
  });
  return null;
}

render(
  () => (
    <I18nProvider storage={createLocaleStorage()}>
      <DocumentLanguage />
      <App />
    </I18nProvider>
  ),
  root,
);
