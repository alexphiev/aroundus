import 'dotenv/config'
import { overpassService } from '@/services/overpass.service'
import { CacheManager, createCacheManager } from '@/utils/cache'
import {
  batchUpsert,
  calculateGeometryCenter,
  createProcessStats,
  formatDuration,
  formatPlaceObject,
  printProgress,
  type ProcessStats,
  validatePlace,
} from '@/utils/common'
import { createPointWKT, simplifyCoordinates, transformGeometry } from '@/utils/geometry'

interface FrenchRegionalPark {
  id?: string | number
  geometry?: any
  properties?: {
    name?: string
    nom?: string
    [key: string]: any
  }
  [key: string]: any
}

class FrenchRegionalParksFetcher {
  public readonly stats: ProcessStats
  private readonly cacheManager: CacheManager
  private readonly cacheKey = 'datagouv/regional_parks_france'
  private readonly dataUrl = 'https://www.data.gouv.fr/api/1/datasets/r/1c2e318d-eadd-4e3d-8b36-d3cac67cd796'

  constructor() {
    this.stats = createProcessStats()
    this.cacheManager = createCacheManager({ baseDir: 'temp' })
  }

  private async loadFromCache(): Promise<FrenchRegionalPark[] | null> {
    const data = await this.cacheManager.load<any>(this.cacheKey)
    if (!data) return null

    // Handle both GeoJSON and plain JSON formats
    if (data.features && Array.isArray(data.features)) {
      return data.features
    } else if (Array.isArray(data)) {
      return data
    } else {
      console.warn('⚠️ Cached data format not recognized, will re-download')
      return null
    }
  }

  private async saveToCache(data: any): Promise<void> {
    await this.cacheManager.save(this.cacheKey, data)
  }

  private async downloadData(): Promise<FrenchRegionalPark[]> {
    console.log('🌐 Downloading French regional parks data from data.gouv.fr...')

    try {
      const response = await fetch(this.dataUrl, {
        headers: {
          'User-Agent': 'empreinte-backend/1.0.0',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📥 Successfully downloaded French regional parks data')

      // Save to cache for future use
      await this.saveToCache(data)

      // Handle both GeoJSON and plain JSON formats
      if ((data as any).features && Array.isArray((data as any).features)) {
        return (data as any).features
      } else if (Array.isArray(data)) {
        return data as FrenchRegionalPark[]
      } else {
        throw new Error('Unexpected data format received')
      }
    } catch (error) {
      console.error('❌ Failed to download data:', error)
      throw error
    }
  }

  private extractShortName(name: string): string {
    // Remove "Parc naturel régional" prefix
    const cleanName = name.replace(/^Parc naturel régional\s+(de\s+la\s+|des\s+|du\s+|de\s+|d')?/i, '').trim()
    return cleanName
  }

  private preparePlace(park: FrenchRegionalPark, overpassData?: any): any | null {
    const properties = park.properties || {}
    const name = properties.name || properties.nom || properties.NAME || 'Unknown Park'

    if (!name || name.trim() === '' || name === 'Unknown Park') {
      return null
    }

    // Use Overpass geometry if available (already in WGS84), otherwise transform data.gouv.fr geometry
    let finalGeometry = park.geometry
    let center: { lat: number; lon: number } | null = null

    if (overpassData && overpassData.geometry) {
      finalGeometry = overpassData.geometry
      center = overpassData.center || calculateGeometryCenter(overpassData.geometry)
    } else {
      if (properties.osm_id) {
        console.log(`⚠️ OSM data not found for park: ${name} (ID: ${properties.osm_id})`)
      }
      console.log(`📍 Using data.gouv.fr geometry for park: ${name}`)
      center = calculateGeometryCenter(park.geometry)

      // Transform and simplify original geometry if no Overpass data
      if (park.geometry && park.geometry.coordinates) {
        try {
          // First, transform coordinates from Lambert 93 to WGS84 if needed
          const transformedGeometry = transformGeometry(park.geometry)

          // Then simplify the transformed geometry
          if (transformedGeometry.type === 'Polygon' && Array.isArray(transformedGeometry.coordinates)) {
            // Simplify each ring of the polygon
            finalGeometry = {
              ...transformedGeometry,
              coordinates: transformedGeometry.coordinates.map(
                (ring: Array<[number, number]>) => simplifyCoordinates(ring, 0.0002), // ~20m tolerance
              ),
            }
          } else if (transformedGeometry.type === 'MultiPolygon' && Array.isArray(transformedGeometry.coordinates)) {
            // Simplify each polygon in the multipolygon
            finalGeometry = {
              ...transformedGeometry,
              coordinates: transformedGeometry.coordinates.map((polygon: Array<Array<[number, number]>>) =>
                polygon.map(
                  (ring: Array<[number, number]>) => simplifyCoordinates(ring, 0.0002), // ~20m tolerance
                ),
              ),
            }
          } else {
            // For other geometry types, just use the transformed version
            finalGeometry = transformedGeometry
          }
        } catch (error) {
          console.warn(`⚠️ Failed to process geometry for park: ${name}`, error)
          // Keep original geometry if processing fails
        }
      }
    }

    if (!center) {
      console.warn(`⚠️ Cannot determine center point for park: ${name}`)
      return null
    }

    // Use park's ID if available, otherwise generate one
    const sourceId = park.id ? `datagouv:${park.id}` : `datagouv:${name.toLowerCase().replace(/\s+/g, '-')}`
    const website = properties.website || null
    const wikipediaQuery = properties.wikipedia || null

    // formatPlaceObject will set correct score for regional_park type
    // Scores will be recalculated after insert using calculateScore() when needed
    return formatPlaceObject({
      source: 'DATA.GOUV',
      sourceId,
      osm_id: properties.osm_id ? String(properties.osm_id).replace(/^-/, '') : null,
      name,
      short_name: this.extractShortName(name),
      type: 'regional_park',
      location: createPointWKT(center.lon, center.lat),
      geometry: finalGeometry,
      region: null,
      country: 'France',
      description: properties.description || null,
      website,
      wikipedia_query: wikipediaQuery,
      metadata: {
        ...properties,
        source_url: this.dataUrl,
      },
    })
  }

  private printProgress(): void {
    printProgress(this.stats, 'French Regional Parks')
  }

  /**
   * Extract OSM IDs from parks data (removing leading '-' if present)
   */
  private extractOsmIds(parks: FrenchRegionalPark[]): number[] {
    const osmIds: number[] = []

    for (const park of parks) {
      const properties = park.properties || {}
      if (properties.osm_id) {
        // Remove leading '-' and convert to number
        const cleanId = String(properties.osm_id).replace(/^-/, '')
        const numericId = parseInt(cleanId, 10)

        if (!isNaN(numericId)) {
          osmIds.push(numericId)
        } else {
          console.warn(`⚠️ Invalid OSM ID for park: ${properties.name || 'Unknown'} - ${properties.osm_id}`)
        }
      }
    }

    console.log(`📋 Extracted ${osmIds.length} OSM IDs from ${parks.length} parks`)
    return osmIds
  }

  /**
   * Enrich parks data with Overpass API data
   */
  private async enrichParksWithOverpassData(parks: FrenchRegionalPark[]): Promise<Map<number, any>> {
    console.log(`🔍 Enriching ${parks.length} parks with Overpass data...`)

    // Extract OSM IDs
    const osmIds = this.extractOsmIds(parks)

    if (osmIds.length === 0) {
      console.log(`⚠️ No valid OSM IDs found, skipping Overpass enrichment`)
      return new Map()
    }

    // Query Overpass API in batches
    const overpassElements = await overpassService.queryByIds(osmIds)

    // Create map of OSM ID to processed element data
    const elementMap = new Map<number, any>()
    for (const element of overpassElements) {
      // Convert raw element to processed data with geometry
      const processedElement = {
        ...element,
        geometry: overpassService.convertToGeoJSON(element),
      }
      elementMap.set(element.id, processedElement)
    }

    console.log(`✅ Retrieved ${overpassElements.length}/${osmIds.length} elements from Overpass`)

    // Log missing elements
    const foundIds = new Set(overpassElements.map((e) => e.id))
    const missingIds = osmIds.filter((id) => !foundIds.has(id))
    if (missingIds.length > 0) {
      console.log(`❌ Missing OSM elements: ${missingIds.join(', ')}`)
    }

    return elementMap
  }

  public async fetchAllParks(): Promise<void> {
    console.log(`\n🏞️  Starting fetch for French Regional Parks`)

    try {
      await this.cacheManager.ensureDir()

      // Try to load from cache first
      let parks = await this.loadFromCache()

      // If not cached, download the data
      if (!parks) {
        parks = await this.downloadData()
      }

      if (!parks || parks.length === 0) {
        console.log('❓ No parks found in the dataset')
        return
      }

      console.log(`📋 Processing ${parks.length} French regional parks...`)

      // Enrich parks with Overpass data
      const overpassDataMap = await this.enrichParksWithOverpassData(parks)

      // Prepare all places for batch upsert, merging data sources
      const preparedPlaces = parks
        .map((park) => {
          this.stats.processedCount++

          // Get OSM ID for this park
          const properties = park.properties || {}
          const osmId = properties.osm_id ? parseInt(String(properties.osm_id).replace(/^-/, ''), 10) : null
          const overpassData = osmId ? overpassDataMap.get(osmId) : null

          const prepared = this.preparePlace(park, overpassData)
          return prepared && validatePlace(prepared) ? prepared : null
        })
        .filter((place): place is NonNullable<typeof place> => place !== null)

      if (preparedPlaces.length === 0) {
        console.log('❓ No places to insert after processing')
        return
      }

      console.log(`🏞️  Upserting ${preparedPlaces.length} French regional parks...`)

      // Batch upsert in chunks of 10 to prevent timeout with large geometry data
      await batchUpsert(
        preparedPlaces,
        {
          tableName: 'places',
          conflictColumn: 'osm_id',
          batchSize: 10,
        },
        this.stats,
      )

      // Final report
      this.printProgress()
      console.log(`🎉 Completed French Regional Parks import successfully!`)
    } catch (error) {
      console.error(`💥 Error processing French Regional Parks:`, error)
      throw error
    }
  }
}

// Main execution
async function main() {
  console.log(`🚀 Starting French Regional Parks Fetcher`)
  console.log(`📅 Started at: ${new Date().toISOString()}`)

  const fetcher = new FrenchRegionalParksFetcher()

  try {
    await fetcher.fetchAllParks()

    console.log('\n🏁 French regional parks fetch completed successfully!')
    console.log(`📅 Finished at: ${new Date().toISOString()}`)
    console.log(`⏱️ Total runtime: ${formatDuration(fetcher.stats.startTime)}`)
  } catch (error) {
    console.error('\n💥 French regional parks fetch failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { FrenchRegionalParksFetcher }
