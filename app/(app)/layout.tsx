'use client'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { SidebarProvider } from '@/components/layout/sidebar'
import { NavigationProvider } from '@/components/NavigationLoader'
import { LocationProvider } from '@/components/providers/LocationProvider'
import { Toaster } from '@/components/ui/sonner'
import '../globals.css'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      <NavigationProvider>
        <div className="relative flex h-screen overflow-hidden">
          <SidebarProvider>
            <AppSidebar />

            <main className="flex-1 transition-all duration-300 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto">{children}</div>
            </main>
          </SidebarProvider>

          <Toaster />
        </div>
      </NavigationProvider>
    </LocationProvider>
  )
}
