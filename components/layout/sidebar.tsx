'use client'

import { cn } from '@/services/utils'
import Link, { LinkProps } from 'next/link'
import React, { useState, createContext, useContext } from 'react'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useNavigation } from '@/components/NavigationLoader'

interface Links {
  label: string
  href: string
  icon: React.JSX.Element | React.ReactNode
}

interface SidebarContextProps {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  const [openState, setOpenState] = useState(false)

  const open = openProp !== undefined ? openProp : openState
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  animate?: boolean
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  )
}

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      {/* MobileSidebar removed - using MobileBottomNav instead */}
    </>
  )
}

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar()
  return (
    <motion.div
      className={cn(
        'h-full px-4 py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 fixed left-0 top-0 z-50',
        className
      )}
      initial={{ width: '3.75rem' }}
      animate={{
        width: animate ? (open ? '11rem' : '3.75rem') : '3.75rem',
      }}
      transition={{ duration: animate ? 0.2 : 0 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// MobileSidebar removed - using MobileBottomNav instead

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links
  className?: string
  props?: LinkProps
}) => {
  const { open, animate } = useSidebar()
  const pathname = usePathname()
  const { startLoading } = useNavigation()
  const isActive = pathname === link.href

  const handleClick = () => {
    if (pathname !== link.href) {
      startLoading()
    }
  }

  return (
    <Link
      href={link.href}
      onClick={handleClick}
      className={cn(
        'flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md transition-colors',
        isActive
          ? 'text-primary'
          : 'hover:bg-neutral-150 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'transition-colors',
          isActive ? 'text-primary' : 'text-neutral-700 dark:text-neutral-200'
        )}
      >
        {link.icon}
      </span>
      <motion.span
        initial={{ display: 'none', opacity: 0 }}
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'none',
          opacity: animate ? (open ? 1 : 0) : 0,
        }}
        transition={{ duration: animate ? 0.2 : 0 }}
        className={cn(
          'text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block p-0! m-0!',
          isActive
            ? 'text-primary font-medium'
            : 'text-neutral-700 dark:text-neutral-200'
        )}
      >
        {link.label}
      </motion.span>
    </Link>
  )
}
