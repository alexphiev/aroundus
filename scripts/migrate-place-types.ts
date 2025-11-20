import { OSM_SUPPORTED_TAGS } from @/data/osm.data'
import 'dotenv/config'
import { supabase } from '@/db/supabase'

interface MigrationStats {
  total: number
  updated: number
  unchanged: number
  stillInvalid: number
  invalidToUnknown: number
}

const VALID_TYPES = new Set([
  'mountain',
  'waterfall',
  'cave',
  'glacier',
  'bay',
  'cape',
  'strait',
  'wood',
  'forest',
  'beach',
  'dune',
  'cliff',
  'rock',
  'spring',
  'wetland',
  'reef',
  'grassland',
  'heath',
  'scrub',
  'tree',
  'valley',
  'gorge',
  'plateau',
  'peninsula',
  'isthmus',
  'lake',
  'pond',
  'reservoir',
  'lagoon',
  'oxbow',
  'basin',
  'canal',
  'river',
  'stream',
  'drain',
  'ditch',
  'rapids',
  'weir',
  'dam',
  'nature_reserve',
  'park',
  'garden',
  'common',
  'picnic_site',
  'viewpoint',
  'camp_site',
  'wilderness_hut',
  'alpine_hut',
  'national_park',
  'protected_area',
  'hiking_route',
  'bicycle_route',
  'mtb_route',
  'island',
  'archipelago',
  'meadow',
  'orchard',
  'vineyard',
  'fountain',
  'drinking_water',
  'lighthouse',
  'tower',
  'bridge',
  'aqueduct',
  'regional_park',
  'unknown',
])

function formatType(tags: Record<string, string>): string {
  for (const [tagKey, tagValue] of Object.entries(tags)) {
    if (OSM_SUPPORTED_TAGS[tagKey] && OSM_SUPPORTED_TAGS[tagKey].includes(tagValue)) {
      return tagValue
    }
  }
  return 'unknown'
}

function isValidType(type: string): boolean {
  return VALID_TYPES.has(type)
}

async function migratePlaceTypes() {
  console.log('🔄 Place Type Migration Script')
  console.log('==============================\n')

  const stats: MigrationStats = {
    total: 0,
    updated: 0,
    unchanged: 0,
    stillInvalid: 0,
    invalidToUnknown: 0,
  }

  try {
    console.log('📋 Fetching all places...')
    const { data: places, error } = await supabase.from('places').select('*')

    if (error) {
      console.error('❌ Error fetching places:', error)
      process.exit(1)
    }

    if (!places || places.length === 0) {
      console.log('✅ No places found!')
      return
    }

    stats.total = places.length
    console.log(`📊 Found ${places.length} places to process\n`)

    const invalidPlaces = places.filter((place) => !isValidType(place.type || ''))
    console.log(`🔍 Found ${invalidPlaces.length} places with invalid types\n`)

    if (invalidPlaces.length === 0) {
      console.log('✅ All places have valid types!')
      return
    }

    console.log('Examples of invalid types:')
    const typeCounts = invalidPlaces.reduce(
      (acc, place) => {
        acc[place.type || ''] = (acc[place.type || ''] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([type, count]) => {
        console.log(`  - "${type}": ${count} places`)
      })
    console.log()

    for (let i = 0; i < invalidPlaces.length; i++) {
      const place = invalidPlaces[i]

      if (i % 50 === 0) {
        console.log(`📍 Processing ${i + 1}/${invalidPlaces.length}...`)
      }

      const tags = (place.metadata as Record<string, string>) || {}
      const newType = formatType(tags)

      if (newType === 'unknown') {
        stats.invalidToUnknown++
      }

      if (newType !== place.type) {
        const { error: updateError } = await supabase.from('places').update({ type: newType }).eq('id', place.id)

        if (updateError) {
          console.error(`  ❌ Failed to update ${place.name}: ${updateError.message}`)
          stats.stillInvalid++
        } else {
          stats.updated++
        }
      } else {
        stats.unchanged++
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log('====================')
    console.log(`Total places: ${stats.total}`)
    console.log(`Places with invalid types: ${invalidPlaces.length}`)
    console.log(`Successfully updated: ${stats.updated}`)
    console.log(`Unchanged: ${stats.unchanged}`)
    console.log(`Mapped to "unknown": ${stats.invalidToUnknown}`)
    console.log(`Failed to update: ${stats.stillInvalid}`)

    console.log('\n🎉 Migration completed!')
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

migratePlaceTypes().catch(console.error)
