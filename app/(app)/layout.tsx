'use client'

import { SidebarProvider } from '@/components/layout/sidebar'
import { NavigationProvider } from '@/components/NavigationLoader'
import { Toaster } from '@/components/ui/sonner'
import dynamic from 'next/dynamic'
import '../globals.css'

const AppSidebar = dynamic(() => import('@/components/layout/AppSidebar'), {
  ssr: true,
})

const MobileBottomNav = dynamic(
  () => import('@/components/layout/MobileBottomNav'),
  {
    ssr: true,
  }
)

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <div className="relative flex h-[calc(100dvh-3.5rem)] overflow-hidden md:h-[100dvh]">
        <SidebarProvider>
          <div className="hidden md:block">
            <AppSidebar />
          </div>

          <main className="flex flex-1 flex-col overflow-hidden transition-all duration-300">
            <div className="flex-1 md:pb-0">{children}</div>
          </main>
        </SidebarProvider>

        <Toaster />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="block md:hidden">
        <MobileBottomNav />
      </div>
    </NavigationProvider>
  )
}
