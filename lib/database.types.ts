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
      users: {
        Row: {
          user_id: string
          username: string
          display_name: string
          avatar_url: string | null
          status: 'online' | 'offline' | 'away'
          last_active: string
        }
        Insert: {
          user_id?: string
          username: string
          display_name: string
          avatar_url?: string | null
          status?: 'online' | 'offline' | 'away'
          last_active?: string
        }
        Update: {
          user_id?: string
          username?: string
          display_name?: string
          avatar_url?: string | null
          status?: 'online' | 'offline' | 'away'
          last_active?: string
        }
      }
      chat_groups: {
        Row: {
          group_id: string
          name: string
          type: 'direct' | 'community' | 'project'
          creator_id: string
          created_at: string
        }
        Insert: {
          group_id?: string
          name: string
          type: 'direct' | 'community' | 'project'
          creator_id: string
          created_at?: string
        }
        Update: {
          group_id?: string
          name?: string
          type?: 'direct' | 'community' | 'project'
          creator_id?: string
          created_at?: string
        }
      }
      group_memberships: {
        Row: {
          membership_id: string
          user_id: string
          group_id: string
          role: 'owner' | 'admin' | 'moderator' | 'member'
          is_banned: boolean
          joined_at: string
        }
        Insert: {
          membership_id?: string
          user_id: string
          group_id: string
          role?: 'owner' | 'admin' | 'moderator' | 'member'
          is_banned?: boolean
          joined_at?: string
        }
        Update: {
          membership_id?: string
          user_id?: string
          group_id?: string
          role?: 'owner' | 'admin' | 'moderator' | 'member'
          is_banned?: boolean
          joined_at?: string
        }
      }
      messages: {
        Row: {
          message_id: string
          group_id: string
          sender_id: string
          reply_to_id: string | null
          message_type: 'text' | 'system' | 'deleted'
          content: string | null
          metadata: Json
          sent_at: string
        }
        Insert: {
          message_id?: string
          group_id: string
          sender_id: string
          reply_to_id?: string | null
          message_type?: 'text' | 'system' | 'deleted'
          content?: string | null
          metadata?: Json
          sent_at?: string
        }
        Update: {
          message_id?: string
          group_id?: string
          sender_id?: string
          reply_to_id?: string | null
          message_type?: 'text' | 'system' | 'deleted'
          content?: string | null
          metadata?: Json
          sent_at?: string
        }
      }
      attachments: {
        Row: {
          attachment_id: string
          message_id: string
          type: 'image' | 'file' | 'video'
          url: string
          size: string | null
          metadata: Json
        }
        Insert: {
          attachment_id?: string
          message_id: string
          type: 'image' | 'file' | 'video'
          url: string
          size?: string | null
          metadata?: Json
        }
        Update: {
          attachment_id?: string
          message_id?: string
          type?: 'image' | 'file' | 'video'
          url?: string
          size?: string | null
          metadata?: Json
        }
      }
      message_reactions: {
        Row: {
          reaction_id: string
          message_id: string
          user_id: string
          emoji: string
          reacted_at: string
        }
        Insert: {
          reaction_id?: string
          message_id: string
          user_id: string
          emoji: string
          reacted_at?: string
        }
        Update: {
          reaction_id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          reacted_at?: string
        }
      }
      custom_notifications: {
        Row: {
          notification_id: string
          group_id: string
          user_id: string
          notification_type: 'activity' | 'system' | 'custom'
          message: string
          payload: Json
          created_at: string
        }
        Insert: {
          notification_id?: string
          group_id: string
          user_id: string
          notification_type?: 'activity' | 'system' | 'custom'
          message: string
          payload?: Json
          created_at?: string
        }
        Update: {
          notification_id?: string
          group_id?: string
          user_id?: string
          notification_type?: 'activity' | 'system' | 'custom'
          message?: string
          payload?: Json
          created_at?: string
        }
      }
    }
  }
}