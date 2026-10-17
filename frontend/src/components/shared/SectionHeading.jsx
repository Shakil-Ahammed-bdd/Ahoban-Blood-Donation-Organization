function SectionHeading({
  description,
  highlight,
  id,
  kicker,
  title,
}) {
  return (
    <header className="section-heading">
      <span className="section-kicker">
        <span aria-hidden="true">♥</span> {kicker}
      </span>
      <h2 id={id}>
        {title} <span>{highlight}</span>
      </h2>
      <p>{description}</p>
    </header>
  )
}

export default SectionHeading
