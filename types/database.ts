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
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          phone: string | null
          role: 'admin' | 'viewer'
          profile_image_url: string | null
          is_subscriber: boolean
          subscription_expires_at: string | null
          status: 'active' | 'suspended'
          last_login: string | null
          created_at: string
          updated_at: string
          onboarding_completed: boolean
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          phone?: string | null
          role?: 'admin' | 'viewer'
          profile_image_url?: string | null
          is_subscriber?: boolean
          subscription_expires_at?: string | null
          status?: 'active' | 'suspended'
          last_login?: string | null
          created_at?: string
          updated_at?: string
          onboarding_completed?: boolean
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          phone?: string | null
          role?: 'admin' | 'viewer'
          profile_image_url?: string | null
          is_subscriber?: boolean
          subscription_expires_at?: string | null
          status?: 'active' | 'suspended'
          last_login?: string | null
          created_at?: string
          updated_at?: string
          onboarding_completed?: boolean
        }
      }
      locations: {
        Row: {
          id: string
          title: string
          hero_image_url: string | null
          camera_settings: Json | null
          story_text: string | null
          map_lat: number | null
          map_lng: number | null
          created_at: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          id?: string
          title: string
          hero_image_url?: string | null
          camera_settings?: Json | null
          story_text?: string | null
          map_lat?: number | null
          map_lng?: number | null
          created_at?: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          id?: string
          title?: string
          hero_image_url?: string | null
          camera_settings?: Json | null
          story_text?: string | null
          map_lat?: number | null
          map_lng?: number | null
          created_at?: string
          updated_at?: string
          visible?: boolean
        }
      }
      location_comments: {
        Row: {
          id: string
          location_id: string
          user_id: string
          comment_text: string
          created_at: string
          hidden: boolean
        }
        Insert: {
          id?: string
          location_id: string
          user_id: string
          comment_text: string
          created_at?: string
          hidden?: boolean
        }
        Update: {
          id?: string
          location_id?: string
          user_id?: string
          comment_text?: string
          created_at?: string
          hidden?: boolean
        }
      }
      workshops: {
        Row: {
          id: string
          title: string
          description: string | null
          date: string | null
          price: number | null
          image_url: string | null
          registration_link: string | null
          created_at: string
          visible: boolean
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          date?: string | null
          price?: number | null
          image_url?: string | null
          registration_link?: string | null
          created_at?: string
          visible?: boolean
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          date?: string | null
          price?: number | null
          image_url?: string | null
          registration_link?: string | null
          created_at?: string
          visible?: boolean
        }
      }
      workshop_registrations: {
        Row: {
          id: string
          workshop_id: string
          user_id: string
          registered_at: string
        }
        Insert: {
          id?: string
          workshop_id: string
          user_id: string
          registered_at?: string
        }
        Update: {
          id?: string
          workshop_id?: string
          user_id?: string
          registered_at?: string
        }
      }
      portfolio: {
        Row: {
          id: string
          title: string
          image_url: string
          description: string | null
          order_index: number
          created_at: string
          visible: boolean
        }
        Insert: {
          id?: string
          title: string
          image_url: string
          description?: string | null
          order_index?: number
          created_at?: string
          visible?: boolean
        }
        Update: {
          id?: string
          title?: string
          image_url?: string
          description?: string | null
          order_index?: number
          created_at?: string
          visible?: boolean
        }
      }
      bts_videos: {
        Row: {
          id: string
          title: string
          video_url: string
          thumbnail_url: string | null
          subscriber_only: boolean
          created_at: string
          visible: boolean
        }
        Insert: {
          id?: string
          title: string
          video_url: string
          thumbnail_url?: string | null
          subscriber_only?: boolean
          created_at?: string
          visible?: boolean
        }
        Update: {
          id?: string
          title?: string
          video_url?: string
          thumbnail_url?: string | null
          subscriber_only?: boolean
          created_at?: string
          visible?: boolean
        }
      }
      coupons: {
        Row: {
          id: string
          code: string
          discount_percent: number | null
          active: boolean
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_percent?: number | null
          active?: boolean
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          discount_percent?: number | null
          active?: boolean
          expires_at?: string | null
          created_at?: string
        }
      }
      notification_devices: {
        Row: {
          id: string
          profile_id: string | null
          push_token: string
          platform: string
          created_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          push_token: string
          platform: string
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          push_token?: string
          platform?: string
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          table_name: string
          action: string
          performed_by: string | null
          row_id: string | null
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          table_name: string
          action: string
          performed_by?: string | null
          row_id?: string | null
          payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          action?: string
          performed_by?: string | null
          row_id?: string | null
          payload?: Json | null
          created_at?: string
        }
      }
      licensing_inquiries: {
        Row: {
          id: string
          user_id: string | null
          name: string
          email: string
          message: string
          created_at: string
          status: 'pending' | 'contacted' | 'closed'
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          email: string
          message: string
          created_at?: string
          status?: 'pending' | 'contacted' | 'closed'
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          email?: string
          message?: string
          created_at?: string
          status?: 'pending' | 'contacted' | 'closed'
        }
      }
      password_reset_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          expires_at: string
          used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          expires_at?: string
          used?: boolean
          created_at?: string
        }
      }
      media_items: {
        Row: {
          id: string
          title: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          media_type: 'image' | 'video'
          storage_bucket: string
          uploaded_by: string
          usage_locations: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          media_type: 'image' | 'video'
          storage_bucket: string
          uploaded_by: string
          usage_locations?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          media_type?: 'image' | 'video'
          storage_bucket?: string
          uploaded_by?: string
          usage_locations?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      log_admin_action: {
        Args: {
          p_table_name: string
          p_action: string
          p_row_id: string
          p_payload: Json
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
