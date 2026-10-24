import { Navigate, type RouteObject } from 'react-router-dom'
import App from './App'
import Home from './routes/Home'
import ProtectedRoute from './routes/ProtectedRoute'
import Signin from './components/Signin'
import Signup from './components/Signup'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import InsightsPage from './pages/InsightsPage'
import ProfilePage from './pages/ProfilePage'
import FriendsPage from './pages/FriendsPage'

// Shared by createBrowserRouter in the app and createMemoryRouter in tests.
export const routes: RouteObject[] = [
  {
    element: <Home />,
    children: [
      { path: '/', element: <Signin /> },
      { path: '/signup', element: <Signup /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <App />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'insights', element: <InsightsPage /> },
          { path: 'friends', element: <FriendsPage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

