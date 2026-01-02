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
      answers: {
        Row: {
          answer: string
          article_id: string | null
          created_at: string | null
          difficulty: string | null
          has_article: boolean | null
          high_citation: boolean | null
          id: string
          intent: string | null
          is_public: boolean | null
          platforms: string[] | null
          project_id: string
          published_at: string | null
          published_url: string | null
          question: string
          scheduled_date: string | null
          score: number | null
          slug: string
          supporting_content: Json | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          article_id?: string | null
          created_at?: string | null
          difficulty?: string | null
          has_article?: boolean | null
          high_citation?: boolean | null
          id?: string
          intent?: string | null
          is_public?: boolean | null
          platforms?: string[] | null
          project_id: string
          published_at?: string | null
          published_url?: string | null
          question: string
          scheduled_date?: string | null
          score?: number | null
          slug: string
          supporting_content?: Json | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          article_id?: string | null
          created_at?: string | null
          difficulty?: string | null
          has_article?: boolean | null
          high_citation?: boolean | null
          id?: string
          intent?: string | null
          is_public?: boolean | null
          platforms?: string[] | null
          project_id?: string
          published_at?: string | null
          published_url?: string | null
          question?: string
          scheduled_date?: string | null
          score?: number | null
          slug?: string
          supporting_content?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          aeo_score: number | null
          content: string | null
          created_at: string | null
          html_content: string | null
          id: string
          keywords: string[] | null
          linked_answer_id: string | null
          meta_description: string | null
          project_id: string
          scheduled_date: string | null
          slug: string | null
          status: string | null
          title: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          aeo_score?: number | null
          content?: string | null
          created_at?: string | null
          html_content?: string | null
          id?: string
          keywords?: string[] | null
          linked_answer_id?: string | null
          meta_description?: string | null
          project_id: string
          scheduled_date?: string | null
          slug?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          aeo_score?: number | null
          content?: string | null
          created_at?: string | null
          html_content?: string | null
          id?: string
          keywords?: string[] | null
          linked_answer_id?: string | null
          meta_description?: string | null
          project_id?: string
          scheduled_date?: string | null
          slug?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_linked_answer_id_fkey"
            columns: ["linked_answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          created_at: string | null
          credits_total: number | null
          credits_used: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_total?: number | null
          credits_used?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_total?: number | null
          credits_used?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      generation_settings: {
        Row: {
          answer_length: string | null
          brand_color: string | null
          brand_name: string | null
          business_description: string | null
          competitors: string[] | null
          created_at: string
          example_url: string | null
          id: string
          include_citations: boolean | null
          language: string
          project_id: string
          referral_source: string | null
          target_audiences: string[] | null
          target_platforms: string[] | null
          tone: string | null
          updated_at: string
          website_url: string
        }
        Insert: {
          answer_length?: string | null
          brand_color?: string | null
          brand_name?: string | null
          business_description?: string | null
          competitors?: string[] | null
          created_at?: string
          example_url?: string | null
          id?: string
          include_citations?: boolean | null
          language?: string
          project_id: string
          referral_source?: string | null
          target_audiences?: string[] | null
          target_platforms?: string[] | null
          tone?: string | null
          updated_at?: string
          website_url: string
        }
        Update: {
          answer_length?: string | null
          brand_color?: string | null
          brand_name?: string | null
          business_description?: string | null
          competitors?: string[] | null
          created_at?: string
          example_url?: string | null
          id?: string
          include_citations?: boolean | null
          language?: string
          project_id?: string
          referral_source?: string | null
          target_audiences?: string[] | null
          target_platforms?: string[] | null
          tone?: string | null
          updated_at?: string
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_connected: boolean | null
          platform: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          platform: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          platform?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number | null
          billing_date: string | null
          created_at: string | null
          currency: string | null
          id: string
          pdf_url: string | null
          status: string | null
          stripe_invoice_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          billing_date?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          pdf_url?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          billing_date?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          pdf_url?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      keywords: {
        Row: {
          created_at: string | null
          difficulty: number | null
          id: string
          intent: string | null
          is_used: boolean | null
          keyword: string
          project_id: string
          search_volume: number | null
          source_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty?: number | null
          id?: string
          intent?: string | null
          is_used?: boolean | null
          keyword: string
          project_id: string
          search_volume?: number | null
          source_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty?: number | null
          id?: string
          intent?: string | null
          is_used?: boolean | null
          keyword?: string
          project_id?: string
          search_volume?: number | null
          source_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keywords_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_settings: {
        Row: {
          article_length: number | null
          article_schedule: string[] | null
          article_types: string | null
          auto_publish: boolean | null
          citations_region: string | null
          created_at: string | null
          cta_link: string | null
          english_type: string | null
          id: string
          image_style: string | null
          include_citations: boolean | null
          include_internal_links: boolean | null
          include_schema: boolean | null
          include_screenshot: boolean | null
          include_summary: boolean | null
          include_toc: boolean | null
          include_youtube: boolean | null
          project_id: string
          special_instructions: string | null
          text_overlay: boolean | null
          trailing_slash: boolean | null
          updated_at: string | null
          visual_instructions: string | null
          www_prefix: boolean | null
        }
        Insert: {
          article_length?: number | null
          article_schedule?: string[] | null
          article_types?: string | null
          auto_publish?: boolean | null
          citations_region?: string | null
          created_at?: string | null
          cta_link?: string | null
          english_type?: string | null
          id?: string
          image_style?: string | null
          include_citations?: boolean | null
          include_internal_links?: boolean | null
          include_schema?: boolean | null
          include_screenshot?: boolean | null
          include_summary?: boolean | null
          include_toc?: boolean | null
          include_youtube?: boolean | null
          project_id: string
          special_instructions?: string | null
          text_overlay?: boolean | null
          trailing_slash?: boolean | null
          updated_at?: string | null
          visual_instructions?: string | null
          www_prefix?: boolean | null
        }
        Update: {
          article_length?: number | null
          article_schedule?: string[] | null
          article_types?: string | null
          auto_publish?: boolean | null
          citations_region?: string | null
          created_at?: string | null
          cta_link?: string | null
          english_type?: string | null
          id?: string
          image_style?: string | null
          include_citations?: boolean | null
          include_internal_links?: boolean | null
          include_schema?: boolean | null
          include_screenshot?: boolean | null
          include_summary?: boolean | null
          include_toc?: boolean | null
          include_youtube?: boolean | null
          project_id?: string
          special_instructions?: string | null
          text_overlay?: boolean | null
          trailing_slash?: boolean | null
          updated_at?: string | null
          visual_instructions?: string | null
          www_prefix?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          audience: string | null
          brand_color: string | null
          brand_name: string | null
          brand_voice_url: string | null
          business_description: string | null
          business_type: string | null
          competitors: string[] | null
          created_at: string | null
          domain: string | null
          example_url: string | null
          id: string
          is_active: boolean | null
          language: string
          name: string
          sitemap_url: string | null
          updated_at: string | null
          user_id: string
          website_url: string
        }
        Insert: {
          audience?: string | null
          brand_color?: string | null
          brand_name?: string | null
          brand_voice_url?: string | null
          business_description?: string | null
          business_type?: string | null
          competitors?: string[] | null
          created_at?: string | null
          domain?: string | null
          example_url?: string | null
          id?: string
          is_active?: boolean | null
          language?: string
          name: string
          sitemap_url?: string | null
          updated_at?: string | null
          user_id: string
          website_url: string
        }
        Update: {
          audience?: string | null
          brand_color?: string | null
          brand_name?: string | null
          brand_voice_url?: string | null
          business_description?: string | null
          business_type?: string | null
          competitors?: string[] | null
          created_at?: string | null
          domain?: string | null
          example_url?: string | null
          id?: string
          is_active?: boolean | null
          language?: string
          name?: string
          sitemap_url?: string | null
          updated_at?: string | null
          user_id?: string
          website_url?: string
        }
        Relationships: []
      }
      reddit_responses: {
        Row: {
          brand_mentioned: boolean | null
          created_at: string | null
          generated_reply: string
          id: string
          is_posted_to_reddit: boolean | null
          is_shared: boolean | null
          link_included: boolean | null
          linked_answer_id: string | null
          original_question: string | null
          project_id: string
          reddit_post_title: string
          reddit_post_url: string
          reply_mode: string | null
          subreddit: string
          updated_at: string | null
        }
        Insert: {
          brand_mentioned?: boolean | null
          created_at?: string | null
          generated_reply: string
          id?: string
          is_posted_to_reddit?: boolean | null
          is_shared?: boolean | null
          link_included?: boolean | null
          linked_answer_id?: string | null
          original_question?: string | null
          project_id: string
          reddit_post_title: string
          reddit_post_url: string
          reply_mode?: string | null
          subreddit: string
          updated_at?: string | null
        }
        Update: {
          brand_mentioned?: boolean | null
          created_at?: string | null
          generated_reply?: string
          id?: string
          is_posted_to_reddit?: boolean | null
          is_shared?: boolean | null
          link_included?: boolean | null
          linked_answer_id?: string | null
          original_question?: string | null
          project_id?: string
          reddit_post_title?: string
          reddit_post_url?: string
          reply_mode?: string | null
          subreddit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reddit_responses_linked_answer_id_fkey"
            columns: ["linked_answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reddit_responses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          invited_email: string | null
          project_id: string
          role: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_email?: string | null
          project_id: string
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_email?: string | null
          project_id?: string
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
