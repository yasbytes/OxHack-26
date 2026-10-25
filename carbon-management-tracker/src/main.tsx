import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorScreen'
import { AuthContextProvider } from './context/AuthContext'
import { router } from './router'
import './index.css'
import './App.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthContextProvider>
        <RouterProvider router={router} />
      </AuthContextProvider>
    </ErrorBoundary>
  </StrictMode>,
)

