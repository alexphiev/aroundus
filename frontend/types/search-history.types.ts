// Search query types for search history (simplified)
export interface SearchQuery {
  activity: string;
  specialCare?: "children" | "lowMobility" | "dogs";
  distance: string; // Now uses readable text like "1 hour", "30 minutes"
  activityLevel: number;
  activityDurationValue: number;
  activityDurationUnit: "hours" | "days";
  location: {
    latitude: number;
    longitude: number;
  };
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
  specialCare?: "children" | "lowMobility" | "dogs";
  distance: string; // Now uses readable text like "1 hour", "30 minutes"
  transportType: "foot" | "bike" | "transit" | "car";
  activityLevel: number;
  activityDurationValue: number;
  activityDurationUnit: "hours" | "days";
}

