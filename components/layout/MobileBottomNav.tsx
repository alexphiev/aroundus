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
    disabled: true,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
    disabled: true,
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
    <div className="bg-background border-border/90 fixed right-0 bottom-0 left-0 z-50 border-t md:hidden">
      <div className="safe-area-bottom flex h-14 items-center justify-around">
        {navLinks.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => (link.disabled ? null : handleNavClick(link.href))}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg transition-colors ${
                link.disabled ? 'pointer-events-none opacity-50' : ''
              }`}
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
