export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      places: {
        Row: {
          country: string | null
          created_at: string
          description: string | null
          geometry: unknown | null
          id: string
          location: unknown | null
          metadata: Json | null
          name: string | null
          quality: number
          region: string | null
          source: string | null
          source_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          description?: string | null
          geometry?: unknown | null
          id?: string
          location?: unknown | null
          metadata?: Json | null
          name?: string | null
          quality?: number
          region?: string | null
          source?: string | null
          source_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          description?: string | null
          geometry?: unknown | null
          id?: string
          location?: unknown | null
          metadata?: Json | null
          name?: string | null
          quality?: number
          region?: string | null
          source?: string | null
          source_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_places: {
        Row: {
          activity: string | null
          best_time_to_visit: string | null
          created_at: string
          current_conditions: string | null
          description: string | null
          entrance_fee: string | null
          estimated_activity_duration: string | null
          estimated_transport_time: string | null
          google_maps_link: string | null
          id: string
          landscape: string | null
          lat: number | null
          long: number | null
          name: string
          operating_hours: string | null
          parking_info: string | null
          star_rating: number | null
          time_to_avoid: string | null
          user_id: string | null
          why_recommended: string | null
        }
        Insert: {
          activity?: string | null
          best_time_to_visit?: string | null
          created_at?: string
          current_conditions?: string | null
          description?: string | null
          entrance_fee?: string | null
          estimated_activity_duration?: string | null
          estimated_transport_time?: string | null
          google_maps_link?: string | null
          id?: string
          landscape?: string | null
          lat?: number | null
          long?: number | null
          name: string
          operating_hours?: string | null
          parking_info?: string | null
          star_rating?: number | null
          time_to_avoid?: string | null
          user_id?: string | null
          why_recommended?: string | null
        }
        Update: {
          activity?: string | null
          best_time_to_visit?: string | null
          created_at?: string
          current_conditions?: string | null
          description?: string | null
          entrance_fee?: string | null
          estimated_activity_duration?: string | null
          estimated_transport_time?: string | null
          google_maps_link?: string | null
          id?: string
          landscape?: string | null
          lat?: number | null
          long?: number | null
          name?: string
          operating_hours?: string | null
          parking_info?: string | null
          star_rating?: number | null
          time_to_avoid?: string | null
          user_id?: string | null
          why_recommended?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          current_batch: number | null
          has_more_results: boolean | null
          id: string
          location: Json | null
          query: Json | null
          results: Json | null
          title: string | null
          total_results_loaded: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_batch?: number | null
          has_more_results?: boolean | null
          id?: string
          location?: Json | null
          query?: Json | null
          results?: Json | null
          title?: string | null
          total_results_loaded?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_batch?: number | null
          has_more_results?: boolean | null
          id?: string
          location?: Json | null
          query?: Json | null
          results?: Json | null
          title?: string | null
          total_results_loaded?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      places_in_view: {
        Args: {
          max_lat: number
          max_long: number
          min_lat: number
          min_long: number
        }
        Returns: {
          description: string
          id: string
          lat: number
          long: number
          name: string
          source: string
          type: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
