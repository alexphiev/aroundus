'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export default function LayoutLoader() {
  return (
    <motion.div 
      className="h-screen flex items-center justify-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading discovery...</p>
      </div>
    </motion.div>
  )
}