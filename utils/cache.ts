import fs from 'fs/promises'
import path from 'path'

export interface CacheConfig {
  baseDir: string
  subDir?: string
}

export class CacheManager {
  private cacheDir: string

  constructor(config: CacheConfig) {
    this.cacheDir = config.subDir
      ? path.join(process.cwd(), config.baseDir, config.subDir)
      : path.join(process.cwd(), config.baseDir)
  }

  async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true })
    } catch (error) {
      console.warn('⚠️ Could not create cache directory:', error)
      throw error
    }
  }

  async load<T>(key: string): Promise<T | null> {
    const fileName = `${key}.json`
    const filePath = path.join(this.cacheDir, fileName)

    try {
      await fs.access(filePath)
      console.log(`♻️  Found cached data: ${fileName}`)
      console.log(`📁 Reusing existing data to save processing time`)

      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  async save<T>(key: string, data: T): Promise<void> {
    const fileName = `${key}.json`
    const filePath = path.join(this.cacheDir, fileName)

    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2))
      console.log(`💾 Cached data: ${fileName}`)
    } catch (error) {
      console.warn(`⚠️ Could not save cache file: ${error}`)
    }
  }

  async loadOrFetch<T>(key: string, fetchFn: () => Promise<T>, options?: { forceRefresh?: boolean }): Promise<T> {
    const { forceRefresh = false } = options || {}

    if (!forceRefresh) {
      const cached = await this.load<T>(key)
      if (cached) {
        return cached
      }
    }

    console.log(`🔄 Cache miss for ${key}, fetching fresh data...`)
    const data = await fetchFn()
    await this.save(key, data)
    return data
  }

  getCacheFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`)
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getCacheFilePath(key))
      return true
    } catch {
      return false
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.getCacheFilePath(key))
      console.log(`🗑️  Deleted cache file: ${key}.json`)
    } catch (error) {
      console.warn(`⚠️ Could not delete cache file ${key}.json:`, error)
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir)
      const jsonFiles = files.filter((file) => file.endsWith('.json'))

      await Promise.all(jsonFiles.map((file) => fs.unlink(path.join(this.cacheDir, file))))

      console.log(`🗑️  Cleared ${jsonFiles.length} cache files`)
    } catch (error) {
      console.warn(`⚠️ Could not clear cache directory:`, error)
    }
  }
}

/**
 * Creates a cache manager instance for a specific use case
 */
export function createCacheManager(config: CacheConfig): CacheManager {
  return new CacheManager(config)
}
