import {
  Accessibility,
  Baby,
  Bike,
  Calendar,
  CalendarDays,
  Camera,
  Car,
  Clock,
  Dog,
  Footprints,
  Heart,
  Mountain,
  Plus,
  Train,
  Waves,
} from 'lucide-react'
import { ReactNode } from 'react'

// Form option types
export interface FormOption {
  value: string
  label: string
}

export interface FormOptionWithIcon extends FormOption {
  icon: ReactNode
}

// Activity options with icons
export const ACTIVITY_OPTIONS: FormOptionWithIcon[] = [
  {
    value: 'hiking',
    label: 'Hiking',
    icon: <Mountain className="h-5 w-5" />,
  },
  {
    value: 'biking',
    label: 'Biking',
    icon: <Bike className="h-5 w-5" />,
  },
  {
    value: 'swimming',
    label: 'Swimming',
    icon: <Waves className="h-5 w-5" />,
  },
  {
    value: 'relaxing',
    label: 'Relaxing',
    icon: <Heart className="h-5 w-5" />,
  },
  {
    value: 'photography',
    label: 'Photography',
    icon: <Camera className="h-5 w-5" />,
  },
  {
    value: 'other',
    label: 'Other',
    icon: <Plus className="h-5 w-5" />,
  },
]

// When options with icons
export const WHEN_OPTIONS: FormOptionWithIcon[] = [
  {
    value: 'today',
    label: 'Today',
    icon: <Clock className="h-5 w-5" />,
  },
  {
    value: 'tomorrow',
    label: 'Tomorrow',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    value: 'this_weekend',
    label: 'This Weekend',
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    value: 'custom',
    label: 'Custom Date',
    icon: <Calendar className="h-5 w-5" />,
  },
]

// Distance options as ranges
export const DISTANCE_OPTIONS: FormOption[] = [
  { value: 'less than 30 min', label: 'Less than 30 minutes' },
  { value: 'less than 1 hour', label: 'Less than 1 hour' },
  { value: 'less than 2 hours', label: 'Less than 2 hours' },
  { value: 'between 1 and 2 hours', label: 'Between 1 and 2 hours' },
  { value: 'between 2 and 3 hours', label: 'Between 2 and 3 hours' },
  { value: 'between 4 and 5 hours', label: 'Between 4 and 5 hours' },
]

// Transport type options
export const TRANSPORT_OPTIONS: FormOptionWithIcon[] = [
  {
    value: 'foot',
    label: 'On foot',
    icon: <Footprints className="h-5 w-5" />,
  },
  {
    value: 'bike',
    label: 'By bike',
    icon: <Bike className="h-5 w-5" />,
  },
  {
    value: 'public_transport',
    label: 'By public transport',
    icon: <Train className="h-5 w-5" />,
  },
  {
    value: 'car',
    label: 'By car',
    icon: <Car className="h-5 w-5" />,
  },
]

// Activity duration value options
export const ACTIVITY_DURATION_VALUES: FormOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '8', label: '8' },
  { value: '12', label: '12' },
]

// Activity duration unit options
export const ACTIVITY_DURATION_UNITS: FormOption[] = [
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
]

// Special care options
export const SPECIAL_CARE_OPTIONS: FormOptionWithIcon[] = [
  {
    value: 'children',
    label: 'Children friendly',
    icon: <Baby className="h-5 w-5" />,
  },
  {
    value: 'lowMobility',
    label: 'Low mobility',
    icon: <Accessibility className="h-5 w-5" />,
  },
  {
    value: 'dogs',
    label: 'Dog friendly',
    icon: <Dog className="h-5 w-5" />,
  },
  {
    value: 'other',
    label: 'Other',
    icon: <Plus className="h-5 w-5" />,
  },
]
