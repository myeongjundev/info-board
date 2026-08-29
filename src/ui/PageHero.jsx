export default function PageHero({ eyebrow, title, description, aside, tone = 'playing' }) {
  return (
    <section className={`page-hero is-${tone}`}>
      <div className="page-hero-copy">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {aside && <div className="page-hero-aside">{aside}</div>}
    </section>
  );
}
