import { SearchPlaceInView } from '@/types/search.types'

export const PopupContent = ({ place }: { place: SearchPlaceInView }) => {
  return (
    <div className="flex max-w-xs flex-col gap-2">
      <div className="mr-4 flex items-start justify-between gap-2">
        <h6 className="text-sm font-semibold">
          {place.name || 'Unnamed Place'}
        </h6>
        {place.score !== undefined && (
          <span className="bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 text-xs font-medium">
            {place.score.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  )
}
