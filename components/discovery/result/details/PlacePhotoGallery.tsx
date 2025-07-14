'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlacePhoto } from '@/types/result.types'
import { Camera, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface PlacePhotoGalleryProps {
  photos: PlacePhoto[]
  placeName: string
}

export default function PlacePhotoGallery({
  photos,
  placeName,
}: PlacePhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PlacePhoto | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  // Handle image load errors
  const handleImageError = (photoUrl: string) => {
    setImageErrors((prev) => new Set([...prev, photoUrl]))
  }

  // Filter out photos with errors
  const validPhotos = photos.filter((photo) => !imageErrors.has(photo.url))

  if (!validPhotos.length) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {validPhotos.slice(0, 4).map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedPhoto(photo)}
              >
                <Image
                  src={photo.url}
                  alt={`${placeName} - Photo ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  onError={() => handleImageError(photo.url)}
                />
                {index === 3 && validPhotos.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-medium">
                      +{validPhotos.length - 4} more
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {validPhotos.some((photo) => photo.attribution) && (
            <div className="mt-3 pt-3 border-t border-muted">
              <p className="text-xs text-muted-foreground">
                Photos from Google Places contributors
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <ExternalLink className="h-4 w-4 rotate-45" />
            </button>

            <div className="relative w-full h-full">
              <Image
                src={selectedPhoto.url}
                alt={`${placeName} - Full size photo`}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
            </div>

            {selectedPhoto.attribution && (
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
                Photo by {selectedPhoto.attribution}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
