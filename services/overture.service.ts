import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { OVERTURE_CATEGORIES } from '@/data/overture.data'

interface BoundingBox {
  south: number
  west: number
  north: number
  east: number
}

interface OverturePlace {
  id: string
  geometry: {
    type: string
    coordinates: number[]
  }
  properties: {
    names?: {
      primary?: string
      common?: Record<string, string>
    }
    categories?: {
      primary?: string
      alternate?: string[]
    }
    addresses?: Array<{
      freeform?: string
      country?: string
      region?: string
    }>
    confidence?: number
    websites?: string[]
    socials?: string[]
    phones?: string[]
    brand?: {
      names: {
        primary: string
      }
    }
  }
}

export class OvertureService {
  private downloadCount = 0
  private readonly tempDir = path.join(process.cwd(), 'temp', 'overture')

  constructor() {
    // Ensure temp directory exists
    this.ensureTempDir()
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      console.warn('⚠️ Could not create temp directory:', error)
    }
  }

  private normalizeCategory(categories: any): string {
    const primary = categories?.primary || ''
    const alternates = categories?.alternate || []

    // Nature and outdoor recreation categories
    if (primary.includes('national_park')) return 'national_park'
    if (primary.includes('state_park')) return 'state_park'
    if (primary.includes('park')) return 'park'
    if (primary.includes('beach')) return 'beach'
    if (primary.includes('hiking_trail') || primary.includes('trail')) return 'trail'
    if (primary.includes('mountain_bike')) return 'mountain_bike_trail'
    if (primary.includes('waterfall')) return 'waterfall'
    if (primary.includes('climbing')) return 'climbing'
    if (primary.includes('ski')) return 'ski_area'
    if (primary.includes('boating')) return 'boating'
    if (primary.includes('rafting') || primary.includes('kayaking')) return 'water_sports'
    if (primary.includes('sailing')) return 'sailing'

    // Check alternates for additional context
    for (const alt of alternates) {
      if (alt.includes('nature') || alt.includes('outdoor')) return 'nature_area'
      if (alt.includes('recreation')) return 'recreation_area'
    }

    return primary.split('.').pop() || 'unknown'
  }

  private isNaturePlace(place: OverturePlace): boolean {
    const categories = place.properties.categories
    const primary = categories?.primary || ''
    const alternates = categories?.alternate || []

    // Check if primary category matches any of our selected nature categories
    if (OVERTURE_CATEGORIES.includes(primary)) {
      return true
    }

    // Check if any alternate category matches our selected nature categories
    return alternates.some((alt: string) => OVERTURE_CATEGORIES.includes(alt))
  }

  public async downloadPlaces(bbox: BoundingBox, departmentCode?: string): Promise<string> {
    const fileName = departmentCode
      ? `overture_places_dept_${departmentCode}.geojson`
      : `overture_places_${Date.now()}.geojson`
    const filePath = path.join(this.tempDir, fileName)

    // Check if file already exists
    try {
      await fs.access(filePath)
      console.log(`♻️  Found cached Overture data for department ${departmentCode}: ${filePath}`)
      console.log(`📁 Reusing existing download to save time and bandwidth`)
      return filePath
    } catch {
      // File doesn't exist, proceed with download
    }

    console.log(`🌍 Downloading Overture places for bbox: ${bbox.west},${bbox.south},${bbox.east},${bbox.north}`)
    if (departmentCode) {
      console.log(`📂 Will cache as: ${fileName}`)
    }

    return new Promise((resolve, reject) => {
      const args = [
        'download',
        `--bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
        '-f',
        'geojson',
        '--type=place',
        '-o',
        filePath,
      ]

      console.log(`🐍 Running: overturemaps ${args.join(' ')}`)

      // Use bash to activate virtual environment and run overturemaps
      const venvPath = path.join(process.cwd(), 'venv_overture', 'bin', 'activate')
      const command = `source ${venvPath} && overturemaps ${args.join(' ')}`

      const childProcess = spawn('bash', ['-c', command])

      let stdout = ''
      let stderr = ''

      childProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      childProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      childProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Downloaded to: ${filePath}`)
          this.downloadCount++
          resolve(filePath)
        } else {
          console.error(`❌ Download failed with code ${code}`)
          console.error(`stderr: ${stderr}`)
          reject(new Error(`Overture download failed: ${stderr}`))
        }
      })

      childProcess.on('error', (error) => {
        console.error(`❌ Failed to start overturemaps CLI:`, error)
        reject(error)
      })
    })
  }

  public async processGeoJSON(filePath: string): Promise<
    Array<{
      overture_id: string
      name: string
      type: string
      latitude: number
      longitude: number
      geometry: any
      confidence: number
      metadata: any
    }>
  > {
    try {
      console.log(`📋 Processing GeoJSON file: ${filePath}`)

      const data = await fs.readFile(filePath, 'utf-8')
      const geoJson = JSON.parse(data)

      if (!geoJson.features || !Array.isArray(geoJson.features)) {
        throw new Error('Invalid GeoJSON format')
      }

      console.log(`🔍 Found ${geoJson.features.length} total places`)

      const naturePlaces = geoJson.features
        .filter((feature: any) => this.isNaturePlace(feature))
        .map((feature: any) => {
          const props = feature.properties
          const coords = feature.geometry.coordinates

          // Get center point based on geometry type
          let lat: number, lon: number
          if (feature.geometry.type === 'Point') {
            ;[lon, lat] = coords
          } else if (feature.geometry.type === 'Polygon') {
            // Calculate centroid of polygon
            const flatCoords = coords[0]
            const lats = flatCoords.map((c: number[]) => c[1])
            const lons = flatCoords.map((c: number[]) => c[0])
            lat = (Math.min(...lats) + Math.max(...lats)) / 2
            lon = (Math.min(...lons) + Math.max(...lons)) / 2
          } else {
            // For other geometry types, try to calculate center
            const flatCoords = coords.flat(2)
            const lats = flatCoords.filter((_: any, i: number) => i % 2 === 1)
            const lons = flatCoords.filter((_: any, i: number) => i % 2 === 0)
            lat = lats.reduce((a: number, b: number) => a + b, 0) / lats.length
            lon = lons.reduce((a: number, b: number) => a + b, 0) / lons.length
          }

          const primaryName =
            props.names?.primary ||
            props.names?.common?.en ||
            props.names?.common?.fr ||
            (Object.values(props.names?.common || {})[0] as string)

          return {
            overture_id: props.id,
            name: primaryName || 'Unnamed',
            type: this.normalizeCategory(props.categories),
            latitude: lat,
            longitude: lon,
            geometry: feature.geometry,
            confidence: props.confidence || 0,
            metadata: {
              categories: props.categories,
              addresses: props.addresses,
              websites: props.websites,
              phones: props.phones,
              brand: props.brand,
            },
          }
        })
        .filter((place: { name: string }) => place.name !== 'Unnamed') // Only include named places

      console.log(`🌿 Filtered to ${naturePlaces.length} nature places`)

      // Don't delete the temp file - keep it for caching
      // Only delete files that are timestamp-based (not department-specific)
      if (path.basename(filePath).includes('_dept_')) {
        console.log(`💾 Keeping cached file: ${filePath}`)
      } else {
        await fs.unlink(filePath).catch(() => {
          console.warn(`⚠️ Could not delete temp file: ${filePath}`)
        })
      }

      return naturePlaces
    } catch (error) {
      console.error(`❌ Error processing GeoJSON:`, error)
      throw error
    }
  }

  public getDownloadCount(): number {
    return this.downloadCount
  }
}

export const overtureService = new OvertureService()
