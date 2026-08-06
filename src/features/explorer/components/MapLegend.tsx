export function MapLegend(props: { compareMode: boolean }) {
  return (
    <div class="map-legend" aria-label="Map color legend">
      <span>{props.compareMode ? "B share minus A share" : "List vote share"}</span>
      <div classList={{ "legend-scale": true, comparison: props.compareMode }}>
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div class="legend-labels">
        <span>{props.compareMode ? "-100 pp (A)" : "Lower"}</span>
        <span>{props.compareMode ? "0 pp" : ""}</span>
        <span>{props.compareMode ? "+100 pp (B)" : "Higher"}</span>
      </div>
      <small>Gray: no matching data</small>
    </div>
  );
}
