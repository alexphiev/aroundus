import {
  Mountain,
  Trees,
  Waves,
  TreePine,
  Droplets,
  Flower2,
  Sun,
  Backpack,
  Bike,
  TentTree,
  Camera,
  PawPrint,
  Footprints,
  Car,
  Train,
} from "lucide-react";

// Get landscape icon based on type
export const getLandscapeIcon = (landscape?: string) => {
  switch (landscape?.toLowerCase()) {
    case "mountain":
      return <Mountain className="h-5 w-5" />;
    case "forest":
      return <Trees className="h-5 w-5" />;
    case "lake":
      return <Waves className="h-5 w-5" />;
    case "beach":
      return <Sun className="h-5 w-5" />;
    case "river":
      return <Droplets className="h-5 w-5" />;
    case "park":
      return <Flower2 className="h-5 w-5" />;
    case "wetland":
      return <Droplets className="h-5 w-5" />;
    case "desert":
      return <Sun className="h-5 w-5" />;
    default:
      return <TreePine className="h-5 w-5" />;
  }
};

// Get activity icon based on type
export const getActivityIcon = (activity?: string) => {
  switch (activity?.toLowerCase()) {
    case "hiking":
      return <Backpack className="h-5 w-5" />;
    case "biking":
      return <Bike className="h-5 w-5" />;
    case "camping":
      return <TentTree className="h-5 w-5" />;
    case "photography":
      return <Camera className="h-5 w-5" />;
    case "wildlife":
      return <PawPrint className="h-5 w-5" />;
    case "walking":
      return <Footprints className="h-5 w-5" />;
    case "swimming":
      return <Waves className="h-5 w-5" />;
    default:
      return <Mountain className="h-5 w-5" />;
  }
};

// Get transport mode icon based on type
export const getTransportIcon = (transportMode?: string) => {
  switch (transportMode?.toLowerCase()) {
    case "foot":
      return <Footprints className="h-4 w-4" />;
    case "bike":
      return <Bike className="h-4 w-4" />;
    case "transit":
      return <Train className="h-4 w-4" />;
    case "car":
      return <Car className="h-4 w-4" />;
    default:
      return <Car className="h-4 w-4" />;
  }
};
