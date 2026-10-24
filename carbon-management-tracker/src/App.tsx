import { useState } from 'react'
import './App.css'
import HomePage from './pages/HomePage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import HistoryPage from './pages/HistoryPage.tsx'
import InsightsPage from './pages/InsightsPage.tsx'
import Toast from './components/Toast.tsx'
import PlaceholderPage from './pages/PlaceholderPage.tsx'
import homeIcon from './assets/icons/home.svg'
import insightsIcon from './assets/icons/insights.svg'
import historyIcon from './assets/icons/history.svg'
import friendsIcon from './assets/icons/friends.svg'
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
  return (
    <div className="app">
      <nav className="sidebar" aria-label="Main">
        <div className="nav__profile">
          <NavLink to="/dashboard/profile" className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
            <img src={userIcon} alt="" className="sidebar__avatar" />
            <span className="nav__label">Profile</span>
          </NavLink>
        </div>
        <div className="nav__list">
          {PAGES.map((page) => (
            <NavLink key={page.path} to={page.path} end={page.path === '/dashboard'}
              className={({ isActive }) => 'nav__item' + (isActive ? ' nav__item--active' : '')}>
              <img src={page.icon} alt="" className="nav__icon" />
              <span className="nav__label">{page.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {page === 'home' && <HomePage />}
      {page === 'insights' && <InsightsPage />}
      {page === 'history' && <HistoryPage onGoHome={() => setPage('home')} />}
      {page === 'profile' && (
        <PlaceholderPage
          title="Profile"
          description="Your name, household size and diet preference."
        />
      )}

      <Toast />
    </div>
  )
}

export default App

