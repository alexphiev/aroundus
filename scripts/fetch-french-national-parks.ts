import 'dotenv/config'
import { getExistingPlaces } from '@/db/places'
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
import { createPointWKT, simplifyCoordinates } from '@/utils/geometry'

interface FrenchNationalParkFeature {
  type: 'Feature'
  geometry?: any
  properties?: {
    gest_site?: string
    nom_site?: string
    id_pn?: string
    fid?: number
    id_local?: string
    id_mnhn?: string
    date_crea?: string
    modif_adm?: string | null
    modif_geo?: string | null
    url_fiche?: string
    surf_off?: number | null
    surf_ha?: number | null
    acte_deb?: string
    decret?: string
    acte_fin?: string | null
    precision?: string | null
    src_geom?: string | null
    src_annee?: string | null
    [key: string]: any
  }
}

interface FrenchNationalParkData {
  type: 'FeatureCollection'
  name: string
  crs?: {
    type: string
    properties: {
      name: string
    }
  }
  features: FrenchNationalParkFeature[]
}

class FrenchNationalParksFetcher {
  public readonly stats: ProcessStats
  private readonly cacheManager: CacheManager
  private readonly reservesCacheKey = 'datagouv/national_parks_reserves_france'
  private readonly zonesCacheKey = 'datagouv/national_parks_zones_france'
  private readonly reservesUrl = 'https://www.data.gouv.fr/api/1/datasets/r/741ef23e-7ed4-46e3-a16b-d80aa73de9dd'
  private readonly zonesUrl = 'https://www.data.gouv.fr/api/1/datasets/r/bb4cda9a-9036-4458-9113-e05b923f0656'
  private force: boolean
  private limit?: number

  constructor(force = false, limit?: number) {
    this.stats = createProcessStats()
    this.cacheManager = createCacheManager({ baseDir: 'temp' })
    this.force = force
    this.limit = limit
  }

  private normalizeProperties(properties: any): any {
    const normalized: any = {}
    for (const [key, value] of Object.entries(properties)) {
      normalized[key.toLowerCase()] = value
    }
    return normalized
  }

  private async loadFromCache(cacheKey: string): Promise<FrenchNationalParkFeature[] | null> {
    const data = await this.cacheManager.load<FrenchNationalParkData>(cacheKey)
    if (!data) {
      return null
    }

    if (data.type === 'FeatureCollection' && data.features && Array.isArray(data.features)) {
      return data.features
    }

    console.warn('⚠️ Cached data format not recognized, will re-download')
    return null
  }

  private async saveToCache(data: any, cacheKey: string): Promise<void> {
    await this.cacheManager.save(cacheKey, data)
  }

  private async downloadData(url: string, cacheKey: string, label: string): Promise<FrenchNationalParkFeature[]> {
    console.log(`🌐 Downloading ${label} from data.gouv.fr...`)

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'empreinte-backend/1.0.0',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = (await response.json()) as FrenchNationalParkData
      console.log(`📥 Successfully downloaded ${label}`)

      await this.saveToCache(data, cacheKey)

      if (data.type === 'FeatureCollection' && data.features && Array.isArray(data.features)) {
        return data.features
      }

      throw new Error('Unexpected data format received - not a FeatureCollection')
    } catch (error) {
      console.error(`❌ Failed to download ${label}:`, error)
      throw error
    }
  }

  private extractShortName(name: string): string {
    const cleanName = name
      .replace(/^Parc national\s+(de\s+la\s+|des\s+|du\s+|de\s+|d')?/i, '')
      .replace(/^PN\s+/i, '')
      .trim()
    return cleanName
  }

  private async findParkInOSM(parkName: string, geometry: any): Promise<any | null> {
    console.log(`🔍 Searching OSM for park: ${parkName}`)

    const center = calculateGeometryCenter(geometry)
    if (!center) {
      console.warn(`⚠️ Cannot determine center for park: ${parkName}`)
      return null
    }

    const searchRadius = 0.5
    const bbox = {
      south: center.lat - searchRadius,
      west: center.lon - searchRadius,
      north: center.lat + searchRadius,
      east: center.lon + searchRadius,
    }

    try {
      const elements = await overpassService.queryNationalParks(bbox)

      if (!elements || elements.length === 0) {
        console.log(`❌ No OSM data found for: ${parkName}`)
        return null
      }

      for (const element of elements) {
        const tags = element.tags || {}
        if (tags.name && tags.name.toLowerCase().includes(parkName.toLowerCase())) {
          console.log(`✅ Found OSM match for: ${parkName} (ID: ${element.id})`)
          return {
            ...element,
            geometry: overpassService.convertToGeoJSON(element),
          }
        }
      }

      console.log(`⚠️ No exact name match in OSM for: ${parkName}, using first result`)
      const firstElement = elements[0]
      return {
        ...firstElement,
        geometry: overpassService.convertToGeoJSON(firstElement),
      }
    } catch (error) {
      console.error(`❌ Error searching OSM for ${parkName}:`, error)
      return null
    }
  }

  private mergeGeometries(geometries: any[], parkName: string): any {
    const allPolygons: Array<Array<Array<[number, number]>>> = []

    for (const geom of geometries) {
      if (!geom || !geom.coordinates) {
        continue
      }

      if (geom.type === 'Polygon') {
        const simplifiedRings = geom.coordinates.map((ring: Array<[number, number]>) =>
          simplifyCoordinates(ring, 0.0002),
        )
        allPolygons.push(simplifiedRings)
      } else if (geom.type === 'MultiPolygon') {
        for (const polygon of geom.coordinates) {
          const simplifiedRings = polygon.map((ring: Array<[number, number]>) => simplifyCoordinates(ring, 0.0002))
          allPolygons.push(simplifiedRings)
        }
      }
    }

    if (allPolygons.length === 0) {
      return null
    }

    console.log(`📐 ${parkName}: merged ${geometries.length} features into ${allPolygons.length} polygons`)

    if (allPolygons.length === 1) {
      return {
        type: 'Polygon',
        coordinates: allPolygons[0],
      }
    }

    return {
      type: 'MultiPolygon',
      coordinates: allPolygons,
    }
  }

  private async preparePlace(
    parkName: string,
    geometries: any[],
    properties: any[],
    osmData: any | null,
  ): Promise<any | null> {
    if (!parkName || parkName.trim() === '') {
      return null
    }

    if (!osmData) {
      console.error(`❌ No OSM data found for park: ${parkName} - skipping`)
      return null
    }

    const finalGeometry = this.mergeGeometries(geometries, parkName)
    if (!finalGeometry) {
      console.error(`❌ No valid geometry for park: ${parkName} - skipping`)
      return null
    }

    const center = calculateGeometryCenter(geometries[0])
    if (!center) {
      console.warn(`⚠️ Cannot determine center point for park: ${parkName}`)
      return null
    }

    const osmId = String(osmData.id)
    const wikipediaQuery = osmData?.tags?.wikipedia || osmData?.tags?.['wikipedia:fr'] || null
    const website = osmData?.tags?.website || null
    const sourceId = `datagouv:national:${parkName.toLowerCase().replace(/\s+/g, '-')}`

    // formatPlaceObject will set correct score for national_park type
    // Scores will be recalculated after insert using calculateScore() when needed
    return formatPlaceObject({
      source: 'MANUAL',
      sourceId,
      osm_id: osmId,
      name: parkName,
      short_name: this.extractShortName(parkName),
      type: 'national_park',
      location: createPointWKT(center.lon, center.lat),
      geometry: finalGeometry,
      region: null,
      country: 'France',
      description: null,
      website,
      wikipedia_query: wikipediaQuery,
      metadata: {
        source_url_reserves: this.reservesUrl,
        source_url_zones: this.zonesUrl,
        properties,
      },
    })
  }

  private printProgress(): void {
    printProgress(this.stats, 'French National Parks')
  }

  public async fetchAllParks(): Promise<void> {
    console.log(`\n🏔️  Starting fetch for French National Parks`)

    try {
      await this.cacheManager.ensureDir()

      let reserves = await this.loadFromCache(this.reservesCacheKey)
      if (!reserves) {
        reserves = await this.downloadData(this.reservesUrl, this.reservesCacheKey, 'réserves intégrales')
      }
      console.log(`📊 Loaded ${reserves.length} features from réserves intégrales`)

      let zones = await this.loadFromCache(this.zonesCacheKey)
      if (!zones) {
        zones = await this.downloadData(this.zonesUrl, this.zonesCacheKey, "zones coeur et aires d'adhésion")
      }
      console.log(`📊 Loaded ${zones.length} features from zones coeur et aires d'adhésion`)

      const parksByName = new Map<string, { geometries: any[]; properties: any[] }>()

      for (const feature of [...reserves, ...zones]) {
        const rawProperties = feature.properties || {}
        const normalizedProperties = this.normalizeProperties(rawProperties)
        const parkName = normalizedProperties.gest_site

        if (!parkName) {
          continue
        }

        if (!parksByName.has(parkName)) {
          parksByName.set(parkName, { geometries: [], properties: [] })
        }

        if (feature.geometry) {
          parksByName.get(parkName)!.geometries.push(feature.geometry)
        }
        parksByName.get(parkName)!.properties.push(normalizedProperties)
      }

      console.log(`📋 Found ${parksByName.size} unique national parks`)

      if (!this.force) {
        const parkNames = Array.from(parksByName.keys())
        const existingParks = await getExistingPlaces(parkNames)

        for (const existingPark of existingParks) {
          parksByName.delete(existingPark)
          console.log(`⏭️  Skipping existing park: ${existingPark}`)
        }

        console.log(`📋 ${parksByName.size} parks to process (${existingParks.length} already exist)`)
      }

      const preparedPlaces = []
      let processedCount = 0

      for (const [parkName, data] of parksByName) {
        if (this.limit && processedCount >= this.limit) {
          console.log(`🛑 Limit of ${this.limit} parks reached, stopping`)
          break
        }

        this.stats.processedCount++
        processedCount++

        const osmData = await this.findParkInOSM(parkName, data.geometries[0])

        const prepared = await this.preparePlace(parkName, data.geometries, data.properties, osmData)

        if (prepared && validatePlace(prepared)) {
          preparedPlaces.push(prepared)
        }
      }

      if (preparedPlaces.length === 0) {
        console.log('❓ No places to insert after processing')
        return
      }

      console.log(`🏔️  Upserting ${preparedPlaces.length} French national parks...`)

      await batchUpsert(
        preparedPlaces,
        {
          tableName: 'places',
          conflictColumn: 'source_id',
          batchSize: 10,
        },
        this.stats,
      )

      this.printProgress()
      console.log(`🎉 Completed French National Parks import successfully!`)
    } catch (error) {
      console.error(`💥 Error processing French National Parks:`, error)
      throw error
    }
  }
}

async function main() {
  const force = process.argv.includes('--force')
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined

  console.log(`🚀 Starting French National Parks Fetcher`)
  console.log(`📅 Started at: ${new Date().toISOString()}`)
  if (force) {
    console.log(`⚡ Force mode enabled - will update existing parks`)
  }
  if (limit) {
    console.log(`🔢 Limit set to ${limit} parks`)
  }

  const fetcher = new FrenchNationalParksFetcher(force, limit)

  try {
    await fetcher.fetchAllParks()

    console.log('\n🏁 French national parks fetch completed successfully!')
    console.log(`📅 Finished at: ${new Date().toISOString()}`)
    console.log(`⏱️ Total runtime: ${formatDuration(fetcher.stats.startTime)}`)
  } catch (error) {
    console.error('\n💥 French national parks fetch failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { FrenchNationalParksFetcher }
