'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { LayoutListIcon, MapIcon } from 'lucide-react'

interface Props {
  onClick: () => void
  className?: string
  showingMap?: boolean
}

export default function MapToggleButton({
  onClick,
  className = '',
  showingMap = false,
}: Props) {
  const icon = showingMap ? LayoutListIcon : MapIcon
  const text = showingMap ? 'See results' : 'Map'
  const IconComponent = icon

  return (
    <motion.div
      className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 transform ${className}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 300,
      }}
    >
      <Button
        onClick={onClick}
        variant="link"
        size="sm"
        className="bg-background/95 border-border/20 hover:bg-background/100 h-10 rounded-full border px-4 shadow-lg backdrop-blur-sm"
      >
        <IconComponent className="mr-2 h-4 w-4" />
        <span className="text-sm font-medium">{text}</span>
      </Button>
    </motion.div>
  )
}
