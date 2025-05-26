"use client";

import "../globals.css";
import { SidebarProvider } from "@/components/layout/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Toaster } from "@/components/ui/toaster";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <SidebarProvider>
        <AppSidebar />

        <main className="flex-1 md:ml-[60px] transition-all duration-300 pt-4">
          {children}
        </main>
      </SidebarProvider>

      <Toaster />
    </div>
  );
}
