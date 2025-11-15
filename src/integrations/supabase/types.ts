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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      actors: {
        Row: {
          accent: string | null
          age_group: string
          created_at: string
          emotions: string[] | null
          ethnicity: string | null
          gender: string
          id: string
          is_premium: boolean | null
          name: string
          scenarios: string[] | null
          thumbnail_url: string | null
          voice_sample_url: string | null
        }
        Insert: {
          accent?: string | null
          age_group: string
          created_at?: string
          emotions?: string[] | null
          ethnicity?: string | null
          gender: string
          id?: string
          is_premium?: boolean | null
          name: string
          scenarios?: string[] | null
          thumbnail_url?: string | null
          voice_sample_url?: string | null
        }
        Update: {
          accent?: string | null
          age_group?: string
          created_at?: string
          emotions?: string[] | null
          ethnicity?: string | null
          gender?: string
          id?: string
          is_premium?: boolean | null
          name?: string
          scenarios?: string[] | null
          thumbnail_url?: string | null
          voice_sample_url?: string | null
        }
        Relationships: []
      }
      admin_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          last_login_at: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          last_login_at?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          last_login_at?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_execution_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          session_id: string
          status: string
          step_name: string
          tool_name: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          session_id: string
          status: string
          step_name: string
          tool_name?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          session_id?: string
          status?: string
          step_name?: string
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_execution_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "agent_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          memory_type: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          memory_type: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          memory_type?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string | null
          id: string
          metadata: Json | null
          progress: number | null
          project_id: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          id?: string
          metadata?: Json | null
          progress?: number | null
          project_id?: string | null
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          id?: string
          metadata?: Json | null
          progress?: number | null
          project_id?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      api_health: {
        Row: {
          checked_at: string
          details: Json | null
          error_message: string | null
          id: string
          latency_ms: number | null
          service_name: string
          status: string
        }
        Insert: {
          checked_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          service_name: string
          status: string
        }
        Update: {
          checked_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      audio_files: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          file_size_bytes: number | null
          file_url: string
          id: string
          project_id: string | null
          source_type: string
          tts_settings: Json | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          project_id?: string | null
          source_type: string
          tts_settings?: Json | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          project_id?: string | null
          source_type?: string
          tts_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          actor_id: string
          created_at: string
          error_message: string | null
          id: string
          progress: number | null
          project_id: string
          status: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          progress?: number | null
          project_id: string
          status?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          progress?: number | null
          project_id?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generations_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      health_checks: {
        Row: {
          checked_at: string
          created_at: string
          error_message: string | null
          id: string
          latency: number | null
          service_name: string
          status: string
        }
        Insert: {
          checked_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          latency?: number | null
          service_name: string
          status: string
        }
        Update: {
          checked_at?: string
          created_at?: string
          error_message?: string | null
          id?: string
          latency?: number | null
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      omnihuman_generations: {
        Row: {
          actor_id: string | null
          audio_url: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          project_id: string | null
          status: string | null
          task_id: string
          video_url: string | null
        }
        Insert: {
          actor_id?: string | null
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
          task_id: string
          video_url?: string | null
        }
        Update: {
          actor_id?: string | null
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          project_id?: string | null
          status?: string | null
          task_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "omnihuman_generations_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omnihuman_generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          paused: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          paused?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          paused?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          aspect_ratio: string | null
          audio_source: string | null
          created_at: string
          display_order: number | null
          folder_id: string | null
          generated_video_url: string | null
          generation_progress: number | null
          generation_status: string | null
          id: string
          omnihuman_task_ids: string[] | null
          omnihuman_video_urls: string[] | null
          script: string | null
          selected_actors: string[] | null
          status: string | null
          thumbnail_url: string | null
          title: string
          tts_settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          audio_source?: string | null
          created_at?: string
          display_order?: number | null
          folder_id?: string | null
          generated_video_url?: string | null
          generation_progress?: number | null
          generation_status?: string | null
          id?: string
          omnihuman_task_ids?: string[] | null
          omnihuman_video_urls?: string[] | null
          script?: string | null
          selected_actors?: string[] | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          tts_settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          audio_source?: string | null
          created_at?: string
          display_order?: number | null
          folder_id?: string | null
          generated_video_url?: string | null
          generation_progress?: number | null
          generation_status?: string | null
          id?: string
          omnihuman_task_ids?: string[] | null
          omnihuman_video_urls?: string[] | null
          script?: string | null
          selected_actors?: string[] | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          tts_settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          stripe_coupon_id: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          stripe_coupon_id?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          stripe_coupon_id?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      promo_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          max_uses: number
          promo_code_id: string | null
          token: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          max_uses?: number
          promo_code_id?: string | null
          token: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          max_uses?: number
          promo_code_id?: string | null
          token?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_links_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_generations: {
        Row: {
          aspect_ratio: string | null
          completed_at: string | null
          cost_time: number | null
          created_at: string | null
          fail_code: string | null
          fail_msg: string | null
          id: string
          image_url: string
          n_frames: string | null
          project_id: string | null
          prompt: string
          remove_watermark: boolean | null
          result_url: string | null
          status: string
          task_id: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          completed_at?: string | null
          cost_time?: number | null
          created_at?: string | null
          fail_code?: string | null
          fail_msg?: string | null
          id?: string
          image_url: string
          n_frames?: string | null
          project_id?: string | null
          prompt: string
          remove_watermark?: boolean | null
          result_url?: string | null
          status?: string
          task_id: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          completed_at?: string | null
          cost_time?: number | null
          created_at?: string | null
          fail_code?: string | null
          fail_msg?: string | null
          id?: string
          image_url?: string
          n_frames?: string | null
          project_id?: string | null
          prompt?: string
          remove_watermark?: boolean | null
          result_url?: string | null
          status?: string
          task_id?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_user_count: { Args: never; Returns: number }
      get_total_user_count: { Args: never; Returns: number }
      get_user_stats: {
        Args: { target_user_id: string }
        Returns: {
          last_login: string
          total_logins: number
          video_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_agent_memory: {
        Args: {
          filter_memory_type?: string
          filter_user_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          memory_type: string
          metadata: Json
          similarity: number
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
