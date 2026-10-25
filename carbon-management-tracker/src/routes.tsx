import { Navigate, type RouteObject } from 'react-router-dom'
import App from './App'
import Home from './routes/Home'
import ProtectedRoute from './routes/ProtectedRoute'
import { RouteErrorScreen } from './components/ErrorScreen'
import Signin from './components/Signin'
import Signup from './components/Signup'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import InsightsPage from './pages/InsightsPage'
import ProfilePage from './pages/ProfilePage'
import FriendsPage from './pages/FriendsPage'
import ShopPage from './pages/ShopPage'
import InfoPage from './pages/InfoPage'

// Shared by createBrowserRouter in the app and createMemoryRouter in tests.
export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorScreen />,
    children: [
      {
        element: <Home />,
        children: [
          { path: '/', element: <Signin /> },
          { path: '/signup', element: <Signup /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
        ],
      },
      // Outside Home: the reset link signs the person in, and Home would send them on to the dashboard
      { path: '/reset-password', element: <ResetPassword /> },
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
              { path: 'shop', element: <ShopPage /> },
              { path: 'info', element: <InfoPage /> },
              { path: 'profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
