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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_providers: {
        Row: {
          cooldown_until: string | null
          enabled: boolean
          has_key: boolean
          id: string
          key_hint: string | null
          label: string
          last_error: string | null
          last_status: string
          last_used_at: string | null
          model: string
          priority: number
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cooldown_until?: string | null
          enabled?: boolean
          has_key?: boolean
          id?: string
          key_hint?: string | null
          label?: string
          last_error?: string | null
          last_status?: string
          last_used_at?: string | null
          model: string
          priority?: number
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cooldown_until?: string | null
          enabled?: boolean
          has_key?: boolean
          id?: string
          key_hint?: string | null
          label?: string
          last_error?: string | null
          last_status?: string
          last_used_at?: string | null
          model?: string
          priority?: number
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          logo_icon: string
          logo_type: string
          logo_url: string | null
          primary_color: string
          store_name: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          logo_icon?: string
          logo_type?: string
          logo_url?: string | null
          primary_color?: string
          store_name?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          logo_icon?: string
          logo_type?: string
          logo_url?: string | null
          primary_color?: string
          store_name?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          meta: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          meta?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          meta?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      command_logs: {
        Row: {
          action: string | null
          app_name: string | null
          command: string
          created_at: string
          id: string
          provider: string | null
          result: string | null
          source: string
          status: string
          user_id: string
        }
        Insert: {
          action?: string | null
          app_name?: string | null
          command: string
          created_at?: string
          id?: string
          provider?: string | null
          result?: string | null
          source?: string
          status?: string
          user_id: string
        }
        Update: {
          action?: string | null
          app_name?: string | null
          command?: string
          created_at?: string
          id?: string
          provider?: string | null
          result?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      line_settings: {
        Row: {
          has_secret: boolean
          has_token: boolean
          owner_line_ids: string[]
          target_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          has_secret?: boolean
          has_token?: boolean
          owner_line_ids?: string[]
          target_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          has_secret?: boolean
          has_token?: boolean
          owner_line_ids?: string[]
          target_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_actions: {
        Row: {
          action: string
          app_id: string | null
          app_name: string | null
          code: string
          created_at: string
          id: string
          params: Json
          result: string | null
          source: string
          status: string
          summary: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          app_id?: string | null
          app_name?: string | null
          code: string
          created_at?: string
          id?: string
          params?: Json
          result?: string | null
          source?: string
          status?: string
          summary?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          app_id?: string | null
          app_name?: string | null
          code?: string
          created_at?: string
          id?: string
          params?: Json
          result?: string | null
          source?: string
          status?: string
          summary?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      satellite_apps: {
        Row: {
          base_url: string
          created_at: string
          has_key: boolean
          id: string
          last_checked_at: string | null
          last_synced_at: string | null
          name: string
          status: string
          tools: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          base_url: string
          created_at?: string
          has_key?: boolean
          id?: string
          last_checked_at?: string | null
          last_synced_at?: string | null
          name: string
          status?: string
          tools?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          base_url?: string
          created_at?: string
          has_key?: boolean
          id?: string
          last_checked_at?: string | null
          last_synced_at?: string | null
          name?: string
          status?: string
          tools?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      secret_store: {
        Row: {
          id: string
          kind: string
          ref: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          id?: string
          kind: string
          ref?: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          id?: string
          kind?: string
          ref?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
