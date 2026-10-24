import { useState } from 'react'
import './App.css'
import HomePage from './pages/HomePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import PlaceholderPage from './pages/PlaceholderPage.tsx'
import homeIcon from './assets/icons/home.svg'
import insightsIcon from './assets/icons/insights.svg'
import historyIcon from './assets/icons/history.svg'
import userIcon from './assets/icons/user.svg'

const PAGES = [
  { id: 'home', label: 'Home', icon: homeIcon },
  { id: 'insights', label: 'Insights', icon: insightsIcon },
  { id: 'history', label: 'History', icon: historyIcon },
] as const
type Page = (typeof PAGES)[number]['id'] | 'profile'

type NavItemProps = {
  label: string
  icon: string
  iconClass: string
  active: boolean
  onClick: () => void
}

function NavItem({ label, icon, iconClass, active, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={`nav__item${active ? ' nav__item--active' : ''}`}
      onClick={onClick}
    >
      <img src={icon} alt="" className={iconClass} />
      <span className="nav__label">{label}</span>
    </button>
  )
}

function App() {
  const [page, setPage] = useState<Page>('home')
  // Front end only: any email and password gets in until auth exists
  const [loggedIn, setLoggedIn] = useState(false)

  if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Main">
        <div className="nav__list">
          {PAGES.map((p) => (
            <NavItem
              key={p.id}
              label={p.label}
              icon={p.icon}
              iconClass="nav__icon"
              active={page === p.id}
              onClick={() => setPage(p.id)}
            />
          ))}
        </div>
        <div className="nav__profile">
          <NavItem
            label="Profile"
            icon={userIcon}
            iconClass="sidebar__avatar"
            active={page === 'profile'}
            onClick={() => setPage('profile')}
          />
        </div>
      </nav>

      {page === 'home' && <HomePage />}
      {page === 'insights' && (
        <PlaceholderPage
          title="Insights"
          description="Your footprint over time, split by travel, energy and food."
        />
      )}
      {page === 'history' && (
        <PlaceholderPage
          title="History"
          description="Everything you've logged, so you can edit or delete entries."
        />
      )}
      {page === 'profile' && (
        <PlaceholderPage
          title="Profile"
          description="Your name, household size and diet preference."
        />
      )}
    </div>
  )
}

export default App
