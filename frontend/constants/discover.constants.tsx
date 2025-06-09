import { ReactNode } from "react";
import {
  Mountain,
  Bike,
  Waves,
  Heart,
  Camera,
  Plus,
  Baby,
  Accessibility,
  Dog,
  Footprints,
  Train,
  Car,
} from "lucide-react";

// Form option types
export interface FormOption {
  value: string;
  label: string;
}

export interface FormOptionWithIcon extends FormOption {
  icon: ReactNode;
}

// Activity options with icons
export const ACTIVITY_OPTIONS: FormOptionWithIcon[] = [
  {
    value: "hiking",
    label: "Hiking",
    icon: <Mountain className="h-5 w-5" />,
  },
  {
    value: "biking",
    label: "Biking",
    icon: <Bike className="h-5 w-5" />,
  },
  {
    value: "swimming",
    label: "Swimming",
    icon: <Waves className="h-5 w-5" />,
  },
  {
    value: "relaxing",
    label: "Relaxing",
    icon: <Heart className="h-5 w-5" />,
  },
  {
    value: "photography",
    label: "Photography",
    icon: <Camera className="h-5 w-5" />,
  },
  {
    value: "other",
    label: "Other",
    icon: <Plus className="h-5 w-5" />,
  },
];

// Distance options (simplified - no encoding needed)
export const DISTANCE_OPTIONS: FormOption[] = [
  { value: "10 minutes", label: "10 minutes" },
  { value: "30 minutes", label: "30 minutes" },
  { value: "45 minutes", label: "45 minutes" },
  { value: "1 hour", label: "1 hour" },
  { value: "2 hours", label: "2 hours" },
  { value: "3 hours", label: "3 hours" },
  { value: "5 hours", label: "5 hours" },
];

// Transport type options
export const TRANSPORT_OPTIONS: FormOptionWithIcon[] = [
  {
    value: "foot",
    label: "On foot",
    icon: <Footprints className="h-5 w-5" />,
  },
  {
    value: "bike",
    label: "By bike",
    icon: <Bike className="h-5 w-5" />,
  },
  {
    value: "transit",
    label: "By transit",
    icon: <Train className="h-5 w-5" />,
  },
  {
    value: "car",
    label: "By car",
    icon: <Car className="h-5 w-5" />,
  },
];

// Activity duration value options
export const ACTIVITY_DURATION_VALUES: FormOption[] = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "8", label: "8" },
  { value: "12", label: "12" },
];

// Activity duration unit options
export const ACTIVITY_DURATION_UNITS: FormOption[] = [
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
];

// Special care options
export const SPECIAL_CARE_OPTIONS: FormOptionWithIcon[] = [
  {
    value: "children",
    label: "Children friendly",
    icon: <Baby className="h-5 w-5" />,
  },
  {
    value: "lowMobility",
    label: "Low mobility accessible",
    icon: <Accessibility className="h-5 w-5" />,
  },
  {
    value: "dogs",
    label: "Dog friendly",
    icon: <Dog className="h-5 w-5" />,
  },
];

