'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

interface Props {
  onClick: () => void
  className?: string
}

export default function FloatingActionButton({
  onClick,
  className = '',
}: Props) {
  return (
    <motion.div
      className={`fixed bottom-20 right-4 z-100 ${className}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        damping: 15,
        stiffness: 300,
        delay: 0.2,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        onClick={onClick}
        size="lg"
        className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90"
      >
        <Plus className="h-10 w-10" />
      </Button>
    </motion.div>
  )
}
