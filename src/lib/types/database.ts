export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      brokers: {
        Row: {
          id: string
          [key: string]: unknown
        }
        Insert: {
          id?: string
          [key: string]: unknown
        }
        Update: {
          id?: string
          [key: string]: unknown
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
