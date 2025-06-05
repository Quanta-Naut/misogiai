import { createClient } from '@supabase/supabase-js'

// Default values to prevent URL errors during development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          user_type: 'founder' | 'investor'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          user_type: 'founder' | 'investor'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          avatar_url?: string | null
          user_type?: 'founder' | 'investor'
          created_at?: string
          updated_at?: string
        }
      }
      startups: {
        Row: {
          id: string
          founder_id: string
          name: string
          tagline: string
          description: string
          vision: string
          product_description: string
          market_size: string
          business_model: string
          funding_ask: number
          equity_offered: number
          current_valuation: number
          pitch_deck_url: string | null
          status: 'draft' | 'active' | 'funded'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          name: string
          tagline: string
          description: string
          vision: string
          product_description: string
          market_size: string
          business_model: string
          funding_ask: number
          equity_offered: number
          current_valuation: number
          pitch_deck_url?: string | null
          status?: 'draft' | 'active' | 'funded'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          name?: string
          tagline?: string
          description?: string
          vision?: string
          product_description?: string
          market_size?: string
          business_model?: string
          funding_ask?: number
          equity_offered?: number
          current_valuation?: number
          pitch_deck_url?: string | null
          status?: 'draft' | 'active' | 'funded'
          created_at?: string
          updated_at?: string
        }
      }
      funding_rounds: {
        Row: {
          id: string
          startup_id: string
          investor_id: string
          amount: number
          equity_percentage: number
          valuation: number
          status: 'pending' | 'accepted' | 'rejected'
          terms: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          investor_id: string
          amount: number
          equity_percentage: number
          valuation: number
          status?: 'pending' | 'accepted' | 'rejected'
          terms?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          investor_id?: string
          amount?: number
          equity_percentage?: number
          valuation?: number
          status?: 'pending' | 'accepted' | 'rejected'
          terms?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ratings: {
        Row: {
          id: string
          startup_id: string
          investor_id: string
          team_score: number
          product_score: number
          market_score: number
          overall_score: number
          feedback: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          investor_id: string
          team_score: number
          product_score: number
          market_score: number
          overall_score: number
          feedback?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          investor_id?: string
          team_score?: number
          product_score?: number
          market_score?: number
          overall_score?: number
          feedback?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pitch_sessions: {
        Row: {
          id: string
          startup_id: string
          session_name: string
          description: string | null
          start_time: string
          end_time: string
          status: 'scheduled' | 'active' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          session_name: string
          description?: string | null
          start_time: string
          end_time: string
          status?: 'scheduled' | 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          session_name?: string
          description?: string | null
          start_time?: string
          end_time?: string
          status?: 'scheduled' | 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          user_id: string
          message: string
          message_type: 'text' | 'ai_response' | 'system'
          ai_provider: 'openai' | 'groq' | 'gemini' | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          message: string
          message_type?: 'text' | 'ai_response' | 'system'
          ai_provider?: 'openai' | 'groq' | 'gemini' | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          message?: string
          message_type?: 'text' | 'ai_response' | 'system'
          ai_provider?: 'openai' | 'groq' | 'gemini' | null
          created_at?: string
        }
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
  }
}