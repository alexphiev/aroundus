import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getIcon, IconType } from '@/utils/icon.utils'

interface PlaceIcon {
  icon: React.ReactNode
  label: string
}

interface PlaceIconsProps {
  landscape?: string
  activity?: string
}

const IconWithTooltip = ({ icon, label }: PlaceIcon) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="icon-container">{icon}</div>
    </TooltipTrigger>
    <TooltipContent>
      <p className="capitalize">{label}</p>
    </TooltipContent>
  </Tooltip>
)

const shouldShowDuplicateAs = (
  landscape?: string,
  activity?: string
): boolean => {
  if (!landscape || !activity) return false

  const duplicatePairs = [
    { landscape: 'lake', activity: 'swimming' },
    { landscape: 'mountain', activity: 'hiking' },
  ]

  return duplicatePairs.some(
    (pair) =>
      landscape.toLowerCase() === pair.landscape &&
      activity.toLowerCase() === pair.activity
  )
}

const getPlaceIcons = (landscape?: string, activity?: string): PlaceIcon[] => {
  const hasLandscape = Boolean(landscape)
  const hasActivity = Boolean(activity)
  const isDuplicate = shouldShowDuplicateAs(landscape, activity)

  // If only one type or would be duplicate, show primary + walking
  if (
    (!hasLandscape && hasActivity) ||
    (!hasActivity && hasLandscape) ||
    isDuplicate
  ) {
    const primaryType = hasActivity ? activity! : landscape!
    const primaryIcon = hasActivity
      ? getIcon(IconType.ACTIVITY, activity, 5)
      : getIcon(IconType.LANDSCAPE, landscape, 5)

    return [
      { icon: primaryIcon, label: primaryType },
      { icon: getIcon(IconType.ACTIVITY, 'walking', 5), label: 'walking' },
    ]
  }

  // Show both icons if they're different
  const icons: PlaceIcon[] = []
  if (hasLandscape) {
    icons.push({
      icon: getIcon(IconType.LANDSCAPE, landscape, 5),
      label: landscape!,
    })
  }
  if (hasActivity) {
    icons.push({
      icon: getIcon(IconType.ACTIVITY, activity, 5),
      label: activity!,
    })
  }

  return icons
}

export default function PlaceIcons({ landscape, activity }: PlaceIconsProps) {
  const icons = getPlaceIcons(landscape, activity)

  return (
    <>
      {icons.map((iconData, index) => (
        <IconWithTooltip
          key={`${iconData.label}-${index}`}
          icon={iconData.icon}
          label={iconData.label}
        />
      ))}
    </>
  )
}
