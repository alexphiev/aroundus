'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface NavigationContextType {
  isLoading: boolean
  startLoading: () => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  const startLoading = () => {
    setIsLoading(true)
  }

  // Reset loading state when pathname changes
  useEffect(() => {
    setIsLoading(false)
  }, [pathname])

  return (
    <NavigationContext.Provider value={{ isLoading, startLoading }}>
      {children}
      <NavigationLoader />
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}

function NavigationLoader() {
  const { isLoading } = useNavigation()

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed top-0 left-0 w-full h-0.5 bg-neutral-200 dark:bg-neutral-700 z-50"
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="h-full bg-neutral-400 dark:bg-neutral-500"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
