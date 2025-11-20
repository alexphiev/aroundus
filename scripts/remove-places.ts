import 'dotenv/config'
import { supabase } from '@/db/supabase'

interface RemovalStats {
  removedCount: number
  errorCount: number
  startTime: Date
}

class PlacesRemover {
  private stats: RemovalStats

  constructor() {
    this.stats = {
      removedCount: 0,
      errorCount: 0,
      startTime: new Date(),
    }
  }

  private printStats(source: string, type?: string): void {
    const runtime = Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000)
    console.log('\n📊 --- Removal Report ---')
    console.log(`🎯 Source: ${source}`)
    if (type) {
      console.log(`🏷️ Type: ${type}`)
    }
    console.log(`⏱️ Runtime: ${runtime}s`)
    console.log(`🗑️ Removed: ${this.stats.removedCount}`)
    console.log(`❌ Errors: ${this.stats.errorCount}`)
    console.log('------------------------\n')
  }

  public async removeBySource(source: string, type?: string): Promise<void> {
    const filterDesc = type ? `${source} places with type "${type}"` : `ALL ${source} places`
    console.log(`\n🗑️ Removing ${filterDesc} from database`)
    console.log(`⚠️ WARNING: This will remove ${filterDesc} from the database!`)

    try {
      let countQuery = supabase.from('places').select('*', { count: 'exact', head: true }).eq('source', source)

      if (type) {
        countQuery = countQuery.eq('type', type)
      }

      const { count } = await countQuery

      if (!count || count === 0) {
        console.log(`❓ No ${filterDesc} found in database`)
        return
      }

      console.log(`🔍 Found ${count} places to remove`)

      let deleteQuery = supabase.from('places').delete().eq('source', source)

      if (type) {
        deleteQuery = deleteQuery.eq('type', type)
      }

      const { error } = await deleteQuery

      if (error) {
        console.error('❌ Error removing places:', error.message)
        this.stats.errorCount++
        throw error
      }

      this.stats.removedCount = count
      this.printStats(source, type)
      console.log(`✅ Successfully removed ${count} places from database`)
    } catch (error) {
      console.error(`💥 Error removing places:`, error)
      throw error
    }
  }
}

async function main() {
  const args = process.argv.slice(2)

  const sourceArg = args.find((arg) => arg.startsWith('--source='))
  const typeArg = args.find((arg) => arg.startsWith('--type='))

  const source = sourceArg ? sourceArg.split('=')[1] : undefined
  const type = typeArg ? typeArg.split('=')[1] : undefined

  if (!source) {
    console.log('❓ Usage: pnpm remove-places --source=<source> [--type=<type>]')
    console.log('')
    console.log('Examples:')
    console.log('  pnpm remove-places --source=OSM')
    console.log('  pnpm remove-places --source=OSM --type=peak')
    console.log('  pnpm remove-places --source=OVERTURE')
    console.log('  pnpm remove-places --source=DATA.GOUV --type=regional_natural_park')
    process.exit(1)
  }

  const filterDesc = type ? `${source} places with type "${type}"` : `${source} places`
  console.log(`🚀 Starting ${filterDesc} Remover`)
  console.log(`📅 Started at: ${new Date().toISOString()}`)

  const remover = new PlacesRemover()

  try {
    await remover.removeBySource(source, type)

    console.log(`\n🎉 Removal completed successfully!`)
    console.log(`📅 Finished at: ${new Date().toISOString()}`)
  } catch (error) {
    console.error(`\n💥 Removal failed:`, error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { PlacesRemover }