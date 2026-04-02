import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { ChatFAB } from './ChatFAB'
import { SearchDialog } from '@/components/ui'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col">
      {/* Header */}
      <Header />

      {/* Global search overlay */}
      <SearchDialog />

      {/* Main content */}
      <main className="flex-1 pb-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      {/* Floating Chat FAB */}
      <ChatFAB />

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
