'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { MapIcon } from 'lucide-react'

interface Props {
  onClick: () => void
  className?: string
}

export default function MapToggleButton({ onClick, className = '' }: Props) {
  return (
    <motion.div
      className={`fixed bottom-18 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
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
        className="h-10 px-4 rounded-full shadow-lg bg-background/95 backdrop-blur-sm border border-border/20 hover:bg-background/100"
      >
        <MapIcon className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">Map</span>
      </Button>
    </motion.div>
  )
}
