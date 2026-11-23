import { useCallback, useEffect, useState } from 'react'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './modules/auth'
import { BannersPage } from './pages/BannersPage'
import { CombosPage } from './pages/CombosPage'
import { ContentPage } from './pages/ContentPage'
import { CouponsPage } from './pages/CouponsPage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { DatabasePage } from './pages/DatabasePage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ThemePage } from './pages/ThemePage'
import type { PageKey } from './types'

const PAGES: PageKey[] = [
  'dashboard',
  'orders',
  'products',
  'theme',
  'coupons',
  'combos',
  'banners',
  'settings',
  'content',
  'customers',
  'database',
]

function currentRoute(): string {
  return window.location.hash.replace(/^#\/?/, '').trim()
}

function readPage(): PageKey {
  const hash = currentRoute()
  // Bookmarks antiguos a #/students siguen llevando a Clientes.
  if (hash === 'students') return 'customers'
  return PAGES.includes(hash as PageKey) ? (hash as PageKey) : 'dashboard'
}

function PanelApp() {
  const [page, setPage] = useState<PageKey>(readPage)

  useEffect(() => {
    const onHashChange = () => setPage(readPage())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: PageKey) => {
    setPage(next)
    window.location.hash = `/${next}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <Layout page={page} onNavigate={navigate}>
      {page === 'dashboard' ? <DashboardPage onNavigate={navigate} /> : null}
      {page === 'orders' ? <OrdersPage /> : null}
      {page === 'products' ? <ProductsPage /> : null}
      {page === 'theme' ? <ThemePage /> : null}
      {page === 'coupons' ? <CouponsPage /> : null}
      {page === 'combos' ? <CombosPage /> : null}
      {page === 'banners' ? <BannersPage /> : null}
      {page === 'settings' ? <SettingsPage /> : null}
      {page === 'content' ? <ContentPage /> : null}
      {page === 'customers' ? <CustomersPage /> : null}
      {page === 'database' ? <DatabasePage /> : null}
    </Layout>
  )
}

export default function App() {
  return (
    <ProtectedRoute>
      <PanelApp />
    </ProtectedRoute>
  )
}
