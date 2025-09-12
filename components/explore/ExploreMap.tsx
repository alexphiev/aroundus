'use client'

import {
  GeoJSONGeometry,
  PlacesInView,
  getPlaceGeometry,
} from '@/actions/explore.actions'
import { Button } from '@/components/ui/button'
import { FocusIcon } from 'lucide-react'
import maplibregl, { LngLatBounds, Map as MapLibreMap } from 'maplibre-gl'
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
  const map = useRef<MapLibreMap | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(4)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const activePopupRef = useRef<maplibregl.Popup | null>(null)
  const geometryLayerRef = useRef<string | null>(null)
  const geometryCacheRef = useRef<{ [key: string]: GeoJSONGeometry | null }>({})

  const mapStyle =
    'https://api.maptiler.com/maps/topo-v2/style.json?key=Gxxj1jCvJhu2HSp6n0tp'

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

  const addGeometryLayer = useCallback(async (place: PlacesInView) => {
    if (!map.current || !map.current.isStyleLoaded()) {
      return
    }

    // Remove existing geometry layer if any
    if (geometryLayerRef.current) {
      const existingLayerId = geometryLayerRef.current
      const existingSourceId = `geometry-source-${existingLayerId.split('-')[1]}`

      try {
        // Remove all possible layer variations
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

    // Check cache first
    let geometry = geometryCacheRef.current[place.id]

    // If not in cache, fetch it
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

    // If no geometry available, return
    if (!geometry) {
      return
    }

    const layerId = `geometry-${place.id}`
    const sourceId = `geometry-source-${place.id}`

    try {
      // Check if source already exists, if so remove it first
      if (map.current.getSource(sourceId)) {
        // Remove any existing layers that use this source
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

      // Add source
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

      // Add fill layer for polygons
      if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        map.current.addLayer({
          id: `${layerId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#D3572C',
            'fill-opacity': 0.3,
          },
        })

        map.current.addLayer({
          id: `${layerId}-outline`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#D3572C',
            'line-width': 2,
            'line-opacity': 0.8,
          },
        })
      }
      // Add line layer for LineString
      else if (
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
      }
      // Add circle layer for points (in addition to marker)
      else if (geometry.type === 'Point' || geometry.type === 'MultiPoint') {
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
    if (!map.current || !mapLoaded || !map.current.isStyleLoaded()) return

    const sourceId = 'nature-places'
    const layerId = 'nature-places'

    // Update existing source data if it exists, otherwise create new layer
    if (map.current.getSource(sourceId)) {
      const geojsonData = {
        type: 'FeatureCollection' as const,
        features: places.map((place) => ({
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
    if (places.length === 0) return

    // Create GeoJSON data from places
    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: places.map((place) => ({
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

    // Add click handler for the layer
    map.current.on('click', layerId, (e) => {
      if (!e.features || e.features.length === 0) return

      const feature = e.features[0]
      const placeId = feature.properties?.id
      const place = places.find((p) => p.id === placeId)

      if (!place) return

      // Close existing popup
      if (activePopupRef.current) {
        activePopupRef.current.remove()
        activePopupRef.current = null
      }

      // Handle geometry layer display
      if (selectedPlaceId === place.id) {
        removeGeometryLayer()
        setSelectedPlaceId(null)
      } else {
        addGeometryLayer(place)
        setSelectedPlaceId(place.id)
      }

      // Create new popup
      const popupNode = document.createElement('div')
      const popupRoot = createRoot(popupNode)
      popupRoot.render(<PopupContent place={place} />)

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: [0, -10],
      })
        .setLngLat([place.long, place.lat])
        .setDOMContent(popupNode)
        .addTo(map.current!)

      popup.on('close', () => {
        activePopupRef.current = null
      })

      activePopupRef.current = popup
    })

    // Change cursor on hover
    map.current.on('mouseenter', layerId, () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer'
      }
    })

    map.current.on('mouseleave', layerId, () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = ''
      }
    })

    // Add click handler for map background to clear selection
    map.current.on('click', (e) => {
      // Check if click was on our places layer
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [layerId],
      })

      // If click was not on a place marker, clear selection
      if (features.length === 0 && selectedPlaceId) {
        removeGeometryLayer()
        setSelectedPlaceId(null)
        if (activePopupRef.current) {
          activePopupRef.current.remove()
          activePopupRef.current = null
        }
      }
    })
  }, [
    places,
    mapLoaded,
    addGeometryLayer,
    removeGeometryLayer,
    selectedPlaceId,
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
      if (map.current) {
        removeGeometryLayer()
        map.current.remove()
        map.current = null
      }
      setMapLoaded(false)
    }
  }, [updateBounds, removeGeometryLayer])

  // Update places layer when places change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // Add places layer (will update existing or create new)
    addPlacesLayer()
  }, [places, mapLoaded, addPlacesLayer])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Close any open popup
      if (activePopupRef.current) {
        activePopupRef.current.remove()
        activePopupRef.current = null
      }
      // Clear geometry layer
      removeGeometryLayer()
    }
  }, [removeGeometryLayer])

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
          Zoom: {Math.round(currentZoom * 10) / 10}
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
