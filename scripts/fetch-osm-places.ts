import 'dotenv/config'
import { departments, getDepartmentByCode } from '@/data/department.data'
import { overpassService } from '@/services/overpass.service'
import {
  batchUpsert,
  createProcessStats,
  formatDuration,
  formatPlaceObject,
  printProgress,
  type ProcessStats,
  validatePlace,
} from '@/utils/common'
import { createPointWKT } from '@/utils/geometry'

class NaturePlacesFetcher {
  public readonly stats: ProcessStats

  constructor() {
    this.stats = createProcessStats()
  }

  private preparePlace(place: any, department: string): any {
    const location = place.latitude && place.longitude ? createPointWKT(place.longitude, place.latitude) : null
    const wikipedia_query = place.tags?.wikipedia || place.tags?.['wikipedia:fr'] || null
    const website = place.tags?.website || null

    // formatPlaceObject will set default scores based on type
    // Scores will be recalculated after insert using calculateScore()
    return formatPlaceObject({
      source: 'OSM',
      sourceId: `osm:${place.osm_id}`,
      osm_id: place.osm_id,
      name: place.name,
      type: place.type,
      location,
      geometry: place.geometry,
      region: department,
      country: 'France',
      description: place.tags?.description || null,
      wikipedia_query,
      website,
      metadata: place,
    })
  }

  private printProgress(department: string): void {
    printProgress(this.stats, `${department} | API Requests: ${overpassService.getRequestCount()}`)
  }

  public async fetchDepartment(departmentCode: string, limit?: number): Promise<void> {
    const department = getDepartmentByCode(departmentCode)
    if (!department) {
      throw new Error(`Department ${departmentCode} not found`)
    }

    console.log(`\n🌿 Starting fetch for ${department.name} (${departmentCode})`)
    console.log(
      `📍 Bounding box: South=${department.bbox.south}, West=${department.bbox.west}, North=${department.bbox.north}, East=${department.bbox.east}`,
    )
    if (limit) {
      console.log(`🔢 Limit: ${limit} places`)
    }

    try {
      // Query Overpass API
      console.log('🌐 Querying Overpass API...')
      const elements = await overpassService.queryNaturePlaces(department.bbox, departmentCode)

      if (elements.length === 0) {
        console.log('❓ No elements found in this department')
        return
      }

      console.log(`📋 Processing ${elements.length} elements from Overpass API...`)
      let places = overpassService.processElements(elements)

      if (limit && places.length > limit) {
        console.log(`✂️ Limiting to first ${limit} places (out of ${places.length})`)
        places = places.slice(0, limit)
      }

      // Prepare all places for batch upsert
      const preparedPlaces = places
        .map((place) => {
          this.stats.processedCount++
          const prepared = this.preparePlace(place, departmentCode)
          return validatePlace(prepared) ? prepared : null
        })
        .filter((place): place is NonNullable<typeof place> => place !== null)

      if (preparedPlaces.length === 0) {
        console.log('❓ No places to insert after processing')
        return
      }

      console.log(`🌿 Upserting ${preparedPlaces.length} OSM places...`)

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
      this.printProgress(`${department.name} (${departmentCode})`)
      console.log(`🎉 Completed ${department.name} (${departmentCode}) successfully!`)
    } catch (error) {
      console.error(`💥 Error processing ${department.name}:`, error)
      throw error
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const firstArg = args[0]

  console.log(`🚀 Starting OSM Nature Places Fetcher`)
  console.log(`📅 Started at: ${new Date().toISOString()}`)

  const fetcher = new NaturePlacesFetcher()

  try {
    if (firstArg) {
      const departmentCode = firstArg
      const limitArg = args.find((arg) => arg.startsWith('--limit='))
      const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
      await fetcher.fetchDepartment(departmentCode, limit)
    } else {
      console.error('❌ Usage:')
      console.log('  pnpm run fetch-osm-places <department-code> [--limit=N]')
      console.log(
        '🏞️  Available departments:',
        departments
          .slice(0, 5)
          .map((d) => `${d.code} (${d.name})`)
          .join(', '),
        '...',
      )
      process.exit(1)
    }

    console.log('\n🏁 OSM fetch completed successfully!')
    console.log(`📅 Finished at: ${new Date().toISOString()}`)
    console.log(`⏱️ Total runtime: ${formatDuration(fetcher.stats.startTime)}`)
  } catch (error) {
    console.error('\n💥 OSM fetch failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { NaturePlacesFetcher }
