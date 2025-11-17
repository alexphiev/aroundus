'use client'

import { SearchPlaceInView } from '@/types/search.types'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getPlacePhotos } from '@/actions/search.actions'

interface MobileMapPreviewCardProps {
  place: SearchPlaceInView
  onClick: () => void
}

export default function MobileMapPreviewCard({
  place,
  onClick,
}: MobileMapPreviewCardProps) {
  const [primaryPhoto, setPrimaryPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (place.photos && place.photos.length > 0) {
      const primary = place.photos.find((p) => p.is_primary)
      setPrimaryPhoto(primary?.url || place.photos[0]?.url || null)
    } else {
      getPlacePhotos(place.id, 1).then((photos) => {
        if (photos.length > 0) {
          setPrimaryPhoto(photos[0].url)
        }
      })
    }
  }, [place.id, place.photos])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 300,
      }}
      className="fixed bottom-20 left-4 right-4 z-40"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        onClick={handleClick}
        className="bg-background border-border/20 flex cursor-pointer overflow-hidden rounded-2xl border shadow-xl backdrop-blur-sm transition-transform active:scale-95"
      >
        {primaryPhoto ? (
          <div className="relative h-24 w-24 shrink-0">
            <Image
              src={primaryPhoto}
              alt={place.name}
              fill
              className="object-cover"
              sizes="6rem"
            />
          </div>
        ) : (
          <div className="bg-muted h-24 w-24 shrink-0" />
        )}

        <div className="flex flex-1 flex-col justify-center px-4 py-3">
          <h3 className="line-clamp-1 text-base font-semibold">{place.name}</h3>
          <div className="mt-1 flex items-center gap-1">
            <Star className="text-primary h-4 w-4 fill-current" />
            <span className="text-muted-foreground text-sm font-medium">
              {place.score.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
