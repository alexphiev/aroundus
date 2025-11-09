import { SearchPlaceInView } from '@/types/search.types'

export const PopupContent = ({ place }: { place: SearchPlaceInView }) => {
  const tagEntries = (place.metadata as { tags?: Record<string, string> })?.tags
    ? Object.entries(
        (place.metadata as { tags?: Record<string, string> })?.tags || {}
      ).slice(0, 2)
    : []

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
      {tagEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tagEntries.map(([key, value], index) => (
            <span
              key={index}
              className="bg-primary/10 text-primary truncate rounded-full px-2 py-0.5 text-xs select-none"
              title={`${key}: ${value}`}
            >
              {key}: {value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
