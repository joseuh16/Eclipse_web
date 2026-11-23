import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { StoreProvider } from './context/StoreContext'
import { CustomerAuthProvider } from './context/CustomerAuthContext'
import { ToastProvider } from './context/ToastContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <StoreProvider>
        <CustomerAuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </CustomerAuthProvider>
      </StoreProvider>
    </ToastProvider>
  </StrictMode>,
)
