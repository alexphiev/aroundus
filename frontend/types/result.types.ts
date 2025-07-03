// TripResultItem that matches what's coming from the database and AI responses
export interface TripResultItem {
  id?: string;
  name: string;
  description: string;
  lat: number;
  long: number;
  landscape?:
    | "mountain"
    | "forest"
    | "lake"
    | "beach"
    | "river"
    | "park"
    | "wetland"
    | "desert"
    | string;
  activity?:
    | "hiking"
    | "biking"
    | "camping"
    | "photography"
    | "wildlife"
    | "walking"
    | "swimming"
    | string;
  estimatedActivityDuration?: string;
  estimatedTransportTime?: string;
  whyRecommended?: string;
  isOtherCategory?: boolean;
  starRating?: number;
  bestTimeToVisit?: string;
  timeToAvoid?: string;
  created_at?: string;
}