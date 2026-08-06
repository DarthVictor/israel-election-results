export function ExportActions(props: { onCopy(): void; onCsv(): void; onPng(): void }) {
  return (
    <div class="action-row">
      <button type="button" onClick={() => props.onCopy()} data-testid="copy-link">
        Copy link
      </button>
      <button type="button" onClick={() => props.onCsv()} data-testid="export-csv">
        CSV
      </button>
      <button type="button" onClick={() => props.onPng()} data-testid="export-png">
        PNG
      </button>
    </div>
  );
}
