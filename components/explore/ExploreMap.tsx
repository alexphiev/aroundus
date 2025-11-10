'use client'

import {
  GeoJSONGeometry,
  ParkGeometry,
  PlacesInView,
  getPlaceGeometry,
  getPlaceMetadata,
} from '@/actions/explore.actions'
import { Button } from '@/components/ui/button'
import { FocusIcon } from 'lucide-react'
import maplibregl, { LngLatBounds, Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

interface ExploreMapProps {
  places: PlacesInView[]
  parkGeometries?: ParkGeometry[]
  onBoundsChange?: (bounds: {
    north: number
    south: number
    east: number
    west: number
  }) => void
  className?: string
}

const PopupContent = ({
  place,
  tags,
  score,
}: {
  place: PlacesInView
  tags?: Record<string, string>
  score?: number
}) => {
  const tagEntries = tags ? Object.entries(tags) : []

  return (
    <div className="max-w-xs px-3 md:p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h6 className="text-sm font-semibold md:text-base">
          {place.name || 'Unnamed Place'}
        </h6>
        {score !== undefined && (
          <span className="bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 text-xs font-medium">
            {score.toFixed(1)}
          </span>
        )}
      </div>
      <p className="text-muted-foreground mb-2 line-clamp-3 text-sm">
        {place.description || 'No description available'}
      </p>
      <p className="mb-3 text-sm text-blue-600 capitalize">
        {place.type || 'Unknown type'}
      </p>
      {tagEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tagEntries.map(([key, value], index) => (
            <span
              key={index}
              className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs select-none"
            >
              {key}: {value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const ExploreMap: React.FC<ExploreMapProps> = ({
  places,
  parkGeometries = [],
  onBoundsChange,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(4)
  const selectedPlaceIdRef = useRef<string | null>(null)
  const activePopupRef = useRef<maplibregl.Popup | null>(null)
  const geometryLayerRef = useRef<string | null>(null)
  const geometryCacheRef = useRef<{ [key: string]: GeoJSONGeometry | null }>({})
  const placesRef = useRef<PlacesInView[]>(places)

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
    if (!map.current || !mapLoaded || !map.current.isStyleLoaded()) return

    placesRef.current = places

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
    map.current.on('click', layerId, async (e) => {
      if (!e.features || e.features.length === 0) {
        console.warn('⚠️ Click detected but no features found')
        return
      }

      const feature = e.features[0]
      const placeId = feature.properties?.id
      console.log('🖱️ Clicked place ID:', placeId)
      console.log('📍 Available places:', placesRef.current.length)
      const place = placesRef.current.find((p) => p.id === placeId)

      if (!place) {
        console.error('❌ Place not found in places array!', {
          placeId,
          availablePlaces: placesRef.current.length,
          featureProperties: feature.properties,
        })
        return
      }

      if (activePopupRef.current) {
        activePopupRef.current.remove()
        activePopupRef.current = null
      }

      if (place.type !== 'national_park' && place.type !== 'regional_park') {
        addGeometryLayer(place).catch((error) => {
          console.warn('Failed to add geometry layer:', error)
        })
      }
      selectedPlaceIdRef.current = place.id

      const popupNode = document.createElement('div')
      const popupRoot = createRoot(popupNode)
      popupRoot.render(
        <PopupContent place={place} tags={undefined} score={undefined} />
      )

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
        removeGeometryLayer()
        selectedPlaceIdRef.current = null
      })

      activePopupRef.current = popup

      console.log('🔍 Fetching metadata for place:', place.id, place.name)
      try {
        const metadata = await getPlaceMetadata(place.id)
        console.log('📦 Metadata fetched:', metadata)
        if (popup.isOpen()) {
          console.log(
            '🎨 Updating popup with tags:',
            metadata?.tags,
            'score:',
            metadata?.score
          )
          popupRoot.render(
            <PopupContent
              place={place}
              tags={metadata?.tags}
              score={metadata?.score}
            />
          )
        } else {
          console.log('❌ Popup already closed, not updating')
        }
      } catch (error) {
        console.error('❌ Failed to fetch metadata for place:', error)
      }
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
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [layerId],
      })

      if (features.length === 0 && selectedPlaceIdRef.current) {
        removeGeometryLayer()
        selectedPlaceIdRef.current = null
        if (activePopupRef.current) {
          activePopupRef.current.remove()
          activePopupRef.current = null
        }
      }
    })
  }, [places, mapLoaded, addGeometryLayer, removeGeometryLayer])

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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (activePopupRef.current) {
        activePopupRef.current.remove()
        activePopupRef.current = null
      }
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
