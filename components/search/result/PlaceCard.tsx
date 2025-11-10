'use client'

import { getPlacePhotos } from '@/actions/search.actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SearchPlaceInView, SearchPlacePhoto } from '@/types/search.types'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ImageIcon, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface PlaceCardProps {
  place: SearchPlaceInView
  index: number
  isActive: boolean
  onClick: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function PlaceCard({
  place,
  index,
  isActive,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PlaceCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [photos, setPhotos] = useState<SearchPlacePhoto[] | undefined>(
    place.photos
  )
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const hasLoadedPhotos = useRef(false)

  // Lazy load photos when card becomes visible
  useEffect(() => {
    // If photos already exist, don't fetch again
    if (photos || hasLoadedPhotos.current) {
      return
    }

    // Use Intersection Observer to detect when card is visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoadedPhotos.current) {
            hasLoadedPhotos.current = true
            setIsLoadingPhotos(true)
            // Load only 3 photos max for place cards
            getPlacePhotos(place.id, 3)
              .then((loadedPhotos) => {
                setPhotos(loadedPhotos)
              })
              .catch((error) => {
                console.error('Error loading photos:', error)
              })
              .finally(() => {
                setIsLoadingPhotos(false)
              })
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before card is visible
      }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => {
      observer.disconnect()
      hasLoadedPhotos.current = false // Reset on unmount
    }
  }, [place.id, photos])

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (photos && photos.length > 0) {
      setCurrentPhotoIndex((prev) =>
        prev === photos.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (photos && photos.length > 0) {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? photos.length - 1 : prev - 1
      )
    }
  }

  return (
    <motion.div
      ref={cardRef}
      key={place.id || index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        ease: 'easeOut',
      }}
      layout
    >
      <Card
        className={`card-interactive card-layout pt-0 ${
          isActive ? 'card-active' : ''
        }`}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Photo Carousel or Placeholder */}
        <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
          {isLoadingPhotos ? (
            <div className="flex h-full w-full items-center justify-center bg-[#F5F5F5]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600"></div>
            </div>
          ) : photos && photos.length > 0 ? (
            <>
              <Image
                src={photos[currentPhotoIndex].url}
                alt={`${place.name} - Photo ${currentPhotoIndex + 1}`}
                className="h-full w-full object-cover"
                width={300}
                height={300}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />

              {/* Photo Navigation */}
              {photos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 left-2 h-8 w-8 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    onClick={prevPhoto}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    onClick={nextPhoto}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {/* Photo Indicators */}
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                    {photos.map((_, photoIndex) => (
                      <div
                        key={photoIndex}
                        className={`h-2 w-2 rounded-full ${
                          photoIndex === currentPhotoIndex
                            ? 'bg-white'
                            : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#F5F5F5]">
              <ImageIcon className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        <CardHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1">
              <div className="text-muted-foreground ml-2 flex items-center gap-1 text-xs">
                <span>{place.type}</span>
              </div>

              {/* Score */}
              {place.score && (
                <div className="text-muted-foreground ml-2 flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{place.score.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
          <CardTitle className="text-card-title mt-2">{place.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <CardDescription className="text-card-description mb-3 flex-shrink-0">
            {place.description}
          </CardDescription>

          <div className="space-content flex-1">
            {/* Best Time to Visit - Bottom with 3-line limit */}
            {place.wikipedia_query && (
              <div className="space-tight">
                <div className="bg-status-success rounded-md p-2">
                  <p className="text-status-success-foreground line-clamp-3 text-xs leading-relaxed">
                    Wikipedia URL:{' '}
                    <Link
                      href={`https://fr.wikipedia.org/wiki/${place.wikipedia_query}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {place.wikipedia_query}
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
