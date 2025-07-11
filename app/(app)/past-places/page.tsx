import { getSavedPlacesAction } from '@/actions/place.actions'
import DiscoveryResult from '@/components/discovery/result/DiscoveryResult'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function PastPlacesPage() {
  const supabase = await createClient() // Await due to server.ts's potential async nature

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    // This should ideally be handled by middleware, but as a safeguard:
    redirect('/sign-in')
  }

  const savedPlacesResult = await getSavedPlacesAction()
  const placeResults =
    savedPlacesResult.success && savedPlacesResult.data
      ? savedPlacesResult.data.map((place) => ({
          id: place.id,
          name: place.name || 'Unnamed Place',
          description: place.description || '',
          lat: place.lat || 0,
          long: place.long || 0,
          created_at: place.created_at,
        }))
      : null

  return (
    <DiscoveryResult
      placeResults={placeResults}
      title="Your Saved Places"
      subtitle="View and explore places you've saved"
      showSaveButton={false}
      emptyStateMessage="You haven't saved any places yet"
    />
  )
}
