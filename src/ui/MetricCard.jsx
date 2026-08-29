export default function MetricCard({ label, value, meta, tone = 'playing' }) {
  return (
    <article className={`metric-card is-${tone}`}>
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      {meta && <small>{meta}</small>}
    </article>
  );
}
