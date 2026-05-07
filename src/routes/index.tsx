import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { ErrorBoundary } from '@/components/ui'

// Eagerly loaded pages (critical path)
import { ProfileSelection } from '@/pages/ProfileSelection'
import { Dashboard } from '@/pages/Dashboard'

// Lazy loaded pages
const StockAnalysis = lazy(() => import('@/pages/StockAnalysis').then(m => ({ default: m.StockAnalysis })))
const SegmentDeepDive = lazy(() => import('@/pages/SegmentDeepDive').then(m => ({ default: m.SegmentDeepDive })))
const Chat = lazy(() => import('@/pages/Chat').then(m => ({ default: m.Chat })))
const Compare = lazy(() => import('@/pages/Compare').then(m => ({ default: m.Compare })))
const Journal = lazy(() => import('@/pages/Journal').then(m => ({ default: m.Journal })))
const Portfolio = lazy(() => import('@/pages/Portfolio').then(m => ({ default: m.Portfolio })))
const Discover = lazy(() => import('@/pages/Discover').then(m => ({ default: m.Discover })))
const Advisors = lazy(() => import('@/pages/Advisors').then(m => ({ default: m.Advisors })))
const Backtest = lazy(() => import('@/pages/Backtest').then(m => ({ default: m.Backtest })))
const Alerts = lazy(() => import('@/pages/Alerts').then(m => ({ default: m.Alerts })))
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))
const Lab = lazy(() => import('@/pages/lab').then(m => ({ default: m.Lab })))

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-neutral-400">Loading...</span>
      </div>
    </div>
  )
}

// Wrapper for lazy components with error boundary
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Profile Selection - Entry point for demo */}
      <Route path="/" element={<ProfileSelection />} />

      {/* Main app routes with layout */}
      <Route element={<MainLayout />}>
        {/* Dashboard - eagerly loaded for fast access */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Stock Analysis - lazy loaded (supports /stock/:ticker and /stock/:ticker/info) */}
        <Route
          path="/stock/:ticker/*"
          element={
            <LazyPage>
              <StockAnalysis />
            </LazyPage>
          }
        />

        {/* Segment Deep Dive - lazy loaded */}
        <Route
          path="/segment/:ticker/:segmentId"
          element={
            <LazyPage>
              <SegmentDeepDive />
            </LazyPage>
          }
        />

        {/* Chat - lazy loaded */}
        <Route
          path="/chat"
          element={
            <LazyPage>
              <Chat />
            </LazyPage>
          }
        />

        {/* Compare - lazy loaded */}
        <Route
          path="/compare"
          element={
            <LazyPage>
              <Compare />
            </LazyPage>
          }
        />

        {/* Journal - lazy loaded */}
        <Route
          path="/journal"
          element={
            <LazyPage>
              <Journal />
            </LazyPage>
          }
        />

        {/* Portfolio - lazy loaded */}
        <Route
          path="/portfolio"
          element={
            <LazyPage>
              <Portfolio />
            </LazyPage>
          }
        />

        {/* Discover - lazy loaded */}
        <Route
          path="/discover"
          element={
            <LazyPage>
              <Discover />
            </LazyPage>
          }
        />

        {/* Advisors - lazy loaded */}
        <Route
          path="/advisors"
          element={
            <LazyPage>
              <Advisors />
            </LazyPage>
          }
        />

        {/* Backtest - lazy loaded */}
        <Route
          path="/backtest"
          element={
            <LazyPage>
              <Backtest />
            </LazyPage>
          }
        />

        {/* Alerts - lazy loaded */}
        <Route
          path="/alerts"
          element={
            <LazyPage>
              <Alerts />
            </LazyPage>
          }
        />

        {/* Settings - lazy loaded */}
        <Route
          path="/settings"
          element={
            <LazyPage>
              <Settings />
            </LazyPage>
          }
        />

        {/* Scorecard Lab - experimental variant explorations */}
        <Route
          path="/lab"
          element={
            <LazyPage>
              <Lab />
            </LazyPage>
          }
        />
      </Route>

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
