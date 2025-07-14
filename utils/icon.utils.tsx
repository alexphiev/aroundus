import {
  Accessibility,
  Baby,
  Backpack,
  Bike,
  Camera,
  Car,
  Dog,
  Droplets,
  Flower2,
  Footprints,
  Mountain,
  PawPrint,
  Sun,
  TentTree,
  Train,
  Trees,
  Waves,
  type LucideIcon,
} from 'lucide-react'

export enum IconType {
  LANDSCAPE = 'landscape',
  ACTIVITY = 'activity',
  TRANSPORT = 'transport',
  SPECIAL_CARE = 'specialCare',
}

const LANDSCAPE_ICONS: Record<string, LucideIcon> = {
  mountain: Mountain,
  forest: Trees,
  lake: Waves,
  beach: Sun,
  river: Droplets,
  park: Flower2,
  wetland: Droplets,
  desert: Sun,
} as const

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  hiking: Backpack,
  biking: Bike,
  camping: TentTree,
  photography: Camera,
  wildlife: PawPrint,
  walking: Footprints,
  swimming: Waves,
} as const

const TRANSPORT_ICONS: Record<string, LucideIcon> = {
  foot: Footprints,
  bike: Bike,
  public_transport: Train,
  transit: Train,
  car: Car,
} as const

const SPECIAL_CARE_ICONS: Record<string, LucideIcon> = {
  children: Baby,
  lowMobility: Accessibility,
  dogs: Dog,
} as const

const ICON_MAPPINGS = {
  [IconType.LANDSCAPE]: LANDSCAPE_ICONS,
  [IconType.ACTIVITY]: ACTIVITY_ICONS,
  [IconType.TRANSPORT]: TRANSPORT_ICONS,
  [IconType.SPECIAL_CARE]: SPECIAL_CARE_ICONS,
} as const

const renderIcon = (
  IconComponent: LucideIcon,
  size: number = 5,
  color?: string
) => {
  return (
    <IconComponent className={`size-${size} ${color ? `text-${color}` : ''}`} />
  )
}

export const getIcon = (
  iconType: IconType,
  key?: string,
  size: number = 5,
  color?: string,
  fallbackIcon?: LucideIcon
) => {
  if (!key) {
    return fallbackIcon ? renderIcon(fallbackIcon, size, color) : null
  }

  const icon = ICON_MAPPINGS[iconType][key.toLowerCase()]
  if (!icon) return null

  return renderIcon(icon, size, color)
}
