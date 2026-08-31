import type { AnalysisState } from "../../../domain/contracts";
import { useI18n } from "../../../i18n/context";

const fields = [
  { key: "turnoutMin", label: "table.minTurnout", max: 100 },
  { key: "shareMin", label: "table.minShare", max: 100 },
  { key: "minValidVotes", label: "table.minValid", max: undefined },
] as const;

export function LocalityResultsFilters(props: {
  analysis: AnalysisState;
  write(next: AnalysisState): void;
}) {
  const { t } = useI18n();
  const update = (key: (typeof fields)[number]["key"], value: string) => {
    props.write({ ...props.analysis, [key]: value === "" ? undefined : Number(value) });
  };
  return (
    <div class="filter-grid">
      {fields.map((field) => (
        <label>
          {t(field.label)}
          <input
            name={field.key}
            type="number"
            min="0"
            max={field.max}
            value={props.analysis[field.key] ?? ""}
            onInput={(event) => update(field.key, event.currentTarget.value)}
            autocomplete="off"
          />
        </label>
      ))}
    </div>
  );
}
