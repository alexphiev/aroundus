import { OSM_FILTERS, OSM_SUPPORTED_TAGS } from '@/data/osm.data'
import { CacheManager, createCacheManager } from '@/services/utils/cache'
import { delay } from '@/services/utils/common'
import {
  calculateCenterFromCoordinates,
  closePolygon,
  isClosedPolygon,
  simplifyCoordinates,
  type Point,
} from '@/services/utils/geometry'
import { nominatimService } from '@/services/nominatim.service'

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  geometry?: Array<{ lat: number; lon: number }>
  tags?: Record<string, string>
}

interface OverpassResponse {
  version: number
  generator: string
  osm3s: {
    timestamp_osm_base: string
    copyright: string
  }
  elements: OverpassElement[]
}

interface BoundingBox {
  south: number
  west: number
  north: number
  east: number
}

export class OverpassService {
  private readonly baseUrls = [
    'https://overpass-api.de/api/interpreter',
    'https://lambert.openstreetmap.de/api/interpreter',
  ]
  private currentUrlIndex = 0
  private requestCount = 0
  private lastRequestTime = 0
  private readonly minDelayMs = 1500 // 1.5 seconds between requests
  private readonly cacheManager: CacheManager

  constructor() {
    this.cacheManager = createCacheManager({
      baseDir: 'temp',
      subDir: 'overpass',
    })
    // Ensure cache directory exists
    this.cacheManager.ensureDir().catch((error) => {
      console.warn('⚠️ Could not initialize cache manager:', error)
    })
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minDelayMs) {
      await delay(this.minDelayMs - timeSinceLastRequest)
    }
    this.lastRequestTime = Date.now()
  }

  private normalizeFeatureType(tags: Record<string, string>): string {
    const mappedType = this.formatType(tags)

    if (mappedType !== 'unknown') {
      return mappedType
    }

    console.log('🔍 UNKNOWN TYPE - Tags:', JSON.stringify(tags, null, 2))

    return 'unknown'
  }

  private formatType(tags: Record<string, string>): string {
    for (const [tagKey, tagValue] of Object.entries(tags)) {
      if (OSM_SUPPORTED_TAGS[tagKey] && OSM_SUPPORTED_TAGS[tagKey].includes(tagValue)) {
        return tagValue
      }
    }

    return 'unknown'
  }

  private getCenterPoint(element: OverpassElement): { lat: number; lon: number } | null {
    // Direct coordinates
    if (element.lat && element.lon) {
      return { lat: element.lat, lon: element.lon }
    }

    // Center point from Overpass
    if (element.center && element.center.lat && element.center.lon) {
      return element.center
    }

    // Calculate from bounds (for relations)
    if ((element as any).bounds) {
      const bounds = (element as any).bounds
      if (bounds.minlat && bounds.minlon && bounds.maxlat && bounds.maxlon) {
        return {
          lat: (bounds.minlat + bounds.maxlat) / 2,
          lon: (bounds.minlon + bounds.maxlon) / 2,
        }
      }
    }

    // Calculate from geometry
    if (element.geometry && element.geometry.length > 0) {
      try {
        return calculateCenterFromCoordinates(element.geometry)
      } catch (error) {
        console.warn(`⚠️ Failed to calculate center for element ${element.id}:`, error)
      }
    }

    // Calculate from members geometry (for relations)
    if ((element as any).members && Array.isArray((element as any).members)) {
      try {
        const allCoords: Point[] = []
        for (const member of (element as any).members) {
          if (member.geometry && Array.isArray(member.geometry)) {
            allCoords.push(...member.geometry)
          }
        }

        if (allCoords.length > 0) {
          return calculateCenterFromCoordinates(allCoords)
        }
      } catch (error) {
        console.warn(`⚠️ Failed to calculate center from members for element ${element.id}:`, error)
      }
    }

    return null
  }

  private connectAndCloseWays(ways: Array<Array<[number, number]>>): Array<Array<[number, number]>> {
    if (ways.length === 0) {
      return []
    }

    if (ways.length === 1) {
      const way = ways[0]
      if (way.length < 3) {
        return []
      }
      if (isClosedPolygon(way)) {
        return [way]
      }
      return [closePolygon(way)]
    }

    const rings: Array<Array<[number, number]>> = []
    const remaining = [...ways]

    while (remaining.length > 0) {
      let currentRing = remaining.shift()!

      if (currentRing.length < 2) {
        continue
      }

      let hasConnection = true
      while (hasConnection && remaining.length > 0) {
        hasConnection = false

        if (isClosedPolygon(currentRing)) {
          break
        }

        const lastPoint = currentRing[currentRing.length - 1]

        for (let i = 0; i < remaining.length; i++) {
          const nextWay = remaining[i]

          if (nextWay.length < 2) {
            continue
          }

          const firstPoint = nextWay[0]
          const lastPointOfNext = nextWay[nextWay.length - 1]

          if (firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1]) {
            currentRing = [...currentRing.slice(0, -1), ...nextWay]
            remaining.splice(i, 1)
            hasConnection = true
            break
          }

          if (lastPointOfNext[0] === lastPoint[0] && lastPointOfNext[1] === lastPoint[1]) {
            currentRing = [...currentRing.slice(0, -1), ...nextWay.slice(0, -1).reverse()]
            remaining.splice(i, 1)
            hasConnection = true
            break
          }
        }
      }

      if (currentRing.length >= 3) {
        if (!isClosedPolygon(currentRing)) {
          currentRing = closePolygon(currentRing)
        }
        rings.push(currentRing)
      }
    }

    return rings
  }

  private buildQuery(bbox: BoundingBox): string {
    const queries: string[] = []

    for (const [tagKey, tagValues] of Object.entries(OSM_SUPPORTED_TAGS)) {
      const valuePattern = `^(${tagValues.join('|')})$`
      queries.push(`  node[${tagKey}~"${valuePattern}"];`)
      queries.push(`  way[${tagKey}~"${valuePattern}"];`)
      queries.push(`  relation[${tagKey}~"${valuePattern}"];`)
    }

    const query = `[out:json][timeout:180][bbox:${bbox.south},${bbox.west},${bbox.north},${bbox.east}];
(
${queries.join('\n')}
);
out center geom;`
    return query
  }

  private switchToNextUrl(): void {
    this.currentUrlIndex = (this.currentUrlIndex + 1) % this.baseUrls.length
    console.log(`Switching to Overpass server: ${this.baseUrls[this.currentUrlIndex]}`)
  }

  private async loadFromCache(cacheKey?: string): Promise<OverpassElement[] | null> {
    if (!cacheKey) return null
    return await this.cacheManager.load<OverpassElement[]>(`overpass_${cacheKey}`)
  }

  private async saveToCache(elements: OverpassElement[], cacheKey?: string): Promise<void> {
    if (!cacheKey) return
    await this.cacheManager.save(`overpass_${cacheKey}`, elements)
  }

  public async queryNaturePlaces(bbox: BoundingBox, departmentCode: string, retries = 3): Promise<OverpassElement[]> {
    // Check cache first
    const cacheKey = `dept_${departmentCode}`
    const cachedData = await this.loadFromCache(cacheKey)
    if (cachedData) {
      return cachedData
    }

    await this.waitForRateLimit()

    const query = this.buildQuery(bbox)
    const currentUrl = this.baseUrls[this.currentUrlIndex]

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Querying Overpass API (attempt ${attempt}/${retries})...`)
        console.log(`URL: ${currentUrl}`)
        console.log(`Request count: ${++this.requestCount}`)

        const response = await fetch(currentUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'empreinte-backend/1.0.0',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(90000), // 90 second timeout
        })

        if (response.status === 429) {
          const delayMs = Math.min(5000 * Math.pow(2, attempt - 1), 60000) // Exponential backoff, max 60s
          console.warn(`Rate limited (429). Waiting ${delayMs}ms before retry...`)
          await delay(delayMs)
          continue
        }

        if (response.status === 504 || response.status === 502) {
          console.warn(`Gateway timeout/error (${response.status}). Switching server...`)
          this.switchToNextUrl()
          const delayMs = 5000 * attempt
          await delay(delayMs)
          continue
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = (await response.json()) as OverpassResponse
        console.log(`🌍 Successfully fetched ${data.elements.length} elements`)

        // Save to cache for future use
        await this.saveToCache(data.elements, cacheKey)

        return data.elements
      } catch (error) {
        // Handle timeout errors specifically
        if (error instanceof Error && error.name === 'TimeoutError') {
          console.error(`⏰ Request timeout after 90 seconds (attempt ${attempt}/${retries})`)
        } else {
          console.error(`Attempt ${attempt} failed:`, error)
        }

        if (attempt === retries) {
          throw new Error(`All ${retries} attempts failed. Last error: ${error}`)
        }

        const delayMs = 5000 * attempt
        console.log(`Waiting ${delayMs}ms before next attempt...`)
        await delay(delayMs)
      }
    }

    return []
  }

  /**
   * Generic query executor with retry logic and caching
   */
  private async executeQuery(query: string, cacheKey?: string, retries = 3): Promise<OverpassElement[]> {
    if (cacheKey) {
      const cachedData = await this.loadFromCache(cacheKey)
      if (cachedData) {
        return cachedData
      }
    }

    await this.waitForRateLimit()

    const currentUrl = this.baseUrls[this.currentUrlIndex]

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Querying Overpass API (attempt ${attempt}/${retries})...`)
        console.log(`URL: ${currentUrl}`)
        console.log(`Request count: ${++this.requestCount}`)

        // Add timeout: Overpass queries have timeout:60 in the query, so allow 90s for HTTP request
        const response = await fetch(currentUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'empreinte-backend/1.0.0',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(90000), // 90 second timeout
        })

        if (response.status === 429) {
          const delayMs = Math.min(5000 * Math.pow(2, attempt - 1), 60000)
          console.warn(`Rate limited (429). Waiting ${delayMs}ms before retry...`)
          await delay(delayMs)
          continue
        }

        if (response.status === 504 || response.status === 502) {
          console.warn(`Gateway timeout/error (${response.status}). Switching server...`)
          this.switchToNextUrl()
          const delayMs = 5000 * attempt
          await delay(delayMs)
          continue
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = (await response.json()) as OverpassResponse
        console.log(`✅ Successfully fetched ${data.elements.length} elements`)

        if (cacheKey) {
          await this.saveToCache(data.elements, cacheKey)
        }

        return data.elements
      } catch (error) {
        // Handle timeout errors specifically
        if (error instanceof Error && error.name === 'TimeoutError') {
          console.error(`⏰ Request timeout after 90 seconds (attempt ${attempt}/${retries})`)
        } else {
          console.error(`Attempt ${attempt} failed:`, error)
        }

        if (attempt === retries) {
          throw new Error(`All ${retries} attempts failed. Last error: ${error}`)
        }

        const delayMs = 5000 * attempt
        console.log(`Waiting ${delayMs}ms before next attempt...`)
        await delay(delayMs)
      }
    }

    return []
  }

  public convertToGeoJSON(element: OverpassElement): any {
    try {
      if (element.type === 'node' && element.lon && element.lat) {
        return {
          type: 'Point',
          coordinates: [element.lon, element.lat],
        }
      }

      if (element.type === 'way' && element.geometry && element.geometry.length > 0) {
        const coordinates: Array<[number, number]> = element.geometry.map(
          (point) => [point.lon, point.lat] as [number, number],
        )

        const simplified = simplifyCoordinates(coordinates, 0.0002)

        const tags = element.tags || {}
        if (tags.route === 'hiking') {
          return {
            type: 'LineString',
            coordinates: simplified,
          }
        }

        if (isClosedPolygon(simplified)) {
          return {
            type: 'Polygon',
            coordinates: [simplified],
          }
        }
        return {
          type: 'LineString',
          coordinates: simplified,
        }
      }

      if (element.type === 'relation' && (element as any).members && Array.isArray((element as any).members)) {
        const tags = element.tags || {}

        if (tags.route === 'hiking' || tags.route === 'bicycle' || tags.route === 'mtb') {
          const segments: Array<Array<[number, number]>> = []

          for (const member of (element as any).members) {
            if (member.geometry && Array.isArray(member.geometry)) {
              const coordinates: Array<[number, number]> = member.geometry
                .filter((point: any) => point.lat && point.lon)
                .map((point: any) => [point.lon, point.lat])
              if (coordinates.length > 0) {
                segments.push(coordinates)
              }
            }
          }

          if (segments.length === 0) {
            return null
          }

          if (segments.length === 1) {
            const simplified = simplifyCoordinates(segments[0], 0.0001)
            return {
              type: 'LineString',
              coordinates: simplified,
            }
          }

          const connectedSegments: Array<Array<[number, number]>> = []
          const remaining = [...segments]

          while (remaining.length > 0) {
            let currentSegment = remaining.shift()!
            let hasConnection = true

            while (hasConnection && remaining.length > 0) {
              hasConnection = false
              const lastPoint = currentSegment[currentSegment.length - 1]

              for (let i = 0; i < remaining.length; i++) {
                const nextSegment = remaining[i]
                const firstPoint = nextSegment[0]
                const lastPointOfNext = nextSegment[nextSegment.length - 1]

                if (firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1]) {
                  currentSegment = [...currentSegment, ...nextSegment.slice(1)]
                  remaining.splice(i, 1)
                  hasConnection = true
                  break
                }

                if (lastPointOfNext[0] === lastPoint[0] && lastPointOfNext[1] === lastPoint[1]) {
                  currentSegment = [...currentSegment, ...nextSegment.slice(0, -1).reverse()]
                  remaining.splice(i, 1)
                  hasConnection = true
                  break
                }
              }
            }

            connectedSegments.push(currentSegment)
          }

          if (connectedSegments.length === 1) {
            const simplified = simplifyCoordinates(connectedSegments[0], 0.0001)
            return {
              type: 'LineString',
              coordinates: simplified,
            }
          }

          const simplifiedSegments = connectedSegments.map((seg) => simplifyCoordinates(seg, 0.0001))
          return {
            type: 'MultiLineString',
            coordinates: simplifiedSegments,
          }
        }

        const outerWays: Array<Array<[number, number]>> = []
        const innerWays: Array<Array<[number, number]>> = []

        for (const member of (element as any).members) {
          if (member.geometry && Array.isArray(member.geometry)) {
            const coordinates: Array<[number, number]> = member.geometry
              .filter((point: any) => point.lat && point.lon)
              .map((point: any) => [point.lon, point.lat])

            if (coordinates.length > 0) {
              const simplified = simplifyCoordinates(coordinates, 0.0002)

              if (member.role === 'outer') {
                outerWays.push(simplified)
              } else if (member.role === 'inner') {
                innerWays.push(simplified)
              }
            }
          }
        }

        if (outerWays.length === 0) {
          const center = this.getCenterPoint(element)
          if (center) {
            return {
              type: 'Point',
              coordinates: [center.lon, center.lat],
            }
          }
          return null
        }

        const closedOuterWays = this.connectAndCloseWays(outerWays)
        const closedInnerWays = this.connectAndCloseWays(innerWays)

        if (closedOuterWays.length === 1 && closedInnerWays.length === 0) {
          return {
            type: 'Polygon',
            coordinates: [closedOuterWays[0]],
          }
        }

        if (closedOuterWays.length === 1 && closedInnerWays.length > 0) {
          return {
            type: 'Polygon',
            coordinates: [closedOuterWays[0], ...closedInnerWays],
          }
        }

        const polygons: Array<Array<Array<[number, number]>>> = closedOuterWays.map((outerWay) => [outerWay])

        return {
          type: 'MultiPolygon',
          coordinates: polygons,
        }
      }

      const center = this.getCenterPoint(element)
      if (center) {
        return {
          type: 'Point',
          coordinates: [center.lon, center.lat],
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to convert geometry for element ${element.id}:`, error)
    }

    return null
  }

  public processElements(elements: OverpassElement[]): Array<{
    osm_id: number
    name: string
    type: string
    latitude: number | null
    longitude: number | null
    geometry: any
    tags: Record<string, string>
  }> {
    return elements
      .map((element) => {
        const tags = element.tags || {}
        const center = this.getCenterPoint(element)
        const geoJsonGeometry = this.convertToGeoJSON(element)

        // Debug logging for problematic elements
        if (!center && !geoJsonGeometry) {
          console.warn(`⚠️ Element ${element.id} (type: ${element.type}) debug:`)
          console.warn(`  - Has center: ${!!element.center}`)
          console.warn(`  - Has lat/lon: ${!!element.lat}/${!!element.lon}`)
          console.warn(`  - Has geometry: ${!!element.geometry} (length: ${element.geometry?.length || 0})`)
          console.warn(`  - Tags: ${Object.keys(tags).join(', ')}`)
        }

        // Skip elements without both center and geometry
        if (!center && !geoJsonGeometry) {
          console.warn(
            `⚠️ Cannot determine location for element ${element.id} (type: ${element.type}), skipping - no center and no geometry`,
          )
          return null
        }

        // Skip elements without names
        if (!tags.name || tags.name.trim() === '') {
          return null
        }

        const placeType = this.normalizeFeatureType(tags)
        const place = {
          osm_id: element.id,
          name: tags.name,
          type: placeType,
          latitude: center?.lat || null,
          longitude: center?.lon || null,
          geometry: geoJsonGeometry,
          tags,
        }

        if (!this.shouldIncludePlace(place)) {
          console.log(`🔧 Filtering out ${placeType}: ${tags.name} (failed filter criteria)`)
          return null
        }

        return place
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }

  public getRequestCount(): number {
    return this.requestCount
  }

  private calculateArea(geometry: any): number | null {
    if (!geometry) {
      return null
    }

    if (geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates[0]) {
      return this.calculatePolygonArea(geometry.coordinates[0])
    }

    if (geometry.type === 'MultiPolygon' && geometry.coordinates) {
      return geometry.coordinates.reduce((total: number, polygon: any) => {
        if (polygon[0]) {
          return total + this.calculatePolygonArea(polygon[0])
        }
        return total
      }, 0)
    }

    return null
  }

  private calculatePolygonArea(coordinates: Array<[number, number]>): number {
    if (coordinates.length < 3) {
      return 0
    }

    let area = 0
    const numPoints = coordinates.length - 1

    for (let i = 0; i < numPoints; i++) {
      const [lon1, lat1] = coordinates[i]
      const [lon2, lat2] = coordinates[i + 1]
      area += lon1 * lat2 - lon2 * lat1
    }

    area = Math.abs(area) / 2

    const avgLat = coordinates.reduce((sum, [, lat]) => sum + lat, 0) / coordinates.length
    const metersPerDegree = 111320 * Math.cos((avgLat * Math.PI) / 180)
    const areaInSquareMeters = area * metersPerDegree * metersPerDegree

    return areaInSquareMeters
  }

  private shouldIncludePlace(place: {
    type: string
    name: string
    tags: Record<string, string>
    geometry: any
  }): boolean {
    const { tags, name, type, geometry } = place

    if (!name || name.length < 3) {
      return false
    }

    const minArea = OSM_FILTERS.minArea[type as keyof typeof OSM_FILTERS.minArea]
    if (minArea) {
      const area = this.calculateArea(geometry)
      if (!area || area < minArea) {
        return false
      }
    }

    const requiredTags = OSM_FILTERS.requireTags[type as keyof typeof OSM_FILTERS.requireTags]
    if (requiredTags) {
      if (!requiredTags.every((tag) => tags[tag])) {
        return false
      }
    }

    return true
  }

  /**
   * Query Overpass API for specific OSM elements by their IDs
   * Supports batch queries for efficient data retrieval
   */
  public async queryByIds(ids: number[], batchSize = 15): Promise<OverpassElement[]> {
    const results: OverpassElement[] = []

    // Split IDs into batches to avoid query size limits
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)

      try {
        console.log(
          `🔍 Querying batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)} with ${batch.length} IDs`,
        )

        const batchResults = await this.queryBatchIds(batch)
        results.push(...batchResults)

        console.log(`✅ Batch completed: found ${batchResults.length}/${batch.length} elements`)
      } catch (error) {
        console.error(`❌ Failed to query batch ${Math.floor(i / batchSize) + 1}:`, error)
        console.log(`📝 Failed IDs: ${batch.join(', ')}`)
      }
    }

    return results
  }

  /**
   * Query a single batch of OSM IDs
   */
  private async queryBatchIds(ids: number[]): Promise<OverpassElement[]> {
    await this.waitForRateLimit()

    // Build query for specific IDs
    const query = this.buildIdQuery(ids)
    const currentUrl = this.baseUrls[this.currentUrlIndex]

    console.log(`🌐 Querying Overpass API...`)
    console.log(`📍 URL: ${currentUrl}`)
    console.log(`🔢 Request count: ${++this.requestCount}`)

    const response = await fetch(currentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'empreinte-backend/1.0.0',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(90000), // 90 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = (await response.json()) as OverpassResponse

    if (!data.elements || !Array.isArray(data.elements)) {
      console.warn('⚠️ No elements found in response')
      return []
    }

    return data.elements
  }

  /**
   * Build Overpass query for specific OSM element IDs
   */
  private buildIdQuery(ids: number[]): string {
    // Group IDs by type (we don't know the type, so query all types)
    const idList = ids.join(',')

    return `[out:json][timeout:180];
(
  relation(id:${idList});
  way(id:${idList});
  node(id:${idList});
);
out center geom;`
  }

  /**
   * Fetch full OSM elements by their IDs and types
   * This is much faster than searching by name since we know the exact IDs
   */
  private async fetchElementsByIds(
    elements: Array<{ type: 'node' | 'way' | 'relation'; id: number }>,
  ): Promise<OverpassElement[]> {
    if (elements.length === 0) {
      return []
    }

    // Group by type for more efficient queries
    const nodes: number[] = []
    const ways: number[] = []
    const relations: number[] = []

    elements.forEach((el) => {
      if (el.type === 'node') {
        nodes.push(el.id)
      } else if (el.type === 'way') {
        ways.push(el.id)
      } else if (el.type === 'relation') {
        relations.push(el.id)
      }
    })

    const queries: string[] = []
    if (nodes.length > 0) {
      queries.push(`  node(id:${nodes.join(',')});`)
    }
    if (ways.length > 0) {
      queries.push(`  way(id:${ways.join(',')});`)
    }
    if (relations.length > 0) {
      queries.push(`  relation(id:${relations.join(',')});`)
    }

    if (queries.length === 0) {
      return []
    }

    const query = `[out:json][timeout:30];
(
${queries.join('\n')}
);
out center geom;`

    try {
      return await this.executeQuery(query, undefined, 2)
    } catch (error) {
      console.warn(`⚠️  Failed to fetch full OSM details:`, error)
      return []
    }
  }

  /**
   * Build Overpass query for French national parks
   */
  private buildNationalParksQuery(bbox: BoundingBox): string {
    const query = `[out:json][timeout:180][bbox:${bbox.south},${bbox.west},${bbox.north},${bbox.east}];
(
  way[boundary="national_park"];
  relation[boundary="national_park"];
  way[leisure="nature_reserve"]["designation"~"parc national",i];
  relation[leisure="nature_reserve"]["designation"~"parc national",i];
  way[name~"Parc national",i];
  relation[name~"Parc national",i];
);
out center geom;`
    return query
  }

  /**
   * Search for French national parks in a bounding box
   */
  public async queryNationalParks(bbox: BoundingBox, retries = 3): Promise<OverpassElement[]> {
    const query = this.buildNationalParksQuery(bbox)
    return this.executeQuery(query, undefined, retries)
  }

  /**
   * Search for a place by name using Nominatim (much faster than Overpass for name searches)
   * Fetches full OSM details from Overpass after getting matches from Nominatim
   * Returns elements and a flag indicating if Nominatim found results but none were nature places
   */
  public async searchPlaceByName(
    placeName: string,
    bbox?: BoundingBox,
  ): Promise<{ elements: OverpassElement[]; noNatureMatch: boolean }> {
    console.log(`🔍 Searching OSM for: "${placeName}"`)

    // Try Nominatim first (much faster for name searches)
    try {
      const nominatimResult = await nominatimService.searchPlaceByName(placeName, bbox)

      // Check if Nominatim found results but none were nature places
      if (nominatimResult.hasAnyResults && nominatimResult.naturePlaces.length === 0) {
        console.log(`⚠️  Nominatim found results but none are nature places`)
        return { elements: [], noNatureMatch: true }
      }

      if (nominatimResult.naturePlaces.length > 0) {
        console.log(`✅ Found ${nominatimResult.naturePlaces.length} nature place(s) via Nominatim`)

        // Fetch full OSM details from Overpass using the OSM IDs
        // This gives us complete geometry, all tags, and proper center points
        const osmIds = nominatimResult.naturePlaces.map((r) => ({ type: r.type, id: r.id }))
        const fullElements = await this.fetchElementsByIds(osmIds)

        // Map Nominatim results to full Overpass elements by matching IDs
        const idMap = new Map<string, OverpassElement>()
        fullElements.forEach((el) => {
          idMap.set(`${el.type}/${el.id}`, el)
        })

        // Return full elements, or fallback to basic info if Overpass fetch failed
        const elements = nominatimResult.naturePlaces
          .map((result) => {
            const key = `${result.type}/${result.id}`
            const fullElement = idMap.get(key)

            if (fullElement) {
              // Use full element from Overpass (has complete geometry and tags)
              return fullElement
            } else {
              // Fallback: create basic element from Nominatim data
              // This shouldn't happen often, but provides a fallback
              console.warn(`⚠️  Could not fetch full OSM details for ${result.type}/${result.id}`)
              return {
                type: result.type,
                id: result.id,
                tags: {
                  name: result.name,
                },
              } as OverpassElement
            }
          })
          .filter((el) => el !== undefined) as OverpassElement[]

        return { elements, noNatureMatch: false }
      } else {
        console.log(`❌ No results found via Nominatim`)
      }
    } catch (error) {
      console.warn(`⚠️  Nominatim search failed:`, error)
    }

    return { elements: [], noNatureMatch: false }
  }
}

export const overpassService = new OverpassService()
