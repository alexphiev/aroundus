'use client'

import { getPlacePhotos } from '@/actions/search.actions'
import PlaceInfoGrid from '@/components/discovery/result/PlaceInfoGrid'
import PlaceTimingInfo from '@/components/discovery/result/PlaceTimingInfo'
import PlaceCurrentConditions from '@/components/discovery/result/details/PlaceCurrentConditions'
import PlaceDescription from '@/components/discovery/result/details/PlaceDescription'
import PlaceHeader from '@/components/discovery/result/details/PlaceHeader'
import PlacePhotoGallery from '@/components/discovery/result/details/PlacePhotoGallery'
import PlacePracticalInfo from '@/components/discovery/result/details/PlacePracticalInfo'
import WeatherForecast from '@/components/discovery/result/details/PlaceWeatherForecast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlaceResultItem } from '@/types/result.types'
import { SearchPlaceInView, SearchPlacePhoto } from '@/types/search.types'
import { motion } from 'framer-motion'
import { Database, ExternalLink, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface SearchPlaceDetailViewProps {
  place: SearchPlaceInView
  onBack: () => void
  showSaveButton?: boolean
}

/**
 * Convert SearchPlaceInView to PlaceResultItem format for compatibility with shared components
 * Only includes fields that are compatible between both types
 */
function adaptPlaceForSharedComponents(
  place: SearchPlaceInView
): PlaceResultItem {
  return {
    id: place.id,
    name: place.name,
    description: place.description,
    lat: place.lat,
    long: place.long,
    // Convert SearchPlacePhoto[] to PlacePhoto[] format
    photos: place.photos?.map((photo) => ({
      url: photo.url,
      attribution: photo.attribution || undefined,
    })),
  } as PlaceResultItem
}

export default function SearchPlaceDetailView({
  place,
  onBack,
  showSaveButton = true,
}: SearchPlaceDetailViewProps) {
  const [photos, setPhotos] = useState<SearchPlacePhoto[] | undefined>(
    place.photos
  )
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)

  // Load photos if not already loaded (no limit for detail view - show all photos)
  useEffect(() => {
    if (!photos && place.id) {
      setIsLoadingPhotos(true)
      getPlacePhotos(place.id)
        .then((loadedPhotos) => {
          setPhotos(loadedPhotos)
        })
        .catch((error) => {
          console.error('Error loading photos:', error)
        })
        .finally(() => {
          setIsLoadingPhotos(false)
        })
    }
  }, [place.id, photos])

  const handleShare = async () => {
    const shareText = `${place.name}: ${place.description}\n\nLocation: ${place.lat}, ${place.long}${place.website ? `\n\nWebsite: ${place.website}` : ''}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: place.name,
          text: shareText,
          url: place.website || window.location.href,
        })
      } catch {
        navigator.clipboard.writeText(shareText)
      }
    } else {
      navigator.clipboard.writeText(shareText)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col md:pb-0"
    >
      <PlaceHeader
        place={adaptPlaceForSharedComponents(place)}
        onBack={onBack}
        onShare={handleShare}
        showSaveButton={showSaveButton}
      />

      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
        {place.description && (
          <PlaceDescription description={place.description} />
        )}

        {photos && photos.length > 0 && (
          <PlacePhotoGallery
            photos={photos.map((photo) => ({
              url: photo.url,
              attribution: photo.attribution || undefined,
              source: photo.source,
            }))}
            placeName={place.name}
          />
        )}
        {isLoadingPhotos && (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600"></div>
            </CardContent>
          </Card>
        )}

        {(place.type || place.source) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                Place Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {place.type && (
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">{place.type}</span>
                </div>
              )}
              {place.source && (
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground">Source:</span>
                  <span className="font-medium capitalize">{place.source}</span>
                </div>
              )}
              {place.website && (
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground">Website:</span>
                  <Link
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-1 hover:underline"
                  >
                    Visit site
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
              {place.wikipedia_query && (
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground">Wikipedia:</span>
                  <Link
                    href={`https://fr.wikipedia.org/wiki/${place.wikipedia_query}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-1 hover:underline"
                  >
                    Learn more
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {place.metadata && Object.keys(place.metadata).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.entries(place.metadata).map(([key, value]) => {
                if (value === null || value === undefined) {
                  return null
                }

                const displayValue =
                  typeof value === 'object'
                    ? JSON.stringify(value, null, 2)
                    : String(value)

                if (displayValue.length > 100) {
                  return null
                }

                return (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-4"
                  >
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-right font-medium">
                      {displayValue}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        <PlaceInfoGrid place={adaptPlaceForSharedComponents(place)} />
        <PlaceCurrentConditions place={adaptPlaceForSharedComponents(place)} />
        <PlacePracticalInfo place={adaptPlaceForSharedComponents(place)} />
        <PlaceTimingInfo place={adaptPlaceForSharedComponents(place)} />

        <WeatherForecast lat={place.lat} lon={place.long} />
      </div>
    </motion.div>
  )
}
