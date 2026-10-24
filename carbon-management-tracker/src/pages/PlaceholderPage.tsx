type Props = {
  title: string
  description: string
}

// Stands in for pages that haven't been built yet so the nav never dead-ends
function PlaceholderPage({ title, description }: Props) {
  return (
    <main className="main">
      <header className="header">
        <h1 className="header__greeting">{title}</h1>
      </header>
      <section className="card placeholder">
        <p className="placeholder__text">{description}</p>
        <p className="log-panel__empty">Coming soon</p>
      </section>
    </main>
  )
}

export default PlaceholderPage
