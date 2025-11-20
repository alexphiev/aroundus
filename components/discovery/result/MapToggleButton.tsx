'use client'

import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutListIcon, Loader2, MapIcon } from 'lucide-react'

interface Props {
  onClick: () => void
  className?: string
  showingMap?: boolean
  isLoading?: boolean
  hasPreviewCard?: boolean
}

export default function MapToggleButton({
  onClick,
  className = '',
  showingMap = false,
  isLoading = false,
  hasPreviewCard = false,
}: Props) {
  const icon = showingMap ? LayoutListIcon : MapIcon
  const text = showingMap ? 'See results' : 'Map'
  const IconComponent = icon

  // Calculate bottom position: raise above preview card when it exists
  // Preview card is at bottom-20 (5rem = 80px), card height ~96px (h-24), total ~176px
  // Adding more spacing to avoid overlap, using 220px when preview exists
  const bottomPosition = hasPreviewCard ? 190 : 80 // 220px when preview exists, 80px normally

  return (
    <motion.div
      className={`fixed left-1/2 z-50 -translate-x-1/2 transform ${className}`}
      animate={{
        bottom: bottomPosition,
        y: 0,
        opacity: 1,
      }}
      initial={{ y: 100, opacity: 0 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 300,
        bottom: {
          type: 'spring',
          damping: 25,
          stiffness: 300,
        },
      }}
    >
      <Button
        onClick={isLoading ? undefined : onClick}
        variant="outline"
        size="sm"
        className="text-primary border-border/20 hover:bg-background/100 h-10 rounded-full border px-4 shadow-lg backdrop-blur-sm"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              <IconComponent className="mr-2 h-4 w-4" />
              <span className="text-sm font-medium">{text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  )
}
