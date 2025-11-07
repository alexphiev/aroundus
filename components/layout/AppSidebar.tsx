import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/layout/sidebar'
import { signOutAction } from '@/app/actions'
import { Compass, Home, LogOut, Map, Heart, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

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
    label: 'Search',
    href: '/search',
    icon: <Search className="h-5 w-5" />,
  },
  {
    label: 'Explore',
    href: '/explore',
    icon: <Map className="h-5 w-5" />,
  },
  {
    label: 'Favorites',
    href: '/past-places',
    icon: <Heart className="h-5 w-5" />,
  },
]

function SidebarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  const { open, animate } = useSidebar()

  return (
    <button
      onClick={onClick}
      className={cn(
        'group/sidebar flex w-full items-center justify-start gap-2 rounded-md px-2 py-2 transition-colors cursor-pointer',
        'hover:bg-neutral-150 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200'
      )}
    >
      <span className="text-neutral-700 transition-colors dark:text-neutral-200">
        {icon}
      </span>
      <motion.span
        initial={{ display: 'none', opacity: 0 }}
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'none',
          opacity: animate ? (open ? 1 : 0) : 0,
        }}
        transition={{ duration: animate ? 0.2 : 0 }}
        className={cn(
          'inline-block text-sm whitespace-pre transition duration-150 group-hover/sidebar:translate-x-1',
          'text-neutral-700 dark:text-neutral-200'
        )}
      >
        {label}
      </motion.span>
    </button>
  )
}

export default function AppSidebar() {
  const handleLogout = async () => {
    await signOutAction()
  }

  return (
    <Sidebar>
      <SidebarBody>
        <div className="mt-4 mb-4 space-y-1">
          {navLinks.map((link) => (
            <SidebarLink key={link.href} link={link} />
          ))}
        </div>

        <div className="mt-auto space-y-1 border-t border-neutral-200 pt-4 dark:border-neutral-700">
          <SidebarButton
            icon={<LogOut className="h-5 w-5" />}
            label="Logout"
            onClick={handleLogout}
          />
        </div>
      </SidebarBody>
    </Sidebar>
  )
}
