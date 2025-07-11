import { Sidebar, SidebarBody, SidebarLink } from '@/components/layout/sidebar'
import { Compass, Home, Map, User } from 'lucide-react'

// Default navigation links used throughout the app
const navLinks = [
  {
    label: 'Home',
    href: '/',
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: 'Discover',
    href: '/discover',
    icon: <Compass className="h-5 w-5" />,
  },
  {
    label: 'My Trips',
    href: '/past-places',
    icon: <Map className="h-5 w-5" />,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: <User className="h-5 w-5" />,
  },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarBody>
        {/* Navigation Links */}
        <div className="mb-4 mt-4 space-y-1">
          {navLinks.map((link) => (
            <SidebarLink key={link.href} link={link} />
          ))}
        </div>
      </SidebarBody>
    </Sidebar>
  )
}
