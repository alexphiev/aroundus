'use client'

import { Button } from '@/components/ui/button'
import { PlaceResultItem } from '@/types/result.types'
import { FocusIcon, MapPin, TreesIcon } from 'lucide-react'
import maplibregl, { LngLatBounds, Map, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

interface PlaceMapProps {
  placeResults: PlaceResultItem[] | null
  baseLocation?: {
    latitude: number
    longitude: number
  } | null
  className?: string // Allow passing custom classes
  activeMarkerIndex?: number
  activePlace?: PlaceResultItem | null
  shouldUpdateBounds?: boolean // Whether to update map bounds when results change
  isProgressiveSearch?: boolean // Whether this is a progressive search
  onMarkerClick?: (index: number, place: PlaceResultItem) => void // Callback when marker is clicked
  onPopupClose?: () => void // Callback when popup is closed
  onPlaceDetailsClick?: (index: number, place: PlaceResultItem) => void // Callback when place details button is clicked
}

const MarkerIcon = () => {
  return (
    <div className="text-primary bg-primary flex items-center justify-center rounded-full p-1">
      <TreesIcon
        size={18}
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

const BaseMarkerIcon = () => {
  return (
    <MapPin size={32} fill="#3b82f6" className="text-white" strokeWidth={1} />
  )
}

const PopupContent = ({
  place,
  onDetailsClick,
}: {
  place: PlaceResultItem
  onDetailsClick?: () => void
}) => (
  <div className="px-3 md:p-4">
    <h6 className="mb-2 text-sm font-semibold md:text-base">{place.name}</h6>
    <p className="text-muted-foreground mb-3 line-clamp-3 hidden text-sm md:block">
      {place.description}
    </p>
    {onDetailsClick && (
      <Button onClick={onDetailsClick} variant="default" className="w-full">
        View Details
      </Button>
    )}
  </div>
)

const PlaceMap: React.FC<PlaceMapProps> = ({
  placeResults,
  baseLocation,
  className = '',
  activePlace,
  onMarkerClick,
  onPopupClose,
  onPlaceDetailsClick,
}) => {
  console.log('🗺️ PlaceMap RENDER', {
    resultsCount: placeResults?.length,
    baseLocation,
    hasActivePlace: !!activePlace,
    timestamp: Date.now(),
  })

  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const markersRef = useRef<Marker[]>([])
  const activePopupRef = useRef<maplibregl.Popup | null>(null)

  const mapStyle =
    'https://api.maptiler.com/maps/topo-v2/style.json?key=Gxxj1jCvJhu2HSp6n0tp'

  // Reset zoom and bounds when active place is null
  const onViewAllPlaces = useCallback(() => {
    if (!map.current) {
      return
    }

    // Reset bounds based on all markers
    const bounds = new LngLatBounds()
    markersRef.current.forEach((marker) => {
      bounds.extend(marker.getLngLat())
    })
    map.current.fitBounds(bounds, { padding: 50 })
  }, [])

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    let initialCenter: [number, number] = [2.3522, 48.8566] // Paris coordinates
    let initialZoom = 4

    if (placeResults && placeResults.length > 0) {
      initialCenter = [placeResults[0].long, placeResults[0].lat]
      initialZoom = 9
    } else if (baseLocation) {
      initialCenter = [baseLocation.longitude, baseLocation.latitude]
      initialZoom = 10
    }

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
      })
    } catch (error) {
      console.error('Error initializing MapLibre:', error)
      if (mapContainer.current) {
        mapContainer.current.innerHTML =
          '<p class="text-red-500 p-4">Could not load map. Please try again later.</p>'
      }
    }

    // Cleanup map instance on component unmount
    return () => {
      map.current?.remove()
      map.current = null
      setMapLoaded(false)
    }
  }, [placeResults, baseLocation])

  // Update markers when baseLocation or placeResults change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Add base location marker if available
    if (baseLocation) {
      const el = document.createElement('div')
      const root = createRoot(el)
      root.render(<BaseMarkerIcon key={el.id} />)

      const userMarker = new maplibregl.Marker({ element: el })
        .setLngLat([baseLocation.longitude, baseLocation.latitude])
        .addTo(map.current!)

      markersRef.current.push(userMarker)
    }

    // Add places markers if they exist
    if (placeResults && placeResults.length > 0) {
      placeResults.forEach((place, index) => {
        const markerNode = document.createElement('div')
        const root = createRoot(markerNode)
        root.render(<MarkerIcon key={markerNode.id} />)

        markerNode.addEventListener('click', () => {
          if (onMarkerClick) {
            if (activePopupRef.current) {
              activePopupRef.current.remove()
              activePopupRef.current = null
            }

            onMarkerClick(index, place)
          }
        })

        const marker = new maplibregl.Marker({ element: markerNode })
          .setLngLat([place.long, place.lat])
          .addTo(map.current!)

        markersRef.current.push(marker)
      })
    }

    // Update bounds to show all markers
    if (markersRef.current.length > 0) {
      const bounds = new LngLatBounds()
      markersRef.current.forEach((marker) => {
        bounds.extend(marker.getLngLat())
      })

      if (markersRef.current.length === 1) {
        map.current.fitBounds(bounds, { padding: 50, zoom: 10 })
      } else {
        map.current.fitBounds(bounds, { padding: 50 })
      }
    }
  }, [
    baseLocation?.latitude,
    baseLocation?.longitude,
    placeResults,
    mapLoaded,
    onMarkerClick,
    baseLocation,
  ])

  // Add popup for active place
  useEffect(() => {
    if (!map.current) return

    // Remove existing popup if any
    if (activePopupRef.current) {
      activePopupRef.current.remove()
      activePopupRef.current = null
    }

    // Create new popup if there's an active place
    if (activePlace) {
      const popupNode = document.createElement('div')
      const popupRoot = createRoot(popupNode)
      popupRoot.render(
        <PopupContent
          place={activePlace}
          onDetailsClick={
            onPlaceDetailsClick
              ? () => {
                  // Find the index of the active place
                  const placeIndex =
                    placeResults?.findIndex(
                      (p) =>
                        p.name === activePlace.name &&
                        p.lat === activePlace.lat &&
                        p.long === activePlace.long
                    ) ?? -1
                  if (placeIndex >= 0) {
                    onPlaceDetailsClick?.(placeIndex, activePlace)
                  }
                }
              : undefined
          }
        />
      )

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: [0, -25],
      })
        .setLngLat([activePlace.long, activePlace.lat])
        .setDOMContent(popupNode)
        .addTo(map.current!)

      popup.on('close', () => {
        if (onPopupClose) {
          onPopupClose()
        }
      })

      // Center map on active place
      map.current.flyTo({
        center: [activePlace.long, activePlace.lat],
        duration: 500,
      })

      activePopupRef.current = popup
    }
  }, [activePlace, onPlaceDetailsClick, onPopupClose, placeResults])

  return (
    <div
      ref={mapContainer}
      className={`bg-muted relative h-full w-full overflow-hidden rounded-lg shadow-md ${className} [&_.maplibregl-popup]:z-[1000] [&_.maplibregl-popup-close-button]:top-0.5 [&_.maplibregl-popup-close-button]:right-0.5 [&_.maplibregl-popup-close-button]:z-[1001] [&_.maplibregl-popup-close-button]:h-7 [&_.maplibregl-popup-close-button]:w-6 [&_.maplibregl-popup-close-button]:text-base [&_.maplibregl-popup-content]:rounded-lg`}
      aria-label="Map of place suggestions"
    >
      <Button
        onClick={onViewAllPlaces}
        variant="outline"
        className="text-primary absolute top-4 left-3 z-10 h-10 transform rounded-full border text-sm shadow-lg backdrop-blur-sm"
      >
        <FocusIcon className="h-4 w-4" />
      </Button>
      {!mapLoaded && (
        <div className="bg-muted/50 absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      )}
    </div>
  )
}

export default PlaceMap
