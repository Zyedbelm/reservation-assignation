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
      activities: {
        Row: {
          activity_type: string
          admin_notes: string | null
          assigned_gm_id: string | null
          assignment_date: string | null
          assignment_score: number | null
          bookeo_id: string | null
          calendar_source: string | null
          created_at: string
          date: string
          description: string | null
          duration: number
          duration_source: string | null
          end_time: string
          event_source: string | null
          game_id: string | null
          id: string
          is_assigned: boolean | null
          make_event_id: string | null
          required_skills: string[] | null
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_type?: string
          admin_notes?: string | null
          assigned_gm_id?: string | null
          assignment_date?: string | null
          assignment_score?: number | null
          bookeo_id?: string | null
          calendar_source?: string | null
          created_at?: string
          date: string
          description?: string | null
          duration: number
          duration_source?: string | null
          end_time: string
          event_source?: string | null
          game_id?: string | null
          id?: string
          is_assigned?: boolean | null
          make_event_id?: string | null
          required_skills?: string[] | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          admin_notes?: string | null
          assigned_gm_id?: string | null
          assignment_date?: string | null
          assignment_score?: number | null
          bookeo_id?: string | null
          calendar_source?: string | null
          created_at?: string
          date?: string
          description?: string | null
          duration?: number
          duration_source?: string | null
          end_time?: string
          event_source?: string | null
          game_id?: string | null
          id?: string
          is_assigned?: boolean | null
          make_event_id?: string | null
          required_skills?: string[] | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_assigned_gm_id_fkey"
            columns: ["assigned_gm_id"]
            isOneToOne: false
            referencedRelation: "game_masters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      api_configurations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      auto_assignment_logs: {
        Row: {
          assignments_made: number | null
          created_at: string
          details: Json | null
          error_message: string | null
          events_processed: number | null
          execution_duration: number | null
          id: string
          success: boolean | null
          trigger_type: string
          triggered_at: string
        }
        Insert: {
          assignments_made?: number | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          events_processed?: number | null
          execution_duration?: number | null
          id?: string
          success?: boolean | null
          trigger_type?: string
          triggered_at?: string
        }
        Update: {
          assignments_made?: number | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          events_processed?: number | null
          execution_duration?: number | null
          id?: string
          success?: boolean | null
          trigger_type?: string
          triggered_at?: string
        }
        Relationships: []
      }
      event_assignments: {
        Row: {
          activity_id: string | null
          assigned_at: string
          assignment_order: number | null
          assignment_score: number | null
          created_at: string
          email_sent: boolean | null
          email_sent_at: string | null
          gm_id: string | null
          id: string
          status: string | null
        }
        Insert: {
          activity_id?: string | null
          assigned_at?: string
          assignment_order?: number | null
          assignment_score?: number | null
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          gm_id?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          activity_id?: string | null
          assigned_at?: string
          assignment_order?: number | null
          assignment_score?: number | null
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          gm_id?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_assignments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignments_gm_id_fkey"
            columns: ["gm_id"]
            isOneToOne: false
            referencedRelation: "game_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      event_game_mappings: {
        Row: {
          created_at: string
          event_name_pattern: string
          game_id: string | null
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name_pattern: string
          game_id?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name_pattern?: string
          game_id?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_game_mappings_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_masters: {
        Row: {
          address: string | null
          avs_number: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          first_name: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          last_name: string | null
          name: string
          phone: string | null
          skills: Json | null
          specialties: string[] | null
          termination_date: string | null
          termination_reason: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avs_number?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          last_name?: string | null
          name: string
          phone?: string | null
          skills?: Json | null
          specialties?: string[] | null
          termination_date?: string | null
          termination_reason?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avs_number?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          last_name?: string | null
          name?: string
          phone?: string | null
          skills?: Json | null
          specialties?: string[] | null
          termination_date?: string | null
          termination_reason?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          average_duration: number | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          minimum_break_minutes: number | null
          name: string
          required_gms: number
          updated_at: string
        }
        Insert: {
          average_duration?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          minimum_break_minutes?: number | null
          name: string
          required_gms?: number
          updated_at?: string
        }
        Update: {
          average_duration?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          minimum_break_minutes?: number | null
          name?: string
          required_gms?: number
          updated_at?: string
        }
        Relationships: []
      }
      gm_availabilities: {
        Row: {
          created_at: string
          date: string
          gm_id: string | null
          id: string
          time_slots: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          gm_id?: string | null
          id?: string
          time_slots: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          gm_id?: string | null
          id?: string
          time_slots?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gm_availabilities_gm_id_fkey"
            columns: ["gm_id"]
            isOneToOne: false
            referencedRelation: "game_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          file_path: string | null
          gm_id: string | null
          id: string
          notes: string | null
          updated_at: string
          upload_date: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          file_path?: string | null
          gm_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          upload_date?: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          file_path?: string | null
          gm_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          upload_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "gm_documents_gm_id_fkey"
            columns: ["gm_id"]
            isOneToOne: false
            referencedRelation: "game_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_game_competencies: {
        Row: {
          competency_level: number | null
          created_at: string
          game_id: string | null
          gm_id: string | null
          id: string
          last_assessment_date: string | null
          notes: string | null
          training_date: string | null
          updated_at: string
        }
        Insert: {
          competency_level?: number | null
          created_at?: string
          game_id?: string | null
          gm_id?: string | null
          id?: string
          last_assessment_date?: string | null
          notes?: string | null
          training_date?: string | null
          updated_at?: string
        }
        Update: {
          competency_level?: number | null
          created_at?: string
          game_id?: string | null
          gm_id?: string | null
          id?: string
          last_assessment_date?: string | null
          notes?: string | null
          training_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gm_game_competencies_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gm_game_competencies_gm_id_fkey"
            columns: ["gm_id"]
            isOneToOne: false
            referencedRelation: "game_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_notifications: {
        Row: {
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          event_data: Json | null
          event_id: string | null
          gm_id: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          event_data?: Json | null
          event_id?: string | null
          gm_id: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          event_data?: Json | null
          event_id?: string | null
          gm_id?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gm_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gm_notifications_gm_id_fkey"
            columns: ["gm_id"]
            isOneToOne: false
            referencedRelation: "game_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      make_sync_logs: {
        Row: {
          assignments_made: number | null
          calendar_source: string | null
          created_at: string
          date_range: Json | null
          error_message: string | null
          events_created: number | null
          events_processed: number | null
          events_updated: number | null
          id: string
          is_full_snapshot: boolean | null
          status: string
          sync_completed_at: string | null
          sync_started_at: string
          webhook_payload: Json | null
        }
        Insert: {
          assignments_made?: number | null
          calendar_source?: string | null
          created_at?: string
          date_range?: Json | null
          error_message?: string | null
          events_created?: number | null
          events_processed?: number | null
          events_updated?: number | null
          id?: string
          is_full_snapshot?: boolean | null
          status?: string
          sync_completed_at?: string | null
          sync_started_at?: string
          webhook_payload?: Json | null
        }
        Update: {
          assignments_made?: number | null
          calendar_source?: string | null
          created_at?: string
          date_range?: Json | null
          error_message?: string | null
          events_created?: number | null
          events_processed?: number | null
          events_updated?: number | null
          id?: string
          is_full_snapshot?: boolean | null
          status?: string
          sync_completed_at?: string | null
          sync_started_at?: string
          webhook_payload?: Json | null
        }
        Relationships: []
      }
      monthly_gm_emails_logs: {
        Row: {
          created_at: string
          error_message: string | null
          executed_at: string
          gm_count: number
          id: string
          trigger_type: string
          webhook_sent: boolean
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          executed_at?: string
          gm_count?: number
          id?: string
          trigger_type?: string
          webhook_sent?: boolean
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          executed_at?: string
          gm_count?: number
          id?: string
          trigger_type?: string
          webhook_sent?: boolean
          webhook_url?: string | null
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          admin_hours: number | null
          created_at: string
          earnings: number | null
          formation_hours: number | null
          gaming_hours: number | null
          gm_id: string | null
          id: string
          maintenance_hours: number | null
          menage_hours: number | null
          month_year: string
          report_data: Json | null
          sent_at: string | null
          total_hours: number | null
          travaux_informatiques_hours: number | null
          updated_at: string
        }
        Insert: {
          admin_hours?: number | null
          created_at?: string
          earnings?: number | null
          formation_hours?: number | null
          gaming_hours?: number | null
          gm_id?: string | null
          id?: string
          maintenance_hours?: number | null
          menage_hours?: number | null
          month_year: string
          report_data?: Json | null
          sent_at?: string | null
          total_hours?: number | null
          travaux_informatiques_hours?: number | null
          updated_at?: string
        }
        Update: {
          admin_hours?: number | null
          created_at?: string
          earnings?: number | null
          formation_hours?: number | null
          gaming_hours?: number | null
          gm_id?: string | null
          id?: string
          maintenance_hours?: number | null
          menage_hours?: number | null
          month_year?: string
          report_data?: Json | null
          sent_at?: string | null
          total_hours?: number | null
          travaux_informatiques_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_gm_id_fkey"
            columns: ["gm_id"]
            isOneToOne: false
            referencedRelation: "game_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          gm_auto_create_disabled: boolean
          gm_id: string | null
          id: string
          last_name: string | null
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          gm_auto_create_disabled?: boolean
          gm_id?: string | null
          id?: string
          last_name?: string | null
          role: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          gm_auto_create_disabled?: boolean
          gm_id?: string | null
          id?: string
          last_name?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gm_id_fkey"
            columns: ["gm_id"]
            isOneToOne: false
            referencedRelation: "game_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_inventories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inventory_date: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_date: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_date?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_inventory_items: {
        Row: {
          counted_quantity: number
          created_at: string
          id: string
          inventory_id: string
          notes: string | null
          product_id: string
          theoretical_quantity: number
          unit_price: number
          variance_quantity: number | null
          variance_value: number | null
        }
        Insert: {
          counted_quantity: number
          created_at?: string
          id?: string
          inventory_id: string
          notes?: string | null
          product_id: string
          theoretical_quantity: number
          unit_price: number
          variance_quantity?: number | null
          variance_value?: number | null
        }
        Update: {
          counted_quantity?: number
          created_at?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          product_id?: string
          theoretical_quantity?: number
          unit_price?: number
          variance_quantity?: number | null
          variance_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_inventory_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "stock_inventories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_inventory_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string | null
          gm_id: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          gm_id?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          gm_id?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_unassigned_logs: {
        Row: {
          created_at: string
          executed_at: string
          id: string
          summary: Json | null
          unassigned_count: number
          urgent_count: number
          webhook_sent: boolean
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          executed_at?: string
          id?: string
          summary?: Json | null
          unassigned_count?: number
          urgent_count?: number
          webhook_sent?: boolean
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          executed_at?: string
          id?: string
          summary?: Json | null
          unassigned_count?: number
          urgent_count?: number
          webhook_sent?: boolean
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_gm_profile_for_user: {
        Args: {
          p_email: string
          p_first?: string
          p_last?: string
          p_user_id: string
        }
        Returns: string
      }
      get_current_stock: {
        Args: { product_id_param: string }
        Returns: number
      }
      get_current_user_gm_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_gm_notifications: {
        Args: { gm_id_param: string }
        Returns: {
          created_at: string
          email_sent: boolean
          email_sent_at: string
          event_data: Json
          event_id: string
          gm_id: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          title: string
          updated_at: string
        }[]
      }
      get_gm_public_names: {
        Args: Record<PropertyKey, never>
        Returns: {
          display_name: string
          gm_id: string
        }[]
      }
      get_gm_unread_notifications: {
        Args: { gm_id_param: string }
        Returns: {
          created_at: string
          email_sent: boolean
          email_sent_at: string
          event_data: Json
          event_id: string
          gm_id: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          title: string
          updated_at: string
        }[]
      }
      get_next_sync_time: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_stock_value: {
        Args: { product_id_param: string }
        Returns: number
      }
      get_stock_variance_since_last_inventory: {
        Args: { product_id_param: string }
        Returns: {
          current_variance: number
          last_counted_stock: number
          last_inventory_date: string
          theoretical_stock: number
        }[]
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_all_notifications_as_read: {
        Args: { gm_id_param: string }
        Returns: undefined
      }
      mark_notification_as_read: {
        Args: { notification_id_param: string }
        Returns: undefined
      }
      recalculate_event_durations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_notification_email_status: {
        Args: { notification_id_param: string }
        Returns: undefined
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
