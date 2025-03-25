/*
  # Chat Application Schema

  1. New Tables
    - `profiles`
      - Stores user profile information
      - Links to Supabase auth.users
    - `conversations`
      - Stores group and direct message conversations
    - `conversation_participants`
      - Links users to conversations
    - `messages`
      - Stores chat messages
    - `message_reactions`
      - Stores emoji reactions to messages
    - `message_attachments`
      - Stores file attachments for messages
    - `message_reads`
      - Tracks message read status
    - `typing_status`
      - Tracks user typing status

  2. Security
    - Enable RLS on all tables
    - Add policies for secure access
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  is_group boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, profile_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, profile_id, emoji)
);

-- Create message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create message reads table
CREATE TABLE IF NOT EXISTS message_reads (
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, profile_id)
);

-- Create typing status table
CREATE TABLE IF NOT EXISTS typing_status (
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, profile_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read conversations they are part of"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can read messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
    )
  );

-- Create function to get paginated messages
CREATE OR REPLACE FUNCTION get_conversation_messages(
  conversation_id_param uuid,
  cursor_param uuid DEFAULT NULL,
  limit_param integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  profile_id uuid,
  content text,
  created_at timestamptz,
  updated_at timestamptz,
  attachments json,
  reactions json,
  read_by json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH message_data AS (
    SELECT 
      m.id,
      m.conversation_id,
      m.profile_id,
      m.content,
      m.created_at,
      m.updated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ma.id,
            'file_name', ma.file_name,
            'file_type', ma.file_type,
            'file_size', ma.file_size,
            'file_path', ma.file_path
          )
        ) FILTER (WHERE ma.id IS NOT NULL), 
        '[]'::json
      ) as attachments,
      COALESCE(
        json_agg(
          json_build_object(
            'emoji', mr.emoji,
            'profile_id', mr.profile_id
          )
        ) FILTER (WHERE mr.id IS NOT NULL), 
        '[]'::json
      ) as reactions,
      COALESCE(
        json_agg(
          json_build_object(
            'profile_id', mread.profile_id,
            'read_at', mread.read_at
          )
        ) FILTER (WHERE mread.profile_id IS NOT NULL), 
        '[]'::json
      ) as read_by
    FROM messages m
    LEFT JOIN message_attachments ma ON m.id = ma.message_id
    LEFT JOIN message_reactions mr ON m.id = mr.message_id
    LEFT JOIN message_reads mread ON m.id = mread.message_id
    WHERE m.conversation_id = conversation_id_param
    AND (cursor_param IS NULL OR m.created_at < (
      SELECT created_at FROM messages WHERE id = cursor_param
    ))
    GROUP BY m.id, m.conversation_id, m.profile_id, m.content, m.created_at, m.updated_at
    ORDER BY m.created_at DESC
    LIMIT limit_param
  )
  SELECT * FROM message_data;
END;
$$;