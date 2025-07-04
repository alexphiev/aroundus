"use client";

import "../globals.css";
import { SidebarProvider } from "@/components/layout/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Toaster } from "@/components/ui/toaster";
import { NavigationProvider } from "@/components/NavigationLoader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <div className="relative flex h-screen overflow-hidden">
        <SidebarProvider>
          <AppSidebar />

          <main className="flex-1 transition-all duration-300 overflow-hidden">
            {children}
          </main>
        </SidebarProvider>

        <Toaster />
      </div>
    </NavigationProvider>
  );
}
