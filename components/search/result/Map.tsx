'use client'

import {
  GeoJSONGeometry,
  ParkGeometry,
  PlacesInView,
  getPlaceGeometry,
  getPlaceMetadata,
} from '@/actions/explore.actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FocusIcon } from 'lucide-react'
import maplibregl, { LngLatBounds, Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import styles from './Map.module.css'
import { PopupContent } from './PopupContent'

interface Props {
  places: PlacesInView[]
  parkGeometries?: ParkGeometry[]
  onBoundsChange?: (bounds: {
    north: number
    south: number
    east: number
    west: number
  }) => void
  className?: string
  activePlace?: PlacesInView | null
  onMarkerClick?: (index: number, place: PlacesInView) => void
  onPopupClose?: () => void
  onMapReady?: (centerMap: (lat: number, lng: number) => void) => void
}

const Map: React.FC<Props> = ({
  places,
  parkGeometries = [],
  onBoundsChange,
  className = '',
  activePlace,
  onMarkerClick,
  onPopupClose,
  onMapReady,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(4)
  const activePopupRef = useRef<maplibregl.Popup | null>(null)
  const geometryLayerRef = useRef<string | null>(null)
  const geometryCacheRef = useRef<{ [key: string]: GeoJSONGeometry | null }>({})
  const placesRef = useRef<PlacesInView[]>(places)
  const onBoundsChangeRef = useRef(onBoundsChange)
  const isUserInteractingRef = useRef(false)
  const isProgrammaticCloseRef = useRef(false)
  const isPopupPinnedRef = useRef(false)
  const currentHoveredPlaceRef = useRef<string | null>(null)

  const mapStyle =
    'https://api.maptiler.com/maps/topo-v2/style.json?key=Gxxj1jCvJhu2HSp6n0tp'

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange
  }, [onBoundsChange])

  const centerMap = useCallback((lat: number, lng: number) => {
    if (!map.current) return
    const currentZoom = map.current.getZoom()
    // Use zoom 10 as minimum, but keep current zoom if it's higher
    const targetZoom = Math.max(currentZoom, 10)
    map.current.flyTo({
      center: [lng, lat],
      zoom: targetZoom,
      duration: 1000,
    })
  }, [])

  const updateBounds = useCallback(() => {
    if (!map.current || !onBoundsChangeRef.current) {
      return
    }

    const bounds = map.current.getBounds()
    onBoundsChangeRef.current({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    })
  }, [])

  const addGeometryLayer = useCallback(async (place: PlacesInView) => {
    if (!map.current || !map.current.isStyleLoaded()) {
      return
    }

    if (geometryLayerRef.current) {
      const existingLayerId = geometryLayerRef.current
      const existingSourceId = `geometry-source-${existingLayerId.split('-')[1]}`

      try {
        const layersToRemove = [
          existingLayerId,
          `${existingLayerId}-fill`,
          `${existingLayerId}-outline`,
        ]

        layersToRemove.forEach((layer) => {
          if (map.current!.getLayer(layer)) {
            map.current!.removeLayer(layer)
          }
        })

        if (map.current.getSource(existingSourceId)) {
          map.current.removeSource(existingSourceId)
        }
      } catch (error) {
        console.warn('Failed to remove geometry layer:', error)
      }

      geometryLayerRef.current = null
    }

    let geometry = geometryCacheRef.current[place.id]

    if (geometry === undefined) {
      try {
        geometry = await getPlaceGeometry(place.id)
        geometryCacheRef.current[place.id] = geometry
      } catch (error) {
        console.warn('❌ Failed to fetch geometry:', error)
        geometryCacheRef.current[place.id] = null
        return
      }
    }

    if (!geometry) {
      return
    }

    const layerId = `geometry-${place.id}`
    const sourceId = `geometry-source-${place.id}`
    const opacity = place.type === 'regional_park' ? 0.1 : 0.3

    try {
      if (map.current.getSource(sourceId)) {
        const existingLayers = [
          `${layerId}-fill`,
          `${layerId}-outline`,
          layerId,
        ]
        existingLayers.forEach((layer) => {
          if (map.current!.getLayer(layer)) {
            map.current!.removeLayer(layer)
          }
        })
        map.current.removeSource(sourceId)
      }

      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            name: place.name,
            id: place.id,
          },
          geometry: geometry as GeoJSON.Geometry,
        },
      })

      if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        map.current.addLayer({
          id: `${layerId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#D3572C',
            'fill-opacity': opacity,
          },
        })

        // map.current.addLayer({
        //   id: `${layerId}-outline`,
        //   type: 'line',
        //   source: sourceId,
        //   paint: {
        //     'line-color': '#D3572C',
        //     'line-width': 0.5,
        //     'line-opacity': 0.1,
        //   },
        // })
      } else if (
        geometry.type === 'LineString' ||
        geometry.type === 'MultiLineString'
      ) {
        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#D3572C',
            'line-width': 3,
            'line-opacity': 0.8,
          },
        })
      } else if (geometry.type === 'Point' || geometry.type === 'MultiPoint') {
        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-color': '#D3572C',
            'circle-radius': 8,
            'circle-opacity': 0.6,
            'circle-stroke-color': '#D3572C',
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 1,
          },
        })
      }

      geometryLayerRef.current = layerId
    } catch (error) {
      console.warn('Failed to add geometry layer:', error)
    }
  }, [])

  const removeGeometryLayer = useCallback(() => {
    if (!map.current || !geometryLayerRef.current) return

    const layerId = geometryLayerRef.current
    const sourceId = `geometry-source-${layerId.split('-')[1]}`

    try {
      // Remove all possible layer variations
      const layersToRemove = [layerId, `${layerId}-fill`, `${layerId}-outline`]

      layersToRemove.forEach((layer) => {
        if (map.current!.getLayer(layer)) {
          map.current!.removeLayer(layer)
        }
      })

      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId)
      }
    } catch (error) {
      console.warn('Failed to remove geometry layer:', error)
    }

    geometryLayerRef.current = null
  }, [])

  const addPlacesLayer = useCallback(() => {
    if (!map.current || !map.current.isStyleLoaded()) return

    const currentPlaces = placesRef.current
    const sourceId = 'nature-places'
    const layerId = 'nature-places'

    // Update existing source data if it exists, otherwise create new layer
    if (map.current.getSource(sourceId)) {
      const geojsonData = {
        type: 'FeatureCollection' as const,
        features: currentPlaces.map((place) => ({
          type: 'Feature' as const,
          properties: {
            id: place.id,
            name: place.name,
            description: place.description,
            type: place.type,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [place.long, place.lat],
          },
        })),
      }

      // Update the source data
      const source = map.current.getSource(sourceId) as maplibregl.GeoJSONSource
      source.setData(geojsonData)
      return
    }

    // Create new layer only if it doesn't exist
    if (currentPlaces.length === 0) {
      return
    }

    // Create GeoJSON data from places
    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: currentPlaces.map((place) => ({
        type: 'Feature' as const,
        properties: {
          id: place.id,
          name: place.name,
          description: place.description,
          type: place.type,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [place.long, place.lat],
        },
      })),
    }

    // Add source
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: geojsonData,
    })

    // Add layer with MapLibre native interpolation
    map.current.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          3, // At zoom 8: radius 3px
          12,
          6, // At zoom 12: radius 6px
          16,
          12, // At zoom 16: radius 12px
        ],
        'circle-color': '#D3572C',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 1,
      },
    })

    // Helper function to create and show popup
    const showPopup = async (place: PlacesInView, isPinned: boolean) => {
      // Don't recreate popup if it's already open for the same place
      if (
        activePopupRef.current &&
        currentHoveredPlaceRef.current === place.id
      ) {
        // If clicking on an already hovered place, just pin it
        if (isPinned) {
          isPopupPinnedRef.current = true
        }
        return
      }

      // Remove existing popup
      if (activePopupRef.current) {
        isProgrammaticCloseRef.current = true
        activePopupRef.current.remove()
        activePopupRef.current = null
        isProgrammaticCloseRef.current = false
      }

      currentHoveredPlaceRef.current = place.id
      isPopupPinnedRef.current = isPinned

      if (place.type !== 'national_park' && place.type !== 'regional_park') {
        addGeometryLayer(place).catch((error) => {
          console.warn('Failed to add geometry layer:', error)
        })
      }

      const popupNode = document.createElement('div')
      const popupRoot = createRoot(popupNode)
      popupRoot.render(
        <PopupContent place={place} tags={undefined} score={undefined} />
      )

      const popup = new maplibregl.Popup({
        closeButton: isPinned,
        closeOnClick: false,
        offset: [0, -10],
      })
        .setLngLat([place.long, place.lat])
        .setDOMContent(popupNode)
        .addTo(map.current!)

      popup.on('close', () => {
        activePopupRef.current = null
        currentHoveredPlaceRef.current = null
        isPopupPinnedRef.current = false
        removeGeometryLayer()
        // Only call onPopupClose if this is a user-initiated close (not programmatic)
        if (onPopupClose && !isProgrammaticCloseRef.current) {
          onPopupClose()
        }
      })

      activePopupRef.current = popup

      try {
        const metadata = await getPlaceMetadata(place.id)
        if (popup.isOpen()) {
          popupRoot.render(
            <PopupContent
              place={place}
              tags={metadata?.tags}
              score={metadata?.score}
            />
          )
        }
      } catch (error) {
        console.error('Failed to fetch metadata for place:', error)
      }
    }

    // Hover to show popup
    map.current.on('mouseenter', layerId, async (e) => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer'
      }

      // Don't show hover popup if there's a pinned popup
      if (isPopupPinnedRef.current) {
        return
      }

      if (!e.features || e.features.length === 0) {
        return
      }

      const feature = e.features[0]
      const placeId = feature.properties?.id
      const place = placesRef.current.find((p) => p.id === placeId)

      if (!place) {
        return
      }

      await showPopup(place, false)
    })

    // Click to pin popup
    map.current.on('click', layerId, async (e) => {
      if (!e.features || e.features.length === 0) {
        return
      }

      const feature = e.features[0]
      const placeId = feature.properties?.id
      const place = placesRef.current.find((p) => p.id === placeId)

      if (!place) {
        console.error('Place not found in places array:', placeId)
        return
      }

      if (onMarkerClick) {
        const placeIndex = placesRef.current.findIndex((p) => p.id === placeId)
        if (placeIndex >= 0) {
          onMarkerClick(placeIndex, place)
          return
        }
      }

      await showPopup(place, true)
    })

    // Remove hover popup when leaving if not pinned
    map.current.on('mouseleave', layerId, () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = ''
      }

      // Only close if popup is not pinned
      if (!isPopupPinnedRef.current && activePopupRef.current) {
        isProgrammaticCloseRef.current = true
        activePopupRef.current.remove()
        activePopupRef.current = null
        currentHoveredPlaceRef.current = null
        isProgrammaticCloseRef.current = false
        removeGeometryLayer()
      }
    })

    // Add click handler for map background to clear pinned popup
    map.current.on('click', (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [layerId],
      })

      if (features.length === 0 && isPopupPinnedRef.current) {
        removeGeometryLayer()
        if (activePopupRef.current) {
          isProgrammaticCloseRef.current = true
          activePopupRef.current.remove()
          activePopupRef.current = null
          currentHoveredPlaceRef.current = null
          isPopupPinnedRef.current = false
          isProgrammaticCloseRef.current = false
        }
      }
    })
  }, [addGeometryLayer, onMarkerClick, onPopupClose, removeGeometryLayer])

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

        // Expose the centerMap function to parent
        if (onMapReady) {
          onMapReady(centerMap)
        }

        setTimeout(() => {
          if (map.current && onBoundsChangeRef.current) {
            const bounds = map.current.getBounds()
            onBoundsChangeRef.current({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest(),
            })
          }
        }, 100)
      })

      map.current.on('dragstart', () => {
        isUserInteractingRef.current = true
      })

      map.current.on('zoomstart', () => {
        isUserInteractingRef.current = true
      })

      map.current.on('moveend', () => {
        const zoom = map.current?.getZoom() || 4
        setCurrentZoom(zoom)

        if (isUserInteractingRef.current) {
          updateBounds()
          isUserInteractingRef.current = false
        }
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
      if (map.current) {
        removeGeometryLayer()
        map.current.remove()
        map.current = null
      }
      setMapLoaded(false)
    }
    // This is to prevent double reload on first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update places layer when places change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    placesRef.current = places
    addPlacesLayer()
  }, [places, mapLoaded, addPlacesLayer])

  // Add park geometries layer with pre-loaded data
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.isStyleLoaded()) {
      return
    }

    if (parkGeometries.length === 0) {
      return
    }

    const sourceId = 'park-geometries'
    const fillLayerId = 'park-geometries-fill'
    const outlineLayerId = 'park-geometries-outline'

    const features: GeoJSON.Feature[] = parkGeometries
      .filter(
        (park) =>
          park.geometry.type === 'Polygon' ||
          park.geometry.type === 'MultiPolygon'
      )
      .map((park) => ({
        type: 'Feature',
        properties: {
          id: park.id,
          name: park.name,
          type: park.type,
        },
        geometry: park.geometry as GeoJSON.Geometry,
      }))

    if (features.length === 0) {
      return
    }

    try {
      if (map.current.getSource(sourceId)) {
        const source = map.current.getSource(
          sourceId
        ) as maplibregl.GeoJSONSource
        source.setData({
          type: 'FeatureCollection',
          features,
        })
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features,
          },
        })

        map.current.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#D3572C',
            'fill-opacity': [
              'case',
              ['==', ['get', 'type'], 'regional_park'],
              0.2,
              0.4,
            ],
          },
          filter: [
            'any',
            [
              'all',
              ['==', ['get', 'type'], 'national_park'],
              ['>=', ['zoom'], 6],
            ],
            [
              'all',
              ['==', ['get', 'type'], 'regional_park'],
              ['>=', ['zoom'], 6],
            ],
          ],
        })

        map.current.addLayer({
          id: outlineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#D3572C',
            'line-width': 1,
            'line-opacity': 0.3,
          },
          filter: [
            'any',
            [
              'all',
              ['==', ['get', 'type'], 'national_park'],
              ['>=', ['zoom'], 6],
            ],
            [
              'all',
              ['==', ['get', 'type'], 'regional_park'],
              ['>=', ['zoom'], 6],
            ],
          ],
        })
      }
    } catch (error) {
      console.warn('Failed to add park geometries layer:', error)
    }
  }, [parkGeometries, mapLoaded])

  // Handle activePlace prop to show/hide popup (from card hover/click)
  useEffect(() => {
    if (!map.current || !mapLoaded) {
      return
    }

    if (activePlace) {
      // Don't override a pinned popup
      if (
        isPopupPinnedRef.current &&
        currentHoveredPlaceRef.current === activePlace.id
      ) {
        return
      }

      // Close existing popup without triggering onPopupClose callback
      if (activePopupRef.current) {
        isProgrammaticCloseRef.current = true
        activePopupRef.current.remove()
        activePopupRef.current = null
        isProgrammaticCloseRef.current = false
      }

      currentHoveredPlaceRef.current = activePlace.id
      // Treat activePlace changes as hover (not pinned)
      isPopupPinnedRef.current = false

      const popupNode = document.createElement('div')
      const popupRoot = createRoot(popupNode)
      popupRoot.render(
        <PopupContent place={activePlace} tags={undefined} score={undefined} />
      )

      const popup = new maplibregl.Popup({
        closeButton: false, // No close button for hover popup
        closeOnClick: false,
        offset: [0, -10],
      })
        .setLngLat([activePlace.long, activePlace.lat])
        .setDOMContent(popupNode)
        .addTo(map.current!)

      popup.on('close', () => {
        activePopupRef.current = null
        currentHoveredPlaceRef.current = null
        isPopupPinnedRef.current = false
        removeGeometryLayer()
        // Only call onPopupClose if this is a user-initiated close (not programmatic)
        if (onPopupClose && !isProgrammaticCloseRef.current) {
          onPopupClose()
        }
      })

      activePopupRef.current = popup

      if (
        activePlace.type !== 'national_park' &&
        activePlace.type !== 'regional_park'
      ) {
        addGeometryLayer(activePlace).catch((error) => {
          console.warn('Failed to add geometry layer:', error)
        })
      }

      getPlaceMetadata(activePlace.id)
        .then((metadata) => {
          if (popup.isOpen()) {
            popupRoot.render(
              <PopupContent
                place={activePlace}
                tags={metadata?.tags}
                score={metadata?.score}
              />
            )
          }
        })
        .catch((error) => {
          console.error('Failed to fetch metadata for place:', error)
        })
    } else {
      // When activePlace becomes null, close popup and clean up geometry (only if not pinned)
      if (activePopupRef.current && !isPopupPinnedRef.current) {
        isProgrammaticCloseRef.current = true
        activePopupRef.current.remove()
        activePopupRef.current = null
        currentHoveredPlaceRef.current = null
        isProgrammaticCloseRef.current = false
        removeGeometryLayer()
      }
    }
  }, [
    activePlace,
    mapLoaded,
    addGeometryLayer,
    removeGeometryLayer,
    onPopupClose,
  ])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (activePopupRef.current) {
        isProgrammaticCloseRef.current = true
        activePopupRef.current.remove()
        activePopupRef.current = null
        isProgrammaticCloseRef.current = false
      }
      removeGeometryLayer()
    }
  }, [removeGeometryLayer])

  return (
    <div
      ref={mapContainer}
      className={cn(
        'bg-muted relative h-full w-full overflow-hidden rounded-lg shadow-md',
        styles.mapWithPopups,
        className
      )}
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
          Zoom: {Math.round(currentZoom * 10) / 10}
        </div>
      </div>
    </div>
  )
}

export default Map
