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
      admin_prospects: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      ads_actions: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          executed_at: string | null
          id: string
          report_id: string | null
          result: string | null
          status: string
          target_id: string | null
          target_name: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          executed_at?: string | null
          id?: string
          report_id?: string | null
          result?: string | null
          status?: string
          target_id?: string | null
          target_name?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          executed_at?: string | null
          id?: string
          report_id?: string | null
          result?: string | null
          status?: string
          target_id?: string | null
          target_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "ads_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_reports: {
        Row: {
          content: string
          created_at: string
          id: string
          report_type: string
          summary: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          report_type: string
          summary?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          report_type?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ads_sync: {
        Row: {
          ad_group_name: string | null
          ad_strength: string | null
          ad_strength_reasons: Json | null
          ad_type: string | null
          campaign_sync_id: string | null
          clicks: number | null
          conversions: number | null
          conversions_value: number | null
          cost_micros: number | null
          created_at: string
          descriptions: Json | null
          final_urls: string[] | null
          google_ad_group_id: string | null
          google_ad_id: string
          headlines: Json | null
          id: string
          impressions: number | null
          last_synced_at: string | null
          path1: string | null
          path2: string | null
          policy_summary: Json | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_group_name?: string | null
          ad_strength?: string | null
          ad_strength_reasons?: Json | null
          ad_type?: string | null
          campaign_sync_id?: string | null
          clicks?: number | null
          conversions?: number | null
          conversions_value?: number | null
          cost_micros?: number | null
          created_at?: string
          descriptions?: Json | null
          final_urls?: string[] | null
          google_ad_group_id?: string | null
          google_ad_id: string
          headlines?: Json | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          path1?: string | null
          path2?: string | null
          policy_summary?: Json | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_group_name?: string | null
          ad_strength?: string | null
          ad_strength_reasons?: Json | null
          ad_type?: string | null
          campaign_sync_id?: string | null
          clicks?: number | null
          conversions?: number | null
          conversions_value?: number | null
          cost_micros?: number | null
          created_at?: string
          descriptions?: Json | null
          final_urls?: string[] | null
          google_ad_group_id?: string | null
          google_ad_id?: string
          headlines?: Json | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          path1?: string | null
          path2?: string | null
          policy_summary?: Json | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_sync_campaign_sync_id_fkey"
            columns: ["campaign_sync_id"]
            isOneToOne: false
            referencedRelation: "campaigns_sync"
            referencedColumns: ["id"]
          },
        ]
      }
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
          gsc_index_error: string | null
          gsc_indexed: boolean | null
          gsc_indexed_at: string | null
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
          gsc_index_error?: string | null
          gsc_indexed?: boolean | null
          gsc_indexed_at?: string | null
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
          gsc_index_error?: string | null
          gsc_indexed?: boolean | null
          gsc_indexed_at?: string | null
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
      campaigns_sync: {
        Row: {
          advertising_channel_type: string | null
          bidding_strategy_type: string | null
          budget_amount_micros: number | null
          budget_resource_name: string | null
          clicks_7d: number | null
          conversions_7d: number | null
          cpc_7d: number | null
          created_at: string
          ctr_7d: number | null
          google_campaign_id: string
          google_customer_id: string | null
          id: string
          impressions_7d: number | null
          last_synced_at: string | null
          name: string
          network_settings: Json | null
          primary_status: string | null
          primary_status_reasons: string[] | null
          revenue_7d: number | null
          roas_7d: number | null
          spend_7d: number | null
          status: string | null
          sync_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advertising_channel_type?: string | null
          bidding_strategy_type?: string | null
          budget_amount_micros?: number | null
          budget_resource_name?: string | null
          clicks_7d?: number | null
          conversions_7d?: number | null
          cpc_7d?: number | null
          created_at?: string
          ctr_7d?: number | null
          google_campaign_id: string
          google_customer_id?: string | null
          id?: string
          impressions_7d?: number | null
          last_synced_at?: string | null
          name?: string
          network_settings?: Json | null
          primary_status?: string | null
          primary_status_reasons?: string[] | null
          revenue_7d?: number | null
          roas_7d?: number | null
          spend_7d?: number | null
          status?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advertising_channel_type?: string | null
          bidding_strategy_type?: string | null
          budget_amount_micros?: number | null
          budget_resource_name?: string | null
          clicks_7d?: number | null
          conversions_7d?: number | null
          cpc_7d?: number | null
          created_at?: string
          ctr_7d?: number | null
          google_campaign_id?: string
          google_customer_id?: string | null
          id?: string
          impressions_7d?: number | null
          last_synced_at?: string | null
          name?: string
          network_settings?: Json | null
          primary_status?: string | null
          primary_status_reasons?: string[] | null
          revenue_7d?: number | null
          roas_7d?: number | null
          spend_7d?: number | null
          status?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      carts: {
        Row: {
          abandoned_at: string | null
          abandoned_email_sent: boolean | null
          billing_cycle: string | null
          converted_at: string | null
          created_at: string
          currency: string | null
          final_email_sent: boolean | null
          final_email_sent_at: string | null
          id: string
          items: Json
          promo_email_sent: boolean | null
          promo_email_sent_at: string | null
          session_id: string | null
          status: string | null
          total_amount: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          abandoned_at?: string | null
          abandoned_email_sent?: boolean | null
          billing_cycle?: string | null
          converted_at?: string | null
          created_at?: string
          currency?: string | null
          final_email_sent?: boolean | null
          final_email_sent_at?: string | null
          id?: string
          items?: Json
          promo_email_sent?: boolean | null
          promo_email_sent_at?: string | null
          session_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          abandoned_at?: string | null
          abandoned_email_sent?: boolean | null
          billing_cycle?: string | null
          converted_at?: string | null
          created_at?: string
          currency?: string | null
          final_email_sent?: boolean | null
          final_email_sent_at?: string | null
          id?: string
          items?: Json
          promo_email_sent?: boolean | null
          promo_email_sent_at?: string | null
          session_id?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      geo_contents: {
        Row: {
          brand: string
          content: string | null
          content_type: string | null
          created_at: string
          html_content: string | null
          id: string
          is_public: boolean | null
          keywords: string[] | null
          meta_description: string | null
          project_id: string
          published_at: string | null
          published_url: string | null
          scheduled_date: string | null
          score: number | null
          slug: string | null
          title: string | null
          topic: string
          updated_at: string
          website: string | null
        }
        Insert: {
          brand: string
          content?: string | null
          content_type?: string | null
          created_at?: string
          html_content?: string | null
          id?: string
          is_public?: boolean | null
          keywords?: string[] | null
          meta_description?: string | null
          project_id: string
          published_at?: string | null
          published_url?: string | null
          scheduled_date?: string | null
          score?: number | null
          slug?: string | null
          title?: string | null
          topic: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          brand?: string
          content?: string | null
          content_type?: string | null
          created_at?: string
          html_content?: string | null
          id?: string
          is_public?: boolean | null
          keywords?: string[] | null
          meta_description?: string | null
          project_id?: string
          published_at?: string | null
          published_url?: string | null
          scheduled_date?: string | null
          score?: number | null
          slug?: string | null
          title?: string | null
          topic?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geo_contents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_accounts: {
        Row: {
          access_token: string | null
          account_name: string | null
          created_at: string
          customer_id: string
          id: string
          is_active: boolean | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_name?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_name?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_ads_ad_groups: {
        Row: {
          ai_generated: boolean | null
          campaign_id: string
          cpc_bid: number | null
          created_at: string
          google_ad_group_id: string | null
          id: string
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          campaign_id: string
          cpc_bid?: number | null
          created_at?: string
          google_ad_group_id?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          campaign_id?: string
          cpc_bid?: number | null
          created_at?: string
          google_ad_group_id?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_ad_groups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "google_ads_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_ads: {
        Row: {
          ad_group_id: string
          ai_generated: boolean | null
          created_at: string
          descriptions: string[]
          final_urls: string[]
          google_ad_id: string | null
          headlines: string[]
          id: string
          path1: string | null
          path2: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ad_group_id: string
          ai_generated?: boolean | null
          created_at?: string
          descriptions?: string[]
          final_urls?: string[]
          google_ad_id?: string | null
          headlines?: string[]
          id?: string
          path1?: string | null
          path2?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ad_group_id?: string
          ai_generated?: boolean | null
          created_at?: string
          descriptions?: string[]
          final_urls?: string[]
          google_ad_id?: string | null
          headlines?: string[]
          id?: string
          path1?: string | null
          path2?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_ads_ad_group_id_fkey"
            columns: ["ad_group_id"]
            isOneToOne: false
            referencedRelation: "google_ads_ad_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_campaigns: {
        Row: {
          account_id: string
          ai_generated: boolean | null
          ai_prompt: string | null
          bidding_strategy: string | null
          budget_amount: number | null
          budget_currency: string | null
          campaign_type: string | null
          created_at: string
          end_date: string | null
          google_campaign_id: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          target_languages: string[] | null
          target_locations: string[] | null
          updated_at: string
        }
        Insert: {
          account_id: string
          ai_generated?: boolean | null
          ai_prompt?: string | null
          bidding_strategy?: string | null
          budget_amount?: number | null
          budget_currency?: string | null
          campaign_type?: string | null
          created_at?: string
          end_date?: string | null
          google_campaign_id?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          target_languages?: string[] | null
          target_locations?: string[] | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          ai_generated?: boolean | null
          ai_prompt?: string | null
          bidding_strategy?: string | null
          budget_amount?: number | null
          budget_currency?: string | null
          campaign_type?: string | null
          created_at?: string
          end_date?: string | null
          google_campaign_id?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          target_languages?: string[] | null
          target_locations?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "google_ads_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_keywords: {
        Row: {
          ad_group_id: string
          ai_generated: boolean | null
          cpc_bid: number | null
          created_at: string
          id: string
          is_negative: boolean | null
          keyword: string
          match_type: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ad_group_id: string
          ai_generated?: boolean | null
          cpc_bid?: number | null
          created_at?: string
          id?: string
          is_negative?: boolean | null
          keyword: string
          match_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ad_group_id?: string
          ai_generated?: boolean | null
          cpc_bid?: number | null
          created_at?: string
          id?: string
          is_negative?: boolean | null
          keyword?: string
          match_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_keywords_ad_group_id_fkey"
            columns: ["ad_group_id"]
            isOneToOne: false
            referencedRelation: "google_ads_ad_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      google_search_console_data: {
        Row: {
          clicks: number | null
          created_at: string | null
          ctr: number | null
          date: string
          domain: string
          id: string
          impressions: number | null
          position: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clicks?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          domain: string
          id?: string
          impressions?: number | null
          position?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clicks?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          domain?: string
          id?: string
          impressions?: number | null
          position?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_search_console_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      gsc_alerts: {
        Row: {
          change_percentage: number
          created_at: string | null
          current_value: number
          detection_date: string | null
          domain: string
          id: string
          is_read: boolean | null
          is_resolved: boolean | null
          metric_name: string
          previous_value: number
          resolved_at: string | null
          severity: string | null
          user_id: string
        }
        Insert: {
          change_percentage: number
          created_at?: string | null
          current_value: number
          detection_date?: string | null
          domain: string
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          metric_name: string
          previous_value: number
          resolved_at?: string | null
          severity?: string | null
          user_id: string
        }
        Update: {
          change_percentage?: number
          created_at?: string | null
          current_value?: number
          detection_date?: string | null
          domain?: string
          id?: string
          is_read?: boolean | null
          is_resolved?: boolean | null
          metric_name?: string
          previous_value?: number
          resolved_at?: string | null
          severity?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gsc_sync_config: {
        Row: {
          auto_sync_enabled: boolean | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          notification_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          notification_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          notification_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      keywords_sync: {
        Row: {
          ad_group_name: string | null
          approval_status: string | null
          campaign_sync_id: string | null
          clicks: number | null
          conversions: number | null
          conversions_value: number | null
          cost_micros: number | null
          cpc_bid_micros: number | null
          created_at: string
          effective_cpc_bid_micros: number | null
          first_page_cpc_micros: number | null
          google_ad_group_id: string | null
          google_keyword_id: string
          id: string
          impressions: number | null
          keyword_text: string
          last_synced_at: string | null
          match_type: string | null
          quality_score: number | null
          quality_score_creative: string | null
          quality_score_expected_ctr: string | null
          quality_score_landing: string | null
          status: string | null
          system_serving_status: string | null
          top_of_page_cpc_micros: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_group_name?: string | null
          approval_status?: string | null
          campaign_sync_id?: string | null
          clicks?: number | null
          conversions?: number | null
          conversions_value?: number | null
          cost_micros?: number | null
          cpc_bid_micros?: number | null
          created_at?: string
          effective_cpc_bid_micros?: number | null
          first_page_cpc_micros?: number | null
          google_ad_group_id?: string | null
          google_keyword_id: string
          id?: string
          impressions?: number | null
          keyword_text?: string
          last_synced_at?: string | null
          match_type?: string | null
          quality_score?: number | null
          quality_score_creative?: string | null
          quality_score_expected_ctr?: string | null
          quality_score_landing?: string | null
          status?: string | null
          system_serving_status?: string | null
          top_of_page_cpc_micros?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_group_name?: string | null
          approval_status?: string | null
          campaign_sync_id?: string | null
          clicks?: number | null
          conversions?: number | null
          conversions_value?: number | null
          cost_micros?: number | null
          cpc_bid_micros?: number | null
          created_at?: string
          effective_cpc_bid_micros?: number | null
          first_page_cpc_micros?: number | null
          google_ad_group_id?: string | null
          google_keyword_id?: string
          id?: string
          impressions?: number | null
          keyword_text?: string
          last_synced_at?: string | null
          match_type?: string | null
          quality_score?: number | null
          quality_score_creative?: string | null
          quality_score_expected_ctr?: string | null
          quality_score_landing?: string | null
          status?: string | null
          system_serving_status?: string | null
          top_of_page_cpc_micros?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keywords_sync_campaign_sync_id_fkey"
            columns: ["campaign_sync_id"]
            isOneToOne: false
            referencedRelation: "campaigns_sync"
            referencedColumns: ["id"]
          },
        ]
      }
      local_answers: {
        Row: {
          answer: string
          business_id: string
          business_name: string
          created_at: string
          id: string
          is_public: boolean | null
          language: string | null
          project_id: string
          published_at: string | null
          published_url: string | null
          question: string
          scheduled_date: string | null
          score: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          answer: string
          business_id: string
          business_name: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          language?: string | null
          project_id: string
          published_at?: string | null
          published_url?: string | null
          question: string
          scheduled_date?: string | null
          score?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          answer?: string
          business_id?: string
          business_name?: string
          created_at?: string
          id?: string
          is_public?: boolean | null
          language?: string | null
          project_id?: string
          published_at?: string | null
          published_url?: string | null
          question?: string
          scheduled_date?: string | null
          score?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_answers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      local_businesses: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          place_id: string
          project_id: string
          rating: number | null
          review_count: number | null
          types: string[] | null
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          place_id: string
          project_id: string
          rating?: number | null
          review_count?: number | null
          types?: string[] | null
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          place_id?: string
          project_id?: string
          rating?: number | null
          review_count?: number | null
          types?: string[] | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_businesses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_sessions: {
        Row: {
          abandoned_email_sent: boolean | null
          abandoned_email_sent_at: string | null
          audiences: string[] | null
          brand_name: string | null
          business_description: string | null
          checkout_started_at: string | null
          cms: string | null
          competitors: string[] | null
          completed_at: string | null
          converted_at: string | null
          created_at: string
          current_step: number | null
          device_type: string | null
          email: string | null
          final_email_sent: boolean | null
          final_email_sent_at: string | null
          id: string
          keywords: Json | null
          language: string | null
          promo_email_sent: boolean | null
          promo_email_sent_at: string | null
          referrer: string | null
          session_id: string
          traffic_potential: number | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
          website_url: string | null
        }
        Insert: {
          abandoned_email_sent?: boolean | null
          abandoned_email_sent_at?: string | null
          audiences?: string[] | null
          brand_name?: string | null
          business_description?: string | null
          checkout_started_at?: string | null
          cms?: string | null
          competitors?: string[] | null
          completed_at?: string | null
          converted_at?: string | null
          created_at?: string
          current_step?: number | null
          device_type?: string | null
          email?: string | null
          final_email_sent?: boolean | null
          final_email_sent_at?: string | null
          id?: string
          keywords?: Json | null
          language?: string | null
          promo_email_sent?: boolean | null
          promo_email_sent_at?: string | null
          referrer?: string | null
          session_id: string
          traffic_potential?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
          website_url?: string | null
        }
        Update: {
          abandoned_email_sent?: boolean | null
          abandoned_email_sent_at?: string | null
          audiences?: string[] | null
          brand_name?: string | null
          business_description?: string | null
          checkout_started_at?: string | null
          cms?: string | null
          competitors?: string[] | null
          completed_at?: string | null
          converted_at?: string | null
          created_at?: string
          current_step?: number | null
          device_type?: string | null
          email?: string | null
          final_email_sent?: boolean | null
          final_email_sent_at?: string | null
          id?: string
          keywords?: Json | null
          language?: string | null
          promo_email_sent?: boolean | null
          promo_email_sent_at?: string | null
          referrer?: string | null
          session_id?: string
          traffic_potential?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          page_path: string
          page_title: string | null
          scroll_depth: number | null
          session_id: string
          time_on_page_seconds: number | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          page_title?: string | null
          scroll_depth?: number | null
          session_id: string
          time_on_page_seconds?: number | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          page_title?: string | null
          scroll_depth?: number | null
          session_id?: string
          time_on_page_seconds?: number | null
          visitor_id?: string
        }
        Relationships: []
      }
      performance_history: {
        Row: {
          campaign_sync_id: string | null
          clicks: number | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          revenue: number | null
          roas: number | null
          spend: number | null
          user_id: string
        }
        Insert: {
          campaign_sync_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          user_id: string
        }
        Update: {
          campaign_sync_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_history_campaign_sync_id_fkey"
            columns: ["campaign_sync_id"]
            isOneToOne: false
            referencedRelation: "campaigns_sync"
            referencedColumns: ["id"]
          },
        ]
      }
      planning: {
        Row: {
          answer_id: string | null
          article_id: string | null
          created_at: string
          day: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          answer_id?: string | null
          article_id?: string | null
          created_at?: string
          day: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          answer_id?: string | null
          article_id?: string | null
          created_at?: string
          day?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_days: {
        Row: {
          answer_id: string
          article_id: string
          created_at: string
          id: string
          project_id: string
          scheduled_date: string
          updated_at: string
        }
        Insert: {
          answer_id: string
          article_id: string
          created_at?: string
          id?: string
          project_id: string
          scheduled_date: string
          updated_at?: string
        }
        Update: {
          answer_id?: string
          article_id?: string
          created_at?: string
          id?: string
          project_id?: string
          scheduled_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_days_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_days_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_days_project_id_fkey"
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
          google_console_email: string | null
          google_oauth_token: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          google_console_email?: string | null
          google_oauth_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          google_console_email?: string | null
          google_oauth_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
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
          auto_publish_enabled: boolean | null
          citations_region: string | null
          created_at: string | null
          cta_link: string | null
          english_type: string | null
          gsc_analysis_period: number | null
          gsc_selected_domain: string | null
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
          publish_frequency: string | null
          publish_hour: string | null
          special_instructions: string | null
          text_overlay: boolean | null
          timezone: string | null
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
          auto_publish_enabled?: boolean | null
          citations_region?: string | null
          created_at?: string | null
          cta_link?: string | null
          english_type?: string | null
          gsc_analysis_period?: number | null
          gsc_selected_domain?: string | null
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
          publish_frequency?: string | null
          publish_hour?: string | null
          special_instructions?: string | null
          text_overlay?: boolean | null
          timezone?: string | null
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
          auto_publish_enabled?: boolean | null
          citations_region?: string | null
          created_at?: string | null
          cta_link?: string | null
          english_type?: string | null
          gsc_analysis_period?: number | null
          gsc_selected_domain?: string | null
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
          publish_frequency?: string | null
          publish_hour?: string | null
          special_instructions?: string | null
          text_overlay?: boolean | null
          timezone?: string | null
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
      published_articles: {
        Row: {
          author: string | null
          body: string
          created_at: string
          gsc_index_error: string | null
          gsc_indexed: boolean | null
          gsc_indexed_at: string | null
          id: string
          meta_description: string | null
          published_at: string
          slug: string
          source_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          body: string
          created_at?: string
          gsc_index_error?: string | null
          gsc_indexed?: boolean | null
          gsc_indexed_at?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string
          slug: string
          source_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          body?: string
          created_at?: string
          gsc_index_error?: string | null
          gsc_indexed?: boolean | null
          gsc_indexed_at?: string | null
          id?: string
          meta_description?: string | null
          published_at?: string
          slug?: string
          source_id?: string | null
          title?: string
          updated_at?: string
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
      reports: {
        Row: {
          company_info: Json | null
          created_at: string | null
          id: string
          kpi_tracking: Json | null
          macro_analysis: Json | null
          micro_analysis: Json | null
          recommendations: Json | null
          scores: Json | null
          slug: string
          updated_at: string | null
          url: string
        }
        Insert: {
          company_info?: Json | null
          created_at?: string | null
          id?: string
          kpi_tracking?: Json | null
          macro_analysis?: Json | null
          micro_analysis?: Json | null
          recommendations?: Json | null
          scores?: Json | null
          slug: string
          updated_at?: string | null
          url: string
        }
        Update: {
          company_info?: Json | null
          created_at?: string | null
          id?: string
          kpi_tracking?: Json | null
          macro_analysis?: Json | null
          micro_analysis?: Json | null
          recommendations?: Json | null
          scores?: Json | null
          slug?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      shopping_feeds: {
        Row: {
          created_at: string
          feed_type: string | null
          feed_url: string | null
          id: string
          last_synced_at: string | null
          product_count: number | null
          project_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          feed_type?: string | null
          feed_url?: string | null
          id?: string
          last_synced_at?: string | null
          product_count?: number | null
          project_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          feed_type?: string | null
          feed_url?: string | null
          id?: string
          last_synced_at?: string | null
          product_count?: number | null
          project_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_feeds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_planning: {
        Row: {
          created_at: string
          id: string
          product_id: string
          project_id: string
          published: boolean | null
          published_at: string | null
          scheduled_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          project_id: string
          published?: boolean | null
          published_at?: string | null
          scheduled_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          project_id?: string
          published?: boolean | null
          published_at?: string | null
          scheduled_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_planning_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopping_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_planning_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_products: {
        Row: {
          ai_description: string | null
          ai_faq: Json | null
          ai_schema_markup: Json | null
          ai_score: number | null
          ai_title: string | null
          availability: string | null
          brand: string | null
          category: string | null
          condition: string | null
          created_at: string
          currency: string | null
          description: string | null
          feed_item_id: string | null
          gtin: string | null
          id: string
          image_url: string | null
          language: string | null
          mpn: string | null
          price: number | null
          product_url: string | null
          project_id: string
          published_at: string | null
          published_url: string | null
          scheduled_date: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_description?: string | null
          ai_faq?: Json | null
          ai_schema_markup?: Json | null
          ai_score?: number | null
          ai_title?: string | null
          availability?: string | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          feed_item_id?: string | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          mpn?: string | null
          price?: number | null
          product_url?: string | null
          project_id: string
          published_at?: string | null
          published_url?: string | null
          scheduled_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_description?: string | null
          ai_faq?: Json | null
          ai_schema_markup?: Json | null
          ai_score?: number | null
          ai_title?: string | null
          availability?: string | null
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          feed_item_id?: string | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          mpn?: string | null
          price?: number | null
          product_url?: string | null
          project_id?: string
          published_at?: string | null
          published_url?: string | null
          scheduled_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_audits: {
        Row: {
          created_at: string
          domain: string
          email: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          page_title: string | null
          project_id: string | null
          results: Json
          scores: Json
          summary: Json
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          domain: string
          email?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          page_title?: string | null
          project_id?: string | null
          results?: Json
          scores?: Json
          summary?: Json
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          domain?: string
          email?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          page_title?: string | null
          project_id?: string | null
          results?: Json
          scores?: Json
          summary?: Json
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          created_at: string
          id: string
          last_crawled_at: string | null
          meta_description: string | null
          project_id: string
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_crawled_at?: string | null
          meta_description?: string | null
          project_id: string
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          last_crawled_at?: string | null
          meta_description?: string | null
          project_id?: string
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_status: {
        Row: {
          auto_sync_enabled: boolean | null
          created_at: string
          id: string
          last_full_sync_at: string | null
          last_full_sync_error: string | null
          last_full_sync_status: string | null
          total_ads: number | null
          total_campaigns: number | null
          total_keywords: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          created_at?: string
          id?: string
          last_full_sync_at?: string | null
          last_full_sync_error?: string | null
          last_full_sync_status?: string | null
          total_ads?: number | null
          total_campaigns?: number | null
          total_keywords?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean | null
          created_at?: string
          id?: string
          last_full_sync_at?: string | null
          last_full_sync_error?: string | null
          last_full_sync_status?: string | null
          total_ads?: number | null
          total_campaigns?: number | null
          total_keywords?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_connections: {
        Row: {
          access_token: string | null
          account_id: string | null
          connection_type: string
          created_at: string
          id: string
          metadata: Json | null
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          connection_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          connection_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          browser: string | null
          converted: boolean | null
          converted_at: string | null
          created_at: string
          device_type: string | null
          fb_ad_id: string | null
          fb_adset_id: string | null
          fb_campaign_id: string | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip_address: string | null
          is_bounce: boolean | null
          landing_page: string | null
          language: string | null
          last_page: string | null
          os: string | null
          page_views: number | null
          referrer: string | null
          screen_resolution: string | null
          session_duration_seconds: number | null
          session_id: string
          timezone: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          device_type?: string | null
          fb_ad_id?: string | null
          fb_adset_id?: string | null
          fb_campaign_id?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip_address?: string | null
          is_bounce?: boolean | null
          landing_page?: string | null
          language?: string | null
          last_page?: string | null
          os?: string | null
          page_views?: number | null
          referrer?: string | null
          screen_resolution?: string | null
          session_duration_seconds?: number | null
          session_id: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          device_type?: string | null
          fb_ad_id?: string | null
          fb_adset_id?: string | null
          fb_campaign_id?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip_address?: string | null
          is_bounce?: boolean | null
          landing_page?: string | null
          language?: string | null
          last_page?: string | null
          os?: string | null
          page_views?: number | null
          referrer?: string | null
          screen_resolution?: string | null
          session_duration_seconds?: number | null
          session_id?: string
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_planning_completeness: {
        Args: { p_project_id: string }
        Returns: {
          filled_days: number
          is_today_filled: boolean
          missing_dates: string[]
          total_days: number
        }[]
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { p_user_id: string }; Returns: boolean }
      project_has_public_answers: {
        Args: { p_project_id: string }
        Returns: boolean
      }
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
