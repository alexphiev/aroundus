import { getAllParkGeometries } from '@/actions/explore.actions'
import ExplorePageComponent from '@/components/explore/ExplorePageComponent'

export default async function ExplorePage() {
  const parkGeometries = await getAllParkGeometries()

  return <ExplorePageComponent parkGeometries={parkGeometries} />
}
