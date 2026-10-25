import { NavLink, Outlet } from 'react-router-dom'
import './App.css'
import Toast from './components/Toast.tsx'
import homeIcon from './assets/icons/home.svg'
import insightsIcon from './assets/icons/insights.svg'
import historyIcon from './assets/icons/history.svg'
import friendsIcon from './assets/icons/friends.svg'
import shopIcon from './assets/icons/shop.svg'
import userIcon from './assets/icons/user.svg'

const PAGES = [
  { path: '/dashboard', label: 'Home', icon: homeIcon },
  { path: '/dashboard/insights', label: 'Insights', icon: insightsIcon },
  { path: '/dashboard/history', label: 'History', icon: historyIcon },
  { path: '/dashboard/friends', label: 'Friends', icon: friendsIcon },
  { path: '/dashboard/shop', label: 'Shop', icon: shopIcon },
]

const navClass = ({ isActive }: { isActive: boolean }) =>
  'nav__item' + (isActive ? ' nav__item--active' : '')

function App() {
  return (
    <div className="app">
      <nav className="sidebar" aria-label="Main">
        <div className="nav__profile">
          <NavLink to="/dashboard/profile" className={navClass}>
            <img src={userIcon} alt="" className="sidebar__avatar" />
            <span className="nav__label">Profile</span>
          </NavLink>
        </div>
        <div className="nav__list">
          {PAGES.map((page) => (
            <NavLink key={page.path} to={page.path} end={page.path === '/dashboard'} className={navClass}>
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
