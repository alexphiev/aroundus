'use client'

import {
  BoundingBox,
  ParkGeometry,
  PlacesInView,
  getPlacesInBounds,
} from '@/actions/explore.actions'
import ExploreMap from '@/components/explore/ExploreMap'
import { useCallback, useEffect, useState } from 'react'

interface ExploreClientProps {
  parkGeometries: ParkGeometry[]
}

export default function ExplorePageComponent({
  parkGeometries,
}: ExploreClientProps) {
  const [places, setPlaces] = useState<PlacesInView[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleBoundsChange = useCallback(async (bounds: BoundingBox) => {
    setError(null)

    try {
      const placesInBounds = await getPlacesInBounds(bounds)
      setPlaces(placesInBounds)
    } catch (err) {
      console.error('Error fetching places:', err)
      setError('Failed to load places. Please try again.')
    }
  }, [])

  useEffect(() => {
    const worldBounds: BoundingBox = {
      north: 85,
      south: -85,
      east: 180,
      west: -180,
    }

    handleBoundsChange(worldBounds)
  }, [handleBoundsChange])

  return (
    <div className="relative h-full w-full">
      {error && (
        <div className="absolute top-4 right-4 z-20 rounded-lg bg-red-500 px-4 py-2 text-white">
          {error}
        </div>
      )}

      <ExploreMap
        places={places}
        parkGeometries={parkGeometries}
        onBoundsChange={handleBoundsChange}
        className="h-full w-full"
      />
    </div>
  )
}
