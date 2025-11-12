import { getParksWithGeometry } from '@/actions/search.actions'
import SearchPageComponent from '@/components/search/SearchPageComponent'

export default async function SearchPage() {
  const parkGeometries = await getParksWithGeometry()

  return <SearchPageComponent parksWithGeometry={parkGeometries} />
}
