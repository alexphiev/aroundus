'use client'

import { useNavigation } from '@/components/NavigationLoader'
import { Compass, Home, Map, User } from 'lucide-react'
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
    label: 'My Trips',
    href: '/past-places',
    icon: Map,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/20 md:hidden">
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {navLinks.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => handleNavClick(link.href)}
              className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors min-w-0 flex-1"
            >
              <Icon
                className={`h-5 w-5 mb-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
              <span
                className={`text-xs transition-colors leading-tight ${
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground'
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