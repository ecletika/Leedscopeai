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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      conversation_lines: {
        Row: {
          comments: string | null
          conversation_id: string
          created_at: string
          difficulty: string | null
          id: string
          line_order: number
          next_review: string | null
          person: string
          text: string
        }
        Insert: {
          comments?: string | null
          conversation_id: string
          created_at?: string
          difficulty?: string | null
          id?: string
          line_order: number
          next_review?: string | null
          person: string
          text: string
        }
        Update: {
          comments?: string | null
          conversation_id?: string
          created_at?: string
          difficulty?: string | null
          id?: string
          line_order?: number
          next_review?: string | null
          person?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_lines_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          conversation_set_id: string
          created_at: string
          description: string | null
          id: string
          title: string
        }
        Insert: {
          conversation_set_id: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          conversation_set_id?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_conversation_set_id_fkey"
            columns: ["conversation_set_id"]
            isOneToOne: false
            referencedRelation: "conversation_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      long_texts: {
        Row: {
          content: string
          created_at: string
          general_comments: string | null
          id: string
          source: string | null
          text_video_set_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          general_comments?: string | null
          id?: string
          source?: string | null
          text_video_set_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          general_comments?: string | null
          id?: string
          source?: string | null
          text_video_set_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "long_texts_text_video_set_id_fkey"
            columns: ["text_video_set_id"]
            isOneToOne: false
            referencedRelation: "text_video_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      phrase_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      phrases: {
        Row: {
          comments: string | null
          created_at: string
          difficulty: string | null
          english_text: string
          id: string
          next_review: string | null
          phrase_set_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          difficulty?: string | null
          english_text: string
          id?: string
          next_review?: string | null
          phrase_set_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          difficulty?: string | null
          english_text?: string
          id?: string
          next_review?: string | null
          phrase_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phrases_phrase_set_id_fkey"
            columns: ["phrase_set_id"]
            isOneToOne: false
            referencedRelation: "phrase_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      text_paragraphs: {
        Row: {
          comments: string | null
          created_at: string
          difficulty: string | null
          id: string
          long_text_id: string
          next_review: string | null
          paragraph_order: number
          text: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          long_text_id: string
          next_review?: string | null
          paragraph_order: number
          text: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          long_text_id?: string
          next_review?: string | null
          paragraph_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "text_paragraphs_long_text_id_fkey"
            columns: ["long_text_id"]
            isOneToOne: false
            referencedRelation: "long_texts"
            referencedColumns: ["id"]
          },
        ]
      }
      text_video_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_notes: {
        Row: {
          annotation: string
          comment: string | null
          created_at: string
          difficulty: string | null
          id: string
          next_review: string | null
          video_id: string
        }
        Insert: {
          annotation: string
          comment?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          next_review?: string | null
          video_id: string
        }
        Update: {
          annotation?: string
          comment?: string | null
          created_at?: string
          difficulty?: string | null
          id?: string
          next_review?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_notes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          text_video_set_id: string
          title: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          text_video_set_id: string
          title: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          text_video_set_id?: string
          title?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_text_video_set_id_fkey"
            columns: ["text_video_set_id"]
            isOneToOne: false
            referencedRelation: "text_video_sets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
