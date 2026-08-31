export function InsightCard(props: { label: string; value: string }) {
  return (
    <article class="insight">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}
