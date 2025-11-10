'use client'

import {
  GeoJSONGeometry,
  ParkGeometry,
  getPlaceGeometry,
} from '@/actions/explore.actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SearchPlaceInView } from '@/types/search.types'
import { FocusIcon } from 'lucide-react'
import maplibregl, { LngLatBounds, Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import styles from './Map.module.css'
import { PopupContent } from './PopupContent'

interface Props {
  places: SearchPlaceInView[]
  parkGeometries?: ParkGeometry[]
  onBoundsChange?: (bounds: {
    north: number
    south: number
    east: number
    west: number
  }) => void
  className?: string
  activePlace?: SearchPlaceInView | null
  onMarkerClick?: (index: number, place: SearchPlaceInView) => void
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
  // Separate refs for pinned (clicked) and hover popups
  const pinnedPopupRef = useRef<maplibregl.Popup | null>(null)
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null)
  const pinnedPlaceIdRef = useRef<string | null>(null)
  const hoveredPlaceIdRef = useRef<string | null>(null)
  const geometryLayerRef = useRef<string | null>(null) // For pinned geometry
  const hoverGeometryLayerRef = useRef<string | null>(null) // For hover geometry
  const geometryCacheRef = useRef<{ [key: string]: GeoJSONGeometry | null }>({})
  const placesRef = useRef<SearchPlaceInView[]>(places)
  const onBoundsChangeRef = useRef(onBoundsChange)
  const isUserInteractingRef = useRef(false)
  const isProgrammaticCloseRef = useRef(false)
  const activePlaceRef = useRef<SearchPlaceInView | null | undefined>(
    activePlace
  )
  // Track zoom level before centering, to restore it when going back
  const zoomBeforeCenteringRef = useRef<number | null>(null)
  const shouldRestoreZoomRef = useRef(false)

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

    // Store original zoom if we're going to change it (for restoration when going back)
    if (targetZoom > currentZoom) {
      zoomBeforeCenteringRef.current = currentZoom
      shouldRestoreZoomRef.current = true
    } else {
      // If zoom won't change, don't restore
      shouldRestoreZoomRef.current = false
      zoomBeforeCenteringRef.current = null
    }

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

  const addGeometryLayer = useCallback(async (place: SearchPlaceInView) => {
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

  // Add hover geometry layer (temporary, shown on hover)
  const addHoverGeometryLayer = useCallback(
    async (place: SearchPlaceInView) => {
      if (!map.current || !map.current.isStyleLoaded()) {
        return
      }

      // Don't show hover geometry if hovering on the pinned place
      if (pinnedPlaceIdRef.current === place.id) {
        return
      }

      // Remove existing hover geometry if any
      if (hoverGeometryLayerRef.current) {
        const existingLayerId = hoverGeometryLayerRef.current
        // Extract place ID from layer ID: "hover-geometry-{placeId}" -> "{placeId}"
        const existingPlaceId = existingLayerId.replace('hover-geometry-', '')
        const existingSourceId = `hover-geometry-source-${existingPlaceId}`

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
          console.warn('Failed to remove hover geometry layer:', error)
        }

        hoverGeometryLayerRef.current = null
      }

      // Skip geometry for parks (same as pinned geometry)
      if (place.type === 'national_park' || place.type === 'regional_park') {
        return
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

      const layerId = `hover-geometry-${place.id}`
      const sourceId = `hover-geometry-source-${place.id}`
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
        } else if (
          geometry.type === 'Point' ||
          geometry.type === 'MultiPoint'
        ) {
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

        hoverGeometryLayerRef.current = layerId
      } catch (error) {
        console.warn('Failed to add hover geometry layer:', error)
      }
    },
    []
  )

  // Remove hover geometry layer
  const removeHoverGeometryLayer = useCallback(() => {
    if (!map.current || !hoverGeometryLayerRef.current) return

    const layerId = hoverGeometryLayerRef.current
    // Extract place ID from layer ID: "hover-geometry-{placeId}" -> "{placeId}"
    const placeId = layerId.replace('hover-geometry-', '')
    const sourceId = `hover-geometry-source-${placeId}`

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
      console.warn('Failed to remove hover geometry layer:', error)
    }

    hoverGeometryLayerRef.current = null
  }, [])

  // Cleanup hover state function
  const cleanupHoverState = useCallback(() => {
    // Close hover popup
    if (hoverPopupRef.current) {
      isProgrammaticCloseRef.current = true
      hoverPopupRef.current.remove()
      hoverPopupRef.current = null
      hoveredPlaceIdRef.current = null
      isProgrammaticCloseRef.current = false
    }
    // Remove hover geometry
    removeHoverGeometryLayer()
  }, [removeHoverGeometryLayer])

  // Helper function to create and show pinned popup (persistent, with close button)
  const showPinnedPopup = useCallback(
    async (place: SearchPlaceInView) => {
      if (!map.current) return

      // Close previous pinned popup if exists
      if (pinnedPopupRef.current) {
        isProgrammaticCloseRef.current = true
        pinnedPopupRef.current.remove()
        pinnedPopupRef.current = null
        pinnedPlaceIdRef.current = null
        isProgrammaticCloseRef.current = false
        removeGeometryLayer()
      }

      // Close hover popup if hovering on the same place
      if (hoverPopupRef.current && hoveredPlaceIdRef.current === place.id) {
        isProgrammaticCloseRef.current = true
        hoverPopupRef.current.remove()
        hoverPopupRef.current = null
        hoveredPlaceIdRef.current = null
        isProgrammaticCloseRef.current = false
        removeHoverGeometryLayer()
      }

      pinnedPlaceIdRef.current = place.id

      if (place.type !== 'national_park' && place.type !== 'regional_park') {
        addGeometryLayer(place).catch((error) => {
          console.warn('Failed to add geometry layer:', error)
        })
      }

      const popupNode = document.createElement('div')
      const popupRoot = createRoot(popupNode)
      popupRoot.render(<PopupContent place={place} />)

      const popup = new maplibregl.Popup({
        closeButton: true, // Close button for pinned popup
        closeOnClick: false,
        offset: [0, -10],
      })
        .setLngLat([place.long, place.lat])
        .setDOMContent(popupNode)
        .addTo(map.current)

      popup.on('close', () => {
        pinnedPopupRef.current = null
        pinnedPlaceIdRef.current = null
        removeGeometryLayer()
        // Call onPopupClose when user closes the pinned popup
        if (onPopupClose && !isProgrammaticCloseRef.current) {
          // Don't restore zoom when closing popup via close button (user intentionally unfocusing)
          shouldRestoreZoomRef.current = false
          zoomBeforeCenteringRef.current = null
          onPopupClose()
        }
      })

      pinnedPopupRef.current = popup
    },
    [
      addGeometryLayer,
      removeGeometryLayer,
      removeHoverGeometryLayer,
      onPopupClose,
    ]
  )

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

    // Helper function to create and show hover popup (temporary, no close button)
    const showHoverPopup = async (place: SearchPlaceInView) => {
      // Don't show hover popup if hovering on the pinned place
      if (pinnedPlaceIdRef.current === place.id) {
        return
      }

      // Store the place ID we're about to show hover for
      const targetPlaceId = place.id

      // Close existing hover popup and geometry
      if (hoverPopupRef.current) {
        isProgrammaticCloseRef.current = true
        hoverPopupRef.current.remove()
        hoverPopupRef.current = null
        hoveredPlaceIdRef.current = null
        isProgrammaticCloseRef.current = false
      }
      removeHoverGeometryLayer()

      // Verify we're still hovering on the same place after async cleanup
      if (!map.current || !map.current.isStyleLoaded()) {
        return
      }

      hoveredPlaceIdRef.current = targetPlaceId

      // Add hover geometry (only for non-park places - parks show via parkGeometries layer)
      if (place.type !== 'national_park' && place.type !== 'regional_park') {
        await addHoverGeometryLayer(place)
        // Double-check we're still on the same place after async geometry fetch
        if (hoveredPlaceIdRef.current !== targetPlaceId) {
          return
        }
      }

      // Verify we're still hovering on the same place before showing popup
      if (hoveredPlaceIdRef.current !== targetPlaceId) {
        return
      }

      const popupNode = document.createElement('div')
      const popupRoot = createRoot(popupNode)
      popupRoot.render(<PopupContent place={place} />)

      const popup = new maplibregl.Popup({
        closeButton: false, // No close button for hover popup
        closeOnClick: false,
        offset: [0, -10],
      })
        .setLngLat([place.long, place.lat])
        .setDOMContent(popupNode)
        .addTo(map.current!)

      // Verify we're still on the same place before setting the ref
      if (hoveredPlaceIdRef.current === targetPlaceId) {
        popup.on('close', () => {
          // Only clear if this is still the current hover popup
          if (hoverPopupRef.current === popup) {
            hoverPopupRef.current = null
            hoveredPlaceIdRef.current = null
            removeHoverGeometryLayer()
          }
        })

        hoverPopupRef.current = popup
      } else {
        // We moved to a different place, clean up this popup
        popup.remove()
      }
    }

    // Hover to show popup (temporary, can coexist with pinned popup)
    map.current.on('mouseenter', layerId, async (e) => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer'
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

      // Show hover popup (will not show if hovering on pinned place)
      await showHoverPopup(place)
    })

    // Click to pin popup and select place
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

      // Pin the popup (this will show it with a close button and close previous pinned popup)
      await showPinnedPopup(place)

      // Also trigger the marker click handler to open detail view
      if (onMarkerClick) {
        const placeIndex = placesRef.current.findIndex((p) => p.id === placeId)
        if (placeIndex >= 0) {
          onMarkerClick(placeIndex, place)
        }
      }
    })

    // Remove hover popup when leaving (only hover popup, not pinned)
    map.current.on('mouseleave', layerId, () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = ''
      }

      // Close hover popup when mouse leaves (pinned popup stays)
      cleanupHoverState()
    })

    // Add click handler for map background to clear pinned popup and deselect place
    map.current.on('click', (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [layerId],
      })

      // If clicking on empty map area and popup is pinned, close it and deselect
      if (features.length === 0 && pinnedPopupRef.current) {
        // Don't restore zoom when clicking map to unfocus
        shouldRestoreZoomRef.current = false
        zoomBeforeCenteringRef.current = null

        removeGeometryLayer()
        isProgrammaticCloseRef.current = true
        pinnedPopupRef.current.remove()
        pinnedPopupRef.current = null
        pinnedPlaceIdRef.current = null
        isProgrammaticCloseRef.current = false
        // Deselect the place in the left panel
        if (onPopupClose) {
          onPopupClose()
        }
      }
    })
  }, [
    onMarkerClick,
    onPopupClose,
    removeGeometryLayer,
    removeHoverGeometryLayer,
    addHoverGeometryLayer,
    showPinnedPopup,
    cleanupHoverState,
  ])

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
      // Clean up all hover state
      if (hoverPopupRef.current) {
        isProgrammaticCloseRef.current = true
        hoverPopupRef.current.remove()
        hoverPopupRef.current = null
        hoveredPlaceIdRef.current = null
        isProgrammaticCloseRef.current = false
      }
      if (hoverGeometryLayerRef.current) {
        removeHoverGeometryLayer()
      }
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

    // Clean up any hover state when places change
    cleanupHoverState()

    placesRef.current = places
    addPlacesLayer()
  }, [places, mapLoaded, addPlacesLayer, cleanupHoverState])

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
            ['==', ['get', 'type'], 'national_park'],
            ['==', ['get', 'type'], 'regional_park'],
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
            ['==', ['get', 'type'], 'national_park'],
            ['==', ['get', 'type'], 'regional_park'],
          ],
        })
      }
    } catch (error) {
      console.warn('Failed to add park geometries layer:', error)
    }
  }, [parkGeometries, mapLoaded])

  // Update activePlaceRef when activePlace changes
  useEffect(() => {
    activePlaceRef.current = activePlace
  }, [activePlace])

  // Handle activePlace prop to show/hide popup (from card hover/click)
  useEffect(() => {
    if (!map.current || !mapLoaded) {
      return
    }

    if (activePlace) {
      // Don't recreate pinned popup if it's already open for this place
      if (
        pinnedPopupRef.current &&
        pinnedPlaceIdRef.current === activePlace.id
      ) {
        return
      }

      // Show pinned popup for selected place (from card click)
      showPinnedPopup(activePlace).catch((error) => {
        console.error('Failed to show pinned popup:', error)
      })
    } else {
      // When activePlace becomes null, close pinned popup and clean up geometry
      if (pinnedPopupRef.current) {
        isProgrammaticCloseRef.current = true
        pinnedPopupRef.current.remove()
        pinnedPopupRef.current = null
        pinnedPlaceIdRef.current = null
        isProgrammaticCloseRef.current = false
        removeGeometryLayer()
      }

      // Restore zoom level if it was changed when centering on the place
      if (
        shouldRestoreZoomRef.current &&
        zoomBeforeCenteringRef.current !== null &&
        map.current
      ) {
        const originalZoom = zoomBeforeCenteringRef.current
        map.current.flyTo({
          zoom: originalZoom,
          duration: 500,
        })
        // Reset the restore flag
        shouldRestoreZoomRef.current = false
        zoomBeforeCenteringRef.current = null
      }
    }
  }, [
    activePlace,
    mapLoaded,
    addGeometryLayer,
    removeGeometryLayer,
    onPopupClose,
    showPinnedPopup,
  ])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pinnedPopupRef.current) {
        isProgrammaticCloseRef.current = true
        pinnedPopupRef.current.remove()
        pinnedPopupRef.current = null
        isProgrammaticCloseRef.current = false
      }
      removeGeometryLayer()
      removeHoverGeometryLayer()
    }
  }, [removeGeometryLayer, removeHoverGeometryLayer])

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
