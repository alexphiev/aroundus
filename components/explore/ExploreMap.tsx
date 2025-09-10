'use client'

import { PlacesInView } from '@/actions/explore.actions'
import { Button } from '@/components/ui/button'
import { FocusIcon, TreesIcon } from 'lucide-react'
import maplibregl, { LngLatBounds, Map, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

interface ExploreMapProps {
  places: PlacesInView[]
  onBoundsChange?: (bounds: {
    north: number
    south: number
    east: number
    west: number
  }) => void
  className?: string
}

const AdaptiveMarkerIcon = ({
  size = 24,
  zoom = 10,
}: {
  size?: number
  zoom?: number
}) => {
  // Use simple dots for low zoom levels, detailed icons for high zoom
  if (zoom < 12) {
    return (
      <div
        className="bg-primary rounded-full transition-all duration-200"
        style={{
          width: size,
          height: size,
        }}
      />
    )
  }

  // Detailed icon for higher zoom levels
  const adaptiveSize = Math.max(12, Math.min(size, 18 + (zoom - 10) * 2))

  return (
    <div
      className="text-primary bg-primary flex items-center justify-center rounded-full p-1 transition-all duration-200"
      style={{ width: adaptiveSize, height: adaptiveSize }}
    >
      <TreesIcon
        size={Math.max(8, adaptiveSize - 6)}
        className="text-white"
        style={{
          imageRendering: 'crisp-edges',
          shapeRendering: 'crispEdges',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      />
    </div>
  )
}

const PopupContent = ({ place }: { place: PlacesInView }) => (
  <div className="max-w-xs px-3 md:p-4">
    <h6 className="mb-2 text-sm font-semibold md:text-base">
      {place.name || 'Unnamed Place'}
    </h6>
    {place.description && (
      <p className="text-muted-foreground mb-2 line-clamp-3 text-sm">
        {place.description}
      </p>
    )}
    {place.type && (
      <p className="mb-2 text-sm text-blue-600 capitalize">{place.type}</p>
    )}
    <Button
      onClick={() =>
        window.open(
          `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.long}`,
          '_blank'
        )
      }
      variant="default"
      className="w-full"
    >
      View on Maps
    </Button>
  </div>
)

const ExploreMap: React.FC<ExploreMapProps> = ({
  places,
  onBoundsChange,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(4)
  const markersRef = useRef<Marker[]>([])
  const activePopupRef = useRef<maplibregl.Popup | null>(null)

  const mapStyle =
    'https://api.maptiler.com/maps/topo-v2/style.json?key=Gxxj1jCvJhu2HSp6n0tp'

  // Calculate marker density and adaptive sizing
  const getAdaptiveMarkerSize = useCallback(
    (zoom: number, placesInView: number) => {
      // Base size calculation based on zoom level
      let baseSize = 24

      // Adjust for zoom level - make much smaller when zoomed out
      if (zoom > 14) {
        baseSize = 32
      } else if (zoom > 12) {
        baseSize = 20
      } else if (zoom > 10) {
        baseSize = 16
      } else if (zoom > 8) {
        baseSize = 6
      } else if (zoom > 6) {
        baseSize = 4
      } else {
        baseSize = 2 // Very small when zoomed out
      }

      // Adjust for density - make even smaller when there are many places
      if (placesInView > 500) {
        baseSize = Math.max(6, baseSize - 12)
      } else if (placesInView > 200) {
        baseSize = Math.max(8, baseSize - 10)
      } else if (placesInView > 100) {
        baseSize = Math.max(10, baseSize - 8)
      } else if (placesInView > 50) {
        baseSize = Math.max(12, baseSize - 4)
      }

      return baseSize
    },
    []
  )

  const updateBounds = useCallback(() => {
    if (!map.current || !onBoundsChange) return

    const bounds = map.current.getBounds()
    onBoundsChange({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    })
  }, [onBoundsChange])

  const onViewAllPlaces = useCallback(() => {
    if (!map.current || places.length === 0) {
      return
    }

    const bounds = new LngLatBounds()
    places.forEach((place) => {
      bounds.extend([place.long, place.lat])
    })

    map.current.fitBounds(bounds, { padding: 50 })
  }, [places])

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const initialCenter: [number, number] = [2.3522, 48.8566] // Paris coordinates
    const initialZoom = 4

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: initialCenter,
        zoom: initialZoom,
        attributionControl: false,
      })

      map.current.on('load', () => {
        setMapLoaded(true)
        map.current?.addControl(new maplibregl.NavigationControl(), 'top-right')
        updateBounds()
      })

      map.current.on('moveend', () => {
        const zoom = map.current?.getZoom() || 4
        setCurrentZoom(zoom)
        updateBounds()
      })

      map.current.on('zoomend', () => {
        const zoom = map.current?.getZoom() || 4
        setCurrentZoom(zoom)
      })
    } catch (error) {
      console.error('Error initializing MapLibre:', error)
      if (mapContainer.current) {
        mapContainer.current.innerHTML =
          '<p class="text-red-500 p-4">Could not load map. Please try again later.</p>'
      }
    }

    return () => {
      map.current?.remove()
      map.current = null
      setMapLoaded(false)
    }
  }, [updateBounds])

  // Update markers when places or zoom changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Close any open popup
    if (activePopupRef.current) {
      activePopupRef.current.remove()
      activePopupRef.current = null
    }

    // Add markers for places
    if (places.length > 0) {
      const markerSize = getAdaptiveMarkerSize(currentZoom, places.length)

      places.forEach((place) => {
        const markerNode = document.createElement('div')
        const root = createRoot(markerNode)
        root.render(
          <AdaptiveMarkerIcon
            key={`${place.id}-${currentZoom}`}
            size={markerSize}
            zoom={currentZoom}
          />
        )

        markerNode.addEventListener('click', () => {
          // Close existing popup
          if (activePopupRef.current) {
            activePopupRef.current.remove()
            activePopupRef.current = null
          }

          // Create new popup
          const popupNode = document.createElement('div')
          const popupRoot = createRoot(popupNode)
          popupRoot.render(<PopupContent place={place} />)

          const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            offset: [0, -markerSize / 2 - 5],
          })
            .setLngLat([place.long, place.lat])
            .setDOMContent(popupNode)
            .addTo(map.current!)

          popup.on('close', () => {
            activePopupRef.current = null
          })

          activePopupRef.current = popup
        })

        const marker = new maplibregl.Marker({ element: markerNode })
          .setLngLat([place.long, place.lat])
          .addTo(map.current!)

        markersRef.current.push(marker)
      })
    }
  }, [places, mapLoaded, currentZoom, getAdaptiveMarkerSize])

  return (
    <div
      ref={mapContainer}
      className={`bg-muted relative h-full w-full overflow-hidden rounded-lg shadow-md ${className} [&_.maplibregl-popup]:z-[1000] [&_.maplibregl-popup-close-button]:top-0.5 [&_.maplibregl-popup-close-button]:right-0.5 [&_.maplibregl-popup-close-button]:z-[1001] [&_.maplibregl-popup-close-button]:h-7 [&_.maplibregl-popup-close-button]:w-6 [&_.maplibregl-popup-close-button]:text-base [&_.maplibregl-popup-content]:rounded-lg`}
      aria-label="Map of saved places"
    >
      <Button
        onClick={onViewAllPlaces}
        variant="outline"
        className="text-primary absolute top-4 left-3 z-10 h-10 transform rounded-full border text-sm shadow-lg backdrop-blur-sm"
        disabled={places.length === 0}
      >
        <FocusIcon className="h-4 w-4" />
      </Button>

      <div className="absolute top-4 right-16 z-10">
        <div className="rounded-md bg-white px-3 py-1 text-sm shadow-md dark:bg-neutral-800">
          {places.length} places
        </div>
      </div>

      {!mapLoaded && (
        <div className="bg-muted/50 absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      )}
    </div>
  )
}

export default ExploreMap
