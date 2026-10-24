import { NavLink, Outlet } from 'react-router-dom'
import Toast from './components/Toast'
import homeIcon from './assets/icons/home.svg'
import insightsIcon from './assets/icons/insights.svg'
import historyIcon from './assets/icons/history.svg'
import userIcon from './assets/icons/user.svg'

const PAGES = [
  { path: '/dashboard', label: 'Home', icon: homeIcon },
  { path: '/dashboard/insights', label: 'Insights', icon: insightsIcon },
  { path: '/dashboard/history', label: 'History', icon: historyIcon },
]

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
      <Outlet />
      <Toast />
    </div>
  )
}

export default App

