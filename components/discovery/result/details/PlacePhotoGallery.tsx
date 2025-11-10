'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { PlacePhoto } from '@/types/result.types'
import { Camera, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { createPortal } from 'react-dom'

interface PlacePhotoGalleryProps {
  googleMapsUri?: string
  photos: PlacePhoto[]
  placeName: string
}

/**
 * Strip HTML tags from a string and return plain text
 * Also decodes HTML entities like &amp;, &lt;, etc.
 * Uses DOMParser for safe HTML parsing without XSS risk
 */
function stripHtmlTags(html: string): string {
  if (typeof document !== 'undefined') {
    // Browser environment - use DOMParser for safe parsing (prevents XSS)
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const text = doc.body.textContent || doc.body.innerText || ''
      // Decode HTML entities safely using textarea
      const decoded = document.createElement('textarea')
      decoded.textContent = text
      return decoded.value.trim()
    } catch {
      // Fallback to regex if DOMParser fails
      let cleaned = html.replace(/<[^>]*>/g, '')
      cleaned = cleaned
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
      return cleaned
    }
  }
  // Server-side fallback - basic regex stripping and entity decoding
  let cleaned = html.replace(/<[^>]*>/g, '') // Remove HTML tags
  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
  return cleaned
}

export default function PlacePhotoGallery({
  googleMapsUri,
  photos,
  placeName,
}: PlacePhotoGalleryProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null
  )
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

  // Determine the source to display - use the most common source, or first photo's source, or fallback to Google Maps
  const getPhotoSource = (): string => {
    const sources = validPhotos
      .map((photo) => photo.source)
      .filter((source): source is string => Boolean(source))

    if (sources.length === 0) {
      return 'Google Maps' // Fallback
    }

    // Count occurrences of each source
    const sourceCounts = sources.reduce(
      (acc, source) => {
        acc[source] = (acc[source] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Return the most common source, or first source if all are equal
    return Object.entries(sourceCounts).reduce((a, b) =>
      sourceCounts[a[0]] > sourceCounts[b[0]] ? a : b
    )[0]
  }

  const photoSource = getPhotoSource()

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
          <Carousel
            opts={{
              align: 'start',
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {validPhotos.map((photo, index) => (
                <CarouselItem
                  key={index}
                  className="basis-1/2 pl-2 md:basis-1/3 md:pl-4"
                >
                  <div
                    className="relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-90"
                    onClick={() => setSelectedPhotoIndex(index)}
                  >
                    <Image
                      src={photo.url}
                      alt={`${placeName} - Photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 33vw"
                      onError={() => handleImageError(photo.url)}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {validPhotos.length > 2 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>

          {validPhotos.some((photo) => photo.attribution) && (
            <div className="border-muted mt-3 border-t pt-3">
              {googleMapsUri && photoSource === 'Google Maps' ? (
                <Link href={googleMapsUri} target="_blank">
                  <p className="text-muted-foreground text-xs hover:underline">
                    Source: {photoSource}
                  </p>
                </Link>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Source: {photoSource}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal with Navigation - Rendered via Portal */}
      {selectedPhotoIndex !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedPhotoIndex(null)}
          >
            <div
              className="relative h-[90dvh] max-h-[90dvh] w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Photo counter */}
              <div className="absolute top-4 left-4 z-10 rounded bg-black/70 px-3 py-1 text-sm text-white">
                {selectedPhotoIndex + 1} of {validPhotos.length}
              </div>

              {/* Navigation arrows */}
              {validPhotos.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setSelectedPhotoIndex(
                        selectedPhotoIndex > 0
                          ? selectedPhotoIndex - 1
                          : validPhotos.length - 1
                      )
                    }
                    className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      setSelectedPhotoIndex(
                        selectedPhotoIndex < validPhotos.length - 1
                          ? selectedPhotoIndex + 1
                          : 0
                      )
                    }
                    className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </>
              )}

              <div className="relative h-full w-full overflow-hidden rounded-lg">
                <Image
                  src={validPhotos[selectedPhotoIndex].url}
                  alt={`${placeName} - Photo ${selectedPhotoIndex + 1}`}
                  fill
                  className="object-contain"
                  sizes="90vw"
                  priority
                />
              </div>

              {validPhotos[selectedPhotoIndex].attribution && (
                <div className="absolute bottom-4 left-4 rounded bg-black/70 px-3 py-1 text-xs text-white">
                  {validPhotos[selectedPhotoIndex].attribution.startsWith(
                    'Photo by'
                  )
                    ? stripHtmlTags(validPhotos[selectedPhotoIndex].attribution)
                    : `Photo by ${stripHtmlTags(validPhotos[selectedPhotoIndex].attribution)}`}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
