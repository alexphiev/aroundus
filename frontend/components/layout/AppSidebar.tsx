"use client";

import { Sidebar, SidebarBody, SidebarLink } from "@/components/layout/sidebar";
import { Home, Compass, Map, User, Search } from "lucide-react";

// Default navigation links used throughout the app
const navLinks = [
  {
    label: "Home",
    href: "/",
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: "Discover",
    href: "/discover",
    icon: <Compass className="h-5 w-5" />,
  },
  {
    label: "My Trips",
    href: "/search-history",
    icon: <Map className="h-5 w-5" />,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: <User className="h-5 w-5" />,
  },
];

// Custom search link
const searchLink = {
  label: "Search",
  href: "/search-trip",
  icon: <Search className="h-5 w-5" />,
};

export function AppSidebar({ children }: { children?: React.ReactNode }) {
  return (
    <Sidebar>
      <SidebarBody>
        {/* Navigation Links */}
        <div className="mb-4 mt-4 space-y-1">
          {navLinks.map((link) => (
            <SidebarLink key={link.href} link={link} />
          ))}
        </div>

        {/* Special Search Button */}
        <div className="mt-4">
          <SidebarLink link={searchLink} className="font-medium text-primary" />
        </div>

        {/* Optional children content */}
        {children}
      </SidebarBody>
    </Sidebar>
  );
}
