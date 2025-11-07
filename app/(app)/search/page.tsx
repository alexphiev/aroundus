import { getAllParkGeometries } from '@/actions/explore.actions'
import SearchPageComponent from '@/components/search/SearchPageComponent'

export default async function SearchPage() {
  const parkGeometries = await getAllParkGeometries()

  return <SearchPageComponent parkGeometries={parkGeometries} />
}
