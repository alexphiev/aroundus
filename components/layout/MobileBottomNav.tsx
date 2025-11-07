'use client'

import { useNavigation } from '@/components/NavigationLoader'
import { signOutAction } from '@/app/actions'
import { Compass, Home, LogOut, Map, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Navigation links for mobile bottom bar
const navLinks = [
  {
    label: 'Home',
    href: '/',
    icon: Home,
  },
  {
    label: 'Discover',
    href: '/discover',
    icon: Compass,
  },
  {
    label: 'Search',
    href: '/search',
    icon: Search,
  },
  {
    label: 'Explore',
    href: '/explore',
    icon: Map,
  },
  {
    label: 'Logout',
    href: '/logout',
    icon: LogOut,
    isLogout: true,
  },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { startLoading } = useNavigation()

  const handleNavClick = (href: string) => {
    if (pathname !== href) {
      startLoading()
    }
  }

  const handleLogout = async () => {
    startLoading()
    await signOutAction()
  }

  return (
    <div className="bg-background border-border/90 fixed right-0 bottom-0 left-0 z-50 border-t md:hidden">
      <div className="safe-area-bottom flex h-14 items-center justify-around">
        {navLinks.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          // Handle logout differently from regular navigation
          if (link.isLogout) {
            return (
              <button
                key={link.href}
                onClick={handleLogout}
                className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg transition-colors"
              >
                <Icon className="mb-1 h-5 w-5 text-muted-foreground transition-colors" />
                <span className="text-xs leading-tight text-muted-foreground transition-colors">
                  {link.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => handleNavClick(link.href)}
              className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg transition-colors"
            >
              <Icon
                className={`mb-1 h-5 w-5 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <span
                className={`text-xs leading-tight transition-colors ${
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
