import fs from 'fs/promises'
import path from 'path'
import { SCORE_CONFIG } from '../services/score-config.service'
import { supabase } from '../services/supabase.service'
import { transformGeometry } from './geometry'

export interface ProcessStats {
  processedCount: number
  insertedCount: number
  duplicateCount: number
  errorCount: number
  startTime: Date
}

export interface CacheOptions {
  baseDir?: string
  subDir?: string
}

export interface BatchUpsertOptions {
  tableName: 'places' | 'saved_places' | 'search_history'
  conflictColumn: string
  batchSize?: number
}

/**
 * Creates a new ProcessStats object with default values
 */
export function createProcessStats(): ProcessStats {
  return {
    processedCount: 0,
    insertedCount: 0,
    duplicateCount: 0,
    errorCount: 0,
    startTime: new Date(),
  }
}

/**
 * Prints progress statistics in a standardized format
 */
export function printProgress(stats: ProcessStats, context?: string): void {
  const runtime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000)
  console.log('\n📊 --- Progress Report ---')
  if (context) {
    console.log(`🎯 Context: ${context}`)
  }
  console.log(`⏱️  Runtime: ${runtime}s`)
  console.log(`📝 Processed: ${stats.processedCount}`)
  console.log(`✅ Inserted: ${stats.insertedCount}`)
  console.log(`⚠️  Duplicates: ${stats.duplicateCount}`)
  console.log(`❌ Errors: ${stats.errorCount}`)
  console.log('-------------------------\n')
}

/**
 * Ensures a cache directory exists
 */
export async function ensureCacheDir(options: CacheOptions = {}): Promise<string> {
  const { baseDir = 'temp', subDir } = options
  const cacheDir = subDir ? path.join(process.cwd(), baseDir, subDir) : path.join(process.cwd(), baseDir)

  try {
    await fs.mkdir(cacheDir, { recursive: true })
    return cacheDir
  } catch (error) {
    console.warn('⚠️ Could not create cache directory:', error)
    throw error
  }
}

/**
 * Performs batch upsert operations with error handling and progress tracking
 */
export async function batchUpsert(items: any[], options: BatchUpsertOptions, stats: ProcessStats): Promise<void> {
  const { tableName, conflictColumn, batchSize = 100 } = options

  if (items.length === 0) return

  console.log(`🔄 Upserting ${items.length} items to ${tableName} in batches of ${batchSize}...`)

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    try {
      const { error } = await supabase.from(tableName).upsert(batch, {
        onConflict: conflictColumn,
      })

      if (error) {
        console.error(`❌ Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error.message)
        stats.errorCount += batch.length
        throw error
      }

      console.log(`✅ Upserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} items`)
      stats.insertedCount += batch.length

      // Progress reporting
      console.log(`📊 Progress: ${Math.min(i + batchSize, items.length)}/${items.length} items processed`)
    } catch (error) {
      console.error(`❌ Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error)
      stats.errorCount += batch.length
      throw error
    }
  }
}

/**
 * Calculates the center point of a geometry
 */
export function calculateGeometryCenter(geometry: any): { lat: number; lon: number } | null {
  if (!geometry) return null

  try {
    // Transform geometry to lat/lon if it's in a projected coordinate system
    const transformedGeometry = transformGeometry(geometry)

    if (transformedGeometry.type === 'Point') {
      return {
        lon: transformedGeometry.coordinates[0],
        lat: transformedGeometry.coordinates[1],
      }
    } else if (transformedGeometry.type === 'Polygon' && transformedGeometry.coordinates[0]) {
      // Calculate centroid of polygon
      const coords = transformedGeometry.coordinates[0]
      const lons = coords
        .map((coord: number[]) => coord[0])
        .filter((lon: number) => typeof lon === 'number' && !isNaN(lon))
      const lats = coords
        .map((coord: number[]) => coord[1])
        .filter((lat: number) => typeof lat === 'number' && !isNaN(lat))

      if (lons.length > 0 && lats.length > 0) {
        return {
          lon: (Math.min(...lons) + Math.max(...lons)) / 2,
          lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        }
      }
    } else if (transformedGeometry.type === 'MultiPolygon' && transformedGeometry.coordinates[0]) {
      // Use first polygon for center calculation
      const coords = transformedGeometry.coordinates[0][0]
      const lons = coords
        .map((coord: number[]) => coord[0])
        .filter((lon: number) => typeof lon === 'number' && !isNaN(lon))
      const lats = coords
        .map((coord: number[]) => coord[1])
        .filter((lat: number) => typeof lat === 'number' && !isNaN(lat))

      if (lons.length > 0 && lats.length > 0) {
        return {
          lon: (Math.min(...lons) + Math.max(...lons)) / 2,
          lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        }
      }
    } else if (transformedGeometry.type === 'LineString' && transformedGeometry.coordinates.length > 0) {
      // Calculate center of line string
      const coords = transformedGeometry.coordinates
      const lons = coords
        .map((coord: number[]) => coord[0])
        .filter((lon: number) => typeof lon === 'number' && !isNaN(lon))
      const lats = coords
        .map((coord: number[]) => coord[1])
        .filter((lat: number) => typeof lat === 'number' && !isNaN(lat))

      if (lons.length > 0 && lats.length > 0) {
        return {
          lon: (Math.min(...lons) + Math.max(...lons)) / 2,
          lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Failed to calculate geometry center:`, error)
  }

  return null
}

/**
 * Creates a standardized place object for database insertion
 */
export interface CreatePlaceOptions {
  source: string
  sourceId: string
  osm_id?: string | null
  name: string
  short_name?: string | null
  type: string
  location?: string | null
  geometry?: any
  region?: string | null
  country?: string
  description?: string | null
  source_score?: number
  score?: number
  metadata?: any
  website?: string | null
  wikipedia_query?: string | null
}

export function formatPlaceObject(options: CreatePlaceOptions): any {
  const {
    source,
    sourceId,
    osm_id,
    name,
    short_name,
    type,
    location,
    geometry,
    region,
    country = 'France',
    description,
    source_score,
    score,
    metadata,
    website,
    wikipedia_query,
  } = options

  // Default scores based on type (will be recalculated by calculateScore() if not provided)
  let defaultSourceScore = SCORE_CONFIG.base
  if (type === 'national_park') {
    defaultSourceScore = SCORE_CONFIG.nationalPark
  } else if (type === 'regional_park') {
    defaultSourceScore = SCORE_CONFIG.regionalPark
  }

  const finalSourceScore = source_score ?? defaultSourceScore

  // Calculate initial enhancement score based on available data at insert time
  // Note: This is a simplified calculation - full recalculation happens via calculateScore() after insert
  let initialEnhancementScore = 0
  if (website) {
    initialEnhancementScore += SCORE_CONFIG.hasWebsite
  }
  // Note: Wikipedia bonus is only added after analysis, not just for having wikipedia_query

  const finalEnhancementScore = initialEnhancementScore
  const finalScore = score ?? finalSourceScore + finalEnhancementScore

  return {
    source,
    source_id: sourceId,
    osm_id: osm_id ? String(osm_id).replace(/^-/, '') : null,
    name: name.trim(),
    short_name,
    type,
    location,
    geometry,
    region,
    country,
    description,
    source_score: finalSourceScore,
    enhancement_score: finalEnhancementScore,
    score: finalScore,
    metadata,
    website,
    wikipedia_query,
  }
}

/**
 * Validates that required fields are present
 */
export function validatePlace(place: any): boolean {
  if (!place.name || place.name.trim() === '') {
    return false
  }

  if (!place.location && !place.geometry) {
    return false
  }

  return true
}

/**
 * Delay utility for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Format runtime duration in human readable format
 */
export function formatDuration(startTime: Date): string {
  const runtime = Math.floor((Date.now() - startTime.getTime()) / 1000)
  const minutes = Math.floor(runtime / 60)
  const seconds = runtime % 60

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}
