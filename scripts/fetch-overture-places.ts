import 'dotenv/config'
import { FRANCE_BBOX, getDepartmentByCode } from '@/data/department.data'
import { overtureService } from '@/services/overture.service'
import { supabase } from '@/db/supabase'
import { formatPlaceObject } from '@/utils/common'

interface ProcessStats {
  processedCount: number
  insertedCount: number
  duplicateCount: number
  errorCount: number
  startTime: Date
}

class OvertureNaturePlacesFetcher {
  private stats: ProcessStats

  constructor() {
    this.stats = {
      processedCount: 0,
      insertedCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      startTime: new Date(),
    }
  }

  private preparePlace(place: any, region: string): any {
    return formatPlaceObject({
      source: 'OVERTURE',
      sourceId: `overture:${place.overture_id}`,
      name: place.name,
      type: place.type,
      location: `POINT(${place.longitude} ${place.latitude})`,
      geometry: place.geometry,
      region: region,
      country: 'France',
      description: place.metadata?.description || null,
      metadata: place,
    })
  }

  private async upsertPlacesBatch(places: any[]): Promise<void> {
    if (places.length === 0) return

    try {
      const { error } = await supabase.from('places').upsert(places, {
        onConflict: 'source_id',
      })

      if (error) {
        console.error('❌ Error upserting batch:', error.message)
        this.stats.errorCount += places.length
        throw error
      }

      console.log(`✅ Upserted batch of ${places.length} places`)
      this.stats.insertedCount += places.length
    } catch (error) {
      console.error('❌ Error upserting batch:', error)
      this.stats.errorCount += places.length
      throw error
    }
  }

  private printProgress(region: string): void {
    const runtime = Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000)
    console.log('\\n📊 --- Progress Report ---')
    console.log(`🌍 Region: ${region}`)
    console.log(`⏱️ Runtime: ${runtime}s`)
    console.log(`📝 Processed: ${this.stats.processedCount}`)
    console.log(`✅ Inserted: ${this.stats.insertedCount}`)
    console.log(`⚠️ Duplicates: ${this.stats.duplicateCount}`)
    console.log(`❌ Errors: ${this.stats.errorCount}`)
    console.log(`🐍 Downloads: ${overtureService.getDownloadCount()}`)
    console.log('-------------------------\\n')
  }

  public async fetchDepartment(departmentCode: string): Promise<void> {
    const department = getDepartmentByCode(departmentCode)
    if (!department) {
      throw new Error(`Department ${departmentCode} not found`)
    }

    console.log(`\\n🏔️ Starting Overture fetch for ${department.name} (${departmentCode})`)
    console.log(
      `📍 Bounding box: West=${department.bbox.west}, South=${department.bbox.south}, East=${department.bbox.east}, North=${department.bbox.north}`,
    )

    try {
      // Download places from Overture Maps
      console.log('🐍 Downloading places from Overture Maps...')
      const filePath = await overtureService.downloadPlaces(department.bbox, departmentCode)

      // Process the downloaded GeoJSON
      console.log('📋 Processing downloaded data...')
      const places = await overtureService.processGeoJSON(filePath)

      if (places.length === 0) {
        console.log('❓ No nature places found in this department')
        return
      }

      console.log(`🌿 Processing ${places.length} nature places...`)

      // Prepare all places for batch upsert
      const preparedPlaces = places.map((place) => {
        this.stats.processedCount++
        return this.preparePlace(place, departmentCode)
      })

      // Batch upsert in chunks of 100
      const batchSize = 100
      for (let i = 0; i < preparedPlaces.length; i += batchSize) {
        const batch = preparedPlaces.slice(i, i + batchSize)
        await this.upsertPlacesBatch(batch)

        // Progress reporting
        console.log(
          `📊 Progress: ${Math.min(i + batchSize, preparedPlaces.length)}/${preparedPlaces.length} places processed`,
        )
      }

      // Final report
      this.printProgress(`${department.name} (${departmentCode})`)
      console.log(`🏆 Completed ${department.name} (${departmentCode}) successfully!`)
    } catch (error) {
      console.error(`💥 Error processing ${department.name}:`, error)
      throw error
    }
  }

  public async fetchAllFrance(): Promise<void> {
    console.log(`\\n🇫🇷 Starting Overture fetch for ALL FRANCE`)
    console.log(
      `📍 Bounding box: West=${FRANCE_BBOX.west}, South=${FRANCE_BBOX.south}, East=${FRANCE_BBOX.east}, North=${FRANCE_BBOX.north}`,
    )

    console.log('⚠️ WARNING: This will download ALL nature places in France')
    console.log('💡 Consider using department-by-department approach for better control')

    try {
      // Download places from Overture Maps
      console.log('🐍 Downloading ALL France places from Overture Maps...')
      const filePath = await overtureService.downloadPlaces(FRANCE_BBOX, 'france')

      // Process the downloaded GeoJSON
      console.log('📋 Processing downloaded data...')
      const places = await overtureService.processGeoJSON(filePath)

      if (places.length === 0) {
        console.log('❓ No nature places found in France')
        return
      }

      console.log(`🌿 Processing ${places.length} nature places across France...`)

      // Prepare all places for batch upsert
      const preparedPlaces = places.map((place) => {
        this.stats.processedCount++
        return this.preparePlace(place, 'France')
      })

      // Batch upsert in chunks of 100
      const batchSize = 100
      for (let i = 0; i < preparedPlaces.length; i += batchSize) {
        const batch = preparedPlaces.slice(i, i + batchSize)
        await this.upsertPlacesBatch(batch)

        // Progress reporting every 1000 items for bulk operation
        if ((i + batchSize) % 1000 === 0 || i + batchSize >= preparedPlaces.length) {
          console.log(
            `📊 Progress: ${Math.min(i + batchSize, preparedPlaces.length)}/${preparedPlaces.length} places processed`,
          )
        }
      }

      // Final report
      this.printProgress('France (All)')
      console.log(`🏆 Completed ALL FRANCE successfully!`)
    } catch (error) {
      console.error(`💥 Error processing France:`, error)
      throw error
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const departmentCode = args[1]

  console.log(`🚀 Starting Overture Nature Places Fetcher`)
  console.log(`📅 Started at: ${new Date().toISOString()}`)

  const fetcher = new OvertureNaturePlacesFetcher()

  try {
    if (command === 'all' || command === 'france') {
      await fetcher.fetchAllFrance()
    } else if (departmentCode) {
      await fetcher.fetchDepartment(departmentCode)
    } else {
      // Default to Gard department
      await fetcher.fetchDepartment('30')
    }

    console.log('\\n🎉 Overture fetch completed successfully!')
    console.log(`📅 Finished at: ${new Date().toISOString()}`)
  } catch (error) {
    console.error('\\n💥 Overture fetch failed:', error)
    console.log('\\n💡 Make sure you have installed the dependencies:')
    console.log('   ./install-overture.sh')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { OvertureNaturePlacesFetcher }
