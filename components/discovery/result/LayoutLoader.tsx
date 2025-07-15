'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export default function LayoutLoader() {
  return (
    <motion.div
      className="bg-background flex h-[100dvh] items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">Loading discovery...</p>
      </div>
    </motion.div>
  )
}
