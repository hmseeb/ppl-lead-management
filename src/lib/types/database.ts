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
          token?: string
          weekend_pause?: boolean | null
        }
        Relationships: []
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
          status: string
          total_leads: number
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
          status?: string
          total_leads: number
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
          status?: string
          total_leads?: number
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
