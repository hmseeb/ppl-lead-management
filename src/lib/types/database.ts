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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          broker_id: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
          lead_id: string | null
          order_id: string | null
        }
        Insert: {
          broker_id?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          lead_id?: string | null
          order_id?: string | null
        }
        Update: {
          broker_id?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          lead_id?: string | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          alert_ghl_contact_id: string
          alert_sms_enabled: boolean
          created_at: string
          dedup_window_minutes: number
          failure_alert_enabled: boolean
          id: string
          unassigned_alert_enabled: boolean
          updated_at: string
        }
        Insert: {
          alert_ghl_contact_id: string
          alert_sms_enabled?: boolean
          created_at?: string
          dedup_window_minutes?: number
          failure_alert_enabled?: boolean
          id?: string
          unassigned_alert_enabled?: boolean
          updated_at?: string
        }
        Update: {
          alert_ghl_contact_id?: string
          alert_sms_enabled?: boolean
          created_at?: string
          dedup_window_minutes?: number
          failure_alert_enabled?: boolean
          id?: string
          unassigned_alert_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      alert_state: {
        Row: {
          alert_type: string
          context_id: string
          id: string
          last_payload: Json | null
          last_sent_at: string
          suppressed_count: number
        }
        Insert: {
          alert_type: string
          context_id: string
          id?: string
          last_payload?: Json | null
          last_sent_at?: string
          suppressed_count?: number
        }
        Update: {
          alert_type?: string
          context_id?: string
          id?: string
          last_payload?: Json | null
          last_sent_at?: string
          suppressed_count?: number
        }
        Relationships: []
      }
      brokers: {
        Row: {
          assignment_status: string
          batch_size: number
          company: string | null
          company_name: string | null
          completed_at: string | null
          contact_hours: string | null
          created_at: string
          crm_webhook_url: string | null
          current_step: number | null
          custom_hours_end: string | null
          custom_hours_start: string | null
          deal_amount: number
          delivery_email: string | null
          delivery_methods: string[] | null
          delivery_phone: string | null
          email: string
          first_name: string
          ghl_contact_id: string
          id: string
          last_name: string
          phone: string | null
          primary_vertical: string | null
          secondary_vertical: string | null
          state: string | null
          status: string
          step_data: Json | null
          timezone: string | null
          token: string
          weekend_pause: boolean | null
        }
        Insert: {
          assignment_status?: string
          batch_size: number
          company?: string | null
          company_name?: string | null
          completed_at?: string | null
          contact_hours?: string | null
          created_at?: string
          crm_webhook_url?: string | null
          current_step?: number | null
          custom_hours_end?: string | null
          custom_hours_start?: string | null
          deal_amount: number
          delivery_email?: string | null
          delivery_methods?: string[] | null
          delivery_phone?: string | null
          email: string
          first_name: string
          ghl_contact_id: string
          id?: string
          last_name: string
          phone?: string | null
          primary_vertical?: string | null
          secondary_vertical?: string | null
          state?: string | null
          status?: string
          step_data?: Json | null
          timezone?: string | null
          token?: string
          weekend_pause?: boolean | null
        }
        Update: {
          assignment_status?: string
          batch_size?: number
          company?: string | null
          company_name?: string | null
          completed_at?: string | null
          contact_hours?: string | null
          created_at?: string
          crm_webhook_url?: string | null
          current_step?: number | null
          custom_hours_end?: string | null
          custom_hours_start?: string | null
          deal_amount?: number
          delivery_email?: string | null
          delivery_methods?: string[] | null
          delivery_phone?: string | null
          email?: string
          first_name?: string
          ghl_contact_id?: string
          id?: string
          last_name?: string
          phone?: string | null
          primary_vertical?: string | null
          secondary_vertical?: string | null
          state?: string | null
          status?: string
          step_data?: Json | null
          timezone?: string | null
          token?: string
          weekend_pause?: boolean | null
        }
        Relationships: []
      }
      callbacks: {
        Row: {
          broker_id: string
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          scheduled_time: string
          status: string
          updated_at: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          scheduled_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          scheduled_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "callbacks_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callbacks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          broker_id: string
          created_at: string
          duration: number
          id: string
          lead_id: string
          notes: string | null
          outcome: string
          retell_call_id: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          duration?: number
          id?: string
          lead_id: string
          notes?: string | null
          outcome: string
          retell_call_id: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          duration?: number
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: string
          retell_call_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          broker_id: string
          channel: string
          created_at: string
          error_message: string | null
          ghl_contact_id: string | null
          ghl_message_id: string | null
          id: string
          last_retry_at: string | null
          lead_id: string
          order_id: string
          payload: Json
          pg_net_request_id: number | null
          retry_count: number
          sent_at: string | null
          status: string
          target_url: string | null
          updated_at: string
        }
        Insert: {
          broker_id: string
          channel?: string
          created_at?: string
          error_message?: string | null
          ghl_contact_id?: string | null
          ghl_message_id?: string | null
          id?: string
          last_retry_at?: string | null
          lead_id: string
          order_id: string
          payload: Json
          pg_net_request_id?: number | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          broker_id?: string
          channel?: string
          created_at?: string
          error_message?: string | null
          ghl_contact_id?: string | null
          ghl_message_id?: string | null
          id?: string
          last_retry_at?: string | null
          lead_id?: string
          order_id?: string
          payload?: Json
          pg_net_request_id?: number | null
          retry_count?: number
          sent_at?: string | null
          status?: string
          target_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_runs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          period_end: string
          period_start: string
          run_at: string
          stats: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          period_end: string
          period_start: string
          run_at?: string
          stats?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          period_end?: string
          period_start?: string
          run_at?: string
          stats?: Json | null
          status?: string
        }
        Relationships: []
      }
      lead_prices: {
        Row: {
          broker_id: string | null
          created_at: string
          credit_tier_min: number
          id: string
          price_cents: number
          updated_at: string
          vertical: string
        }
        Insert: {
          broker_id?: string | null
          created_at?: string
          credit_tier_min: number
          id?: string
          price_cents: number
          updated_at?: string
          vertical: string
        }
        Update: {
          broker_id?: string | null
          created_at?: string
          credit_tier_min?: number
          id?: string
          price_cents?: number
          updated_at?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_prices_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_call_notes: string | null
          ai_call_status: string | null
          assigned_at: string | null
          assigned_broker_id: string | null
          assigned_order_id: string | null
          business_name: string | null
          created_at: string
          credit_score: number | null
          email: string | null
          first_name: string | null
          funding_amount: number | null
          funding_purpose: string | null
          ghl_contact_id: string | null
          id: string
          last_name: string | null
          phone: string | null
          raw_payload: Json | null
          rejection_reason: string | null
          state: string | null
          status: string
          updated_at: string
          vertical: string | null
        }
        Insert: {
          ai_call_notes?: string | null
          ai_call_status?: string | null
          assigned_at?: string | null
          assigned_broker_id?: string | null
          assigned_order_id?: string | null
          business_name?: string | null
          created_at?: string
          credit_score?: number | null
          email?: string | null
          first_name?: string | null
          funding_amount?: number | null
          funding_purpose?: string | null
          ghl_contact_id?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          raw_payload?: Json | null
          rejection_reason?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          ai_call_notes?: string | null
          ai_call_status?: string | null
          assigned_at?: string | null
          assigned_broker_id?: string | null
          assigned_order_id?: string | null
          business_name?: string | null
          created_at?: string
          credit_score?: number | null
          email?: string | null
          first_name?: string | null
          funding_amount?: number | null
          funding_purpose?: string | null
          ghl_contact_id?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          raw_payload?: Json | null
          rejection_reason?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_broker_id_fkey"
            columns: ["assigned_broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_order_id_fkey"
            columns: ["assigned_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      marketers: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketer_brokers: {
        Row: {
          id: string
          marketer_id: string
          broker_id: string
          created_at: string
        }
        Insert: {
          id?: string
          marketer_id: string
          broker_id: string
          created_at?: string
        }
        Update: {
          id?: string
          marketer_id?: string
          broker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketer_brokers_marketer_id_fkey"
            columns: ["marketer_id"]
            isOneToOne: false
            referencedRelation: "marketers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketer_brokers_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_links: {
        Row: {
          broker_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
        }
        Insert: {
          broker_id: string
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
        }
        Update: {
          broker_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "magic_links_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bonus_mode: boolean
          broker_id: string
          created_at: string
          credit_score_min: number | null
          id: string
          last_assigned_at: string | null
          leads_delivered: number
          leads_remaining: number
          loan_max: number | null
          loan_min: number | null
          order_type: string
          price_per_lead_cents: number | null
          priority: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          total_leads: number
          total_price_cents: number | null
          updated_at: string
          verticals: string[]
        }
        Insert: {
          bonus_mode?: boolean
          broker_id: string
          created_at?: string
          credit_score_min?: number | null
          id?: string
          last_assigned_at?: string | null
          leads_delivered?: number
          leads_remaining: number
          loan_max?: number | null
          loan_min?: number | null
          order_type?: string
          price_per_lead_cents?: number | null
          priority?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_leads: number
          total_price_cents?: number | null
          updated_at?: string
          verticals: string[]
        }
        Update: {
          bonus_mode?: boolean
          broker_id?: string
          created_at?: string
          credit_score_min?: number | null
          id?: string
          last_assigned_at?: string | null
          leads_delivered?: number
          leads_remaining?: number
          loan_max?: number | null
          loan_min?: number | null
          order_type?: string
          price_per_lead_cents?: number | null
          priority?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          total_leads?: number
          total_price_cents?: number | null
          updated_at?: string
          verticals?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "orders_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_logs: {
        Row: {
          broker_id: string
          created_at: string
          disqualify_reason: string | null
          eligible: boolean
          fill_rate: number
          id: string
          lead_id: string
          order_id: string
          score_breakdown: Json
          selected: boolean
          total_score: number
        }
        Insert: {
          broker_id: string
          created_at?: string
          disqualify_reason?: string | null
          eligible?: boolean
          fill_rate?: number
          id?: string
          lead_id: string
          order_id: string
          score_breakdown?: Json
          selected?: boolean
          total_score?: number
        }
        Update: {
          broker_id?: string
          created_at?: string
          disqualify_reason?: string | null
          eligible?: boolean
          fill_rate?: number
          id?: string
          lead_id?: string
          order_id?: string
          score_breakdown?: Json
          selected?: boolean
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "routing_logs_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      unassigned_queue: {
        Row: {
          created_at: string
          details: string | null
          id: string
          lead_id: string
          reason: string
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          lead_id: string
          reason: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          lead_id?: string
          reason?: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unassigned_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_lead: {
        Args: { p_lead_id: string; p_order_id?: string }
        Returns: Json
      }
      build_match_failure_reason: {
        Args: { p_lead: Database["public"]["Tables"]["leads"]["Row"] }
        Returns: string
      }
      check_delivery_responses: { Args: never; Returns: undefined }
      is_within_contact_hours: {
        Args: { p_broker_id: string }
        Returns: boolean
      }
      process_queued_deliveries: { Args: never; Returns: number }
      process_webhook_retries: {
        Args: { p_batch_size?: number }
        Returns: undefined
      }
      reset_monthly_orders: { Args: never; Returns: number }
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
