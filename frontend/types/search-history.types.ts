// Search query types for search history (simplified)
export interface SearchQuery {
  activity: string;
  when: string; // "today", "tomorrow", "this_weekend", or ISO date string for custom
  specialCare?: "children" | "lowMobility" | "dogs";
  distance: string; // Now uses readable text like "1 hour", "30 minutes"
  activityLevel: number;
  activityDurationValue: number;
  activityDurationUnit: "hours" | "days";
  location: {
    latitude: number;
    longitude: number;
  };
  additionalInfo?: string; // User's direct input from homepage search
}

// Search result item type
export interface SearchResult {
  name: string;
  description: string;
  lat: number;
  long: number;
  landscape?: string;
  activity?: string;
  estimatedActivityDuration?: string;
  estimatedTransportTime?: string;
  whyRecommended?: string;
  starRating?: number;
  bestTimeToVisit?: string;
  timeToAvoid?: string;
}

// Database search history record
export interface SearchHistoryRecord {
  id: string;
  user_id: string | null;
  query: SearchQuery;
  results: SearchResult[];
  created_at: string;
  updated_at: string | null;
}

// API response types
export interface SearchHistoryResponse {
  success?: boolean;
  data?: SearchHistoryRecord | SearchHistoryRecord[] | null;
  error?: string;
}

export interface SaveSearchResponse {
  success?: boolean;
  data?: SearchHistoryRecord;
  error?: string;
}

// Form values for simplified approach
export interface FormValues {
  activity: string;
  otherActivity?: string;
  when: string; // "today", "tomorrow", "this_weekend", or ISO date string for custom
  customDate?: Date;
  specialCare?: "children" | "lowMobility" | "dogs";
  distance: string; // Now uses readable text like "1 hour", "30 minutes"
  transportType: "foot" | "bike" | "transit" | "car";
  activityLevel: number;
  activityDurationValue: number;
  activityDurationUnit: "hours" | "days";
  additionalInfo?: string; // User's direct input from homepage search
}

