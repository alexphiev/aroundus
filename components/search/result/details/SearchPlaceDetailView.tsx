'use client'

import { PlacesInView } from '@/actions/explore.actions'
import PlaceInfoGrid from '@/components/discovery/result/PlaceInfoGrid'
import PlaceTimingInfo from '@/components/discovery/result/PlaceTimingInfo'
import PlaceCurrentConditions from '@/components/discovery/result/details/PlaceCurrentConditions'
import PlaceDescription from '@/components/discovery/result/details/PlaceDescription'
import PlaceHeader from '@/components/discovery/result/details/PlaceHeader'
import PlacePhotoGallery from '@/components/discovery/result/details/PlacePhotoGallery'
import PlacePracticalInfo from '@/components/discovery/result/details/PlacePracticalInfo'
import WeatherForecast from '@/components/discovery/result/details/PlaceWeatherForecast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Database, ExternalLink, MapPin } from 'lucide-react'
import Link from 'next/link'

interface SearchPlaceDetailViewProps {
  place: PlacesInView
  onBack: () => void
  showSaveButton?: boolean
}

export default function SearchPlaceDetailView({
  place,
  onBack,
  showSaveButton = true,
}: SearchPlaceDetailViewProps) {
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
        place={place}
        onBack={onBack}
        onShare={handleShare}
        showSaveButton={showSaveButton}
      />

      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
        {place.description && (
          <PlaceDescription description={place.description} />
        )}

        {place.photos && place.photos.length > 0 && (
          <PlacePhotoGallery photos={place.photos} placeName={place.name} />
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
                    href={`https://en.wikipedia.org/wiki/${encodeURIComponent(place.wikipedia_query)}`}
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

        <PlaceInfoGrid place={place} />
        <PlaceCurrentConditions place={place} />
        <PlacePracticalInfo place={place} />
        <PlaceTimingInfo place={place} />

        <WeatherForecast lat={place.lat} lon={place.long} />
      </div>
    </motion.div>
  )
}
