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
      ambiguous_words: {
        Row: {
          category: string
          created_at: string
          id: number
          notes: string | null
          severity: string
          updated_at: string
          word: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: number
          notes?: string | null
          severity?: string
          updated_at?: string
          word: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: number
          notes?: string | null
          severity?: string
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bulk_composition_batches: {
        Row: {
          appeal_axes_snapshot: Json | null
          completed_at: string | null
          completed_count: number | null
          created_at: string | null
          created_by: string | null
          duration_seconds: number | null
          failed_count: number | null
          id: string
          na_script_job_ids: string[]
          project_id: string
          spot_job_ids: string[] | null
          status: string | null
          storyboard_job_ids: string[]
          total_count: number
          updated_at: string | null
          with_na_script: boolean
          with_storyboard_images: boolean
        }
        Insert: {
          appeal_axes_snapshot?: Json | null
          completed_at?: string | null
          completed_count?: number | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          failed_count?: number | null
          id?: string
          na_script_job_ids?: string[]
          project_id: string
          spot_job_ids?: string[] | null
          status?: string | null
          storyboard_job_ids?: string[]
          total_count: number
          updated_at?: string | null
          with_na_script?: boolean
          with_storyboard_images?: boolean
        }
        Update: {
          appeal_axes_snapshot?: Json | null
          completed_at?: string | null
          completed_count?: number | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          failed_count?: number | null
          id?: string
          na_script_job_ids?: string[]
          project_id?: string
          spot_job_ids?: string[] | null
          status?: string | null
          storyboard_job_ids?: string[]
          total_count?: number
          updated_at?: string | null
          with_na_script?: boolean
          with_storyboard_images?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bulk_composition_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      check_feedback: {
        Row: {
          ai_judgment: string
          check_result_id: string | null
          created_at: string
          created_by: string | null
          feedback_type: string
          human_judgment: string
          id: string
          is_active: boolean
          item_description: string
          matched_rule_uuid: string | null
          process_type: string
          product_id: string
          project_id: string | null
          reason: string | null
          rule_pattern_id: string | null
          scope: string
          updated_at: string
        }
        Insert: {
          ai_judgment: string
          check_result_id?: string | null
          created_at?: string
          created_by?: string | null
          feedback_type?: string
          human_judgment: string
          id?: string
          is_active?: boolean
          item_description: string
          matched_rule_uuid?: string | null
          process_type: string
          product_id: string
          project_id?: string | null
          reason?: string | null
          rule_pattern_id?: string | null
          scope?: string
          updated_at?: string
        }
        Update: {
          ai_judgment?: string
          check_result_id?: string | null
          created_at?: string
          created_by?: string | null
          feedback_type?: string
          human_judgment?: string
          id?: string
          is_active?: boolean
          item_description?: string
          matched_rule_uuid?: string | null
          process_type?: string
          product_id?: string
          project_id?: string | null
          reason?: string | null
          rule_pattern_id?: string | null
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_feedback_check_result_id_fkey"
            columns: ["check_result_id"]
            isOneToOne: false
            referencedRelation: "check_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_feedback_matched_rule_uuid_fkey"
            columns: ["matched_rule_uuid"]
            isOneToOne: false
            referencedRelation: "check_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_feedback_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_feedback_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_check_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      check_results: {
        Row: {
          check_items: Json | null
          check_type: string
          client_name: string
          comparison_round: number
          created_at: string | null
          detected_case: string | null
          id: string
          input_data: Json | null
          input_text: string | null
          input_type: string
          ng_count: number | null
          ok_count: number | null
          overall_status: string | null
          parent_check_result_id: string | null
          process_type: string
          product_code: string
          product_name: string
          raw_response: Json | null
          resolved_items: Json | null
          status: string | null
          total_checks: number | null
          updated_at: string | null
          user_id: string
          warning_count: number | null
        }
        Insert: {
          check_items?: Json | null
          check_type?: string
          client_name: string
          comparison_round?: number
          created_at?: string | null
          detected_case?: string | null
          id?: string
          input_data?: Json | null
          input_text?: string | null
          input_type: string
          ng_count?: number | null
          ok_count?: number | null
          overall_status?: string | null
          parent_check_result_id?: string | null
          process_type: string
          product_code: string
          product_name: string
          raw_response?: Json | null
          resolved_items?: Json | null
          status?: string | null
          total_checks?: number | null
          updated_at?: string | null
          user_id: string
          warning_count?: number | null
        }
        Update: {
          check_items?: Json | null
          check_type?: string
          client_name?: string
          comparison_round?: number
          created_at?: string | null
          detected_case?: string | null
          id?: string
          input_data?: Json | null
          input_text?: string | null
          input_type?: string
          ng_count?: number | null
          ok_count?: number | null
          overall_status?: string | null
          parent_check_result_id?: string | null
          process_type?: string
          product_code?: string
          product_name?: string
          raw_response?: Json | null
          resolved_items?: Json | null
          status?: string | null
          total_checks?: number | null
          updated_at?: string | null
          user_id?: string
          warning_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "check_results_parent_check_result_id_fkey"
            columns: ["parent_check_result_id"]
            isOneToOne: false
            referencedRelation: "check_results"
            referencedColumns: ["id"]
          },
        ]
      }
      check_rules: {
        Row: {
          auto_deactivated_at: string | null
          category: string
          client_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          false_positive_count: number | null
          id: string
          improved_description: string | null
          is_active: boolean | null
          is_auto_generated: boolean | null
          is_quality_ok: boolean
          process_type: string
          product_id: string
          project_id: string | null
          quality_checked_at: string | null
          quality_issues: Json
          quality_reason: string | null
          quality_status: string | null
          rule_id: string
          scope: string
          severity: string
          sort_order: number | null
          source_correction_count: number | null
          source_correction_id: string | null
          source_material_id: string | null
          source_material_type: string | null
          source_reference_id: string | null
          source_type: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_deactivated_at?: string | null
          category: string
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          false_positive_count?: number | null
          id?: string
          improved_description?: string | null
          is_active?: boolean | null
          is_auto_generated?: boolean | null
          is_quality_ok?: boolean
          process_type: string
          product_id: string
          project_id?: string | null
          quality_checked_at?: string | null
          quality_issues?: Json
          quality_reason?: string | null
          quality_status?: string | null
          rule_id: string
          scope?: string
          severity?: string
          sort_order?: number | null
          source_correction_count?: number | null
          source_correction_id?: string | null
          source_material_id?: string | null
          source_material_type?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_deactivated_at?: string | null
          category?: string
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          false_positive_count?: number | null
          id?: string
          improved_description?: string | null
          is_active?: boolean | null
          is_auto_generated?: boolean | null
          is_quality_ok?: boolean
          process_type?: string
          product_id?: string
          project_id?: string | null
          quality_checked_at?: string | null
          quality_issues?: Json
          quality_reason?: string | null
          quality_status?: string | null
          rule_id?: string
          scope?: string
          severity?: string
          sort_order?: number | null
          source_correction_count?: number | null
          source_correction_id?: string | null
          source_material_id?: string | null
          source_material_type?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_check_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_rules_source_reference_id_fkey"
            columns: ["source_reference_id"]
            isOneToOne: false
            referencedRelation: "reference_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          created_at: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          annotation_data: Json | null
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          author_email: string
          author_name: string
          check_item_id: string | null
          check_result_id: string
          content: string
          created_at: string
          id: string
          media_timestamp: number | null
          mentions: string[] | null
          parent_id: string | null
          status: string
        }
        Insert: {
          annotation_data?: Json | null
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          author_email: string
          author_name: string
          check_item_id?: string | null
          check_result_id: string
          content: string
          created_at?: string
          id?: string
          media_timestamp?: number | null
          mentions?: string[] | null
          parent_id?: string | null
          status?: string
        }
        Update: {
          annotation_data?: Json | null
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          author_email?: string
          author_name?: string
          check_item_id?: string | null
          check_result_id?: string
          content?: string
          created_at?: string
          id?: string
          media_timestamp?: number | null
          mentions?: string[] | null
          parent_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_check_result_id_fkey"
            columns: ["check_result_id"]
            isOneToOne: false
            referencedRelation: "check_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      correction_logs: {
        Row: {
          ai_extracted_rule: string | null
          ai_process_types: string[] | null
          ai_scope: string | null
          ai_severity: string | null
          approved_at: string | null
          approved_by: string | null
          approved_rule_id: string | null
          check_result_id: string | null
          comment_id: string | null
          correction_category: string | null
          correction_text: string
          created_at: string | null
          created_by: string | null
          file_id: string | null
          id: string
          pattern_id: string | null
          process_type: string
          product_id: string
          project_id: string | null
          rule_status: string | null
          similarity_hash: string | null
        }
        Insert: {
          ai_extracted_rule?: string | null
          ai_process_types?: string[] | null
          ai_scope?: string | null
          ai_severity?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_rule_id?: string | null
          check_result_id?: string | null
          comment_id?: string | null
          correction_category?: string | null
          correction_text: string
          created_at?: string | null
          created_by?: string | null
          file_id?: string | null
          id?: string
          pattern_id?: string | null
          process_type: string
          product_id: string
          project_id?: string | null
          rule_status?: string | null
          similarity_hash?: string | null
        }
        Update: {
          ai_extracted_rule?: string | null
          ai_process_types?: string[] | null
          ai_scope?: string | null
          ai_severity?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_rule_id?: string | null
          check_result_id?: string | null
          comment_id?: string | null
          correction_category?: string | null
          correction_text?: string
          created_at?: string | null
          created_by?: string | null
          file_id?: string | null
          id?: string
          pattern_id?: string | null
          process_type?: string
          product_id?: string
          project_id?: string | null
          rule_status?: string | null
          similarity_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "correction_logs_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_check_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      correction_patterns: {
        Row: {
          auto_apply: boolean | null
          category: string | null
          corrected_content: string
          created_at: string | null
          frequency: number | null
          id: string
          original_content: string
          product_code: string
          product_id: string | null
          rule_id: string
          rule_title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_apply?: boolean | null
          category?: string | null
          corrected_content: string
          created_at?: string | null
          frequency?: number | null
          id?: string
          original_content: string
          product_code: string
          product_id?: string | null
          rule_id: string
          rule_title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_apply?: boolean | null
          category?: string | null
          corrected_content?: string
          created_at?: string | null
          frequency?: number | null
          id?: string
          original_content?: string
          product_code?: string
          product_id?: string | null
          rule_id?: string
          rule_title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "correction_patterns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correction_patterns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_check_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          is_active: boolean | null
          last_active_at: string | null
          name: string
          notes: string | null
          slack_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_active_at?: string | null
          name: string
          notes?: string | null
          slack_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_active_at?: string | null
          name?: string
          notes?: string | null
          slack_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_notification_queue: {
        Row: {
          attempt_count: number | null
          body_data: Json
          created_at: string | null
          error_message: string | null
          id: string
          notification_type: string
          recipient_email: string
          recipient_name: string | null
          related_comment_ids: string[] | null
          related_creator_id: string | null
          related_project_id: string | null
          scheduled_for: string
          sent_at: string | null
          share_token: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          body_data?: Json
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type: string
          recipient_email: string
          recipient_name?: string | null
          related_comment_ids?: string[] | null
          related_creator_id?: string | null
          related_project_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          share_token?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          body_data?: Json
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string
          recipient_name?: string | null
          related_comment_ids?: string[] | null
          related_creator_id?: string | null
          related_project_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          share_token?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_notification_queue_related_creator_id_fkey"
            columns: ["related_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notification_queue_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      error_reports: {
        Row: {
          assigned_to: string | null
          category: string
          context_data: Json | null
          created_at: string
          description: string
          id: string
          page_url: string | null
          product: string
          reporter_email: string | null
          reporter_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          screenshot_url: string | null
          severity: string
          status: string
          title: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          assigned_to?: string | null
          category: string
          context_data?: Json | null
          created_at?: string
          description: string
          id?: string
          page_url?: string | null
          product: string
          reporter_email?: string | null
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          context_data?: Json | null
          created_at?: string
          description?: string
          id?: string
          page_url?: string | null
          product?: string
          reporter_email?: string | null
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          screenshot_url?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      gen_favorites: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gen_favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gen_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          creative_type: string
          duration_seconds: number | null
          generation_mode: string | null
          id: string
          num_appeal_axes: number | null
          num_copies: number | null
          num_tonmana: number | null
          production_pattern: string | null
          project_id: string | null
          reference_creative_ids: string[] | null
          settings: Json | null
          started_at: string | null
          status: string | null
          total_patterns: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          creative_type: string
          duration_seconds?: number | null
          generation_mode?: string | null
          id?: string
          num_appeal_axes?: number | null
          num_copies?: number | null
          num_tonmana?: number | null
          production_pattern?: string | null
          project_id?: string | null
          reference_creative_ids?: string[] | null
          settings?: Json | null
          started_at?: string | null
          status?: string | null
          total_patterns?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          creative_type?: string
          duration_seconds?: number | null
          generation_mode?: string | null
          id?: string
          num_appeal_axes?: number | null
          num_copies?: number | null
          num_tonmana?: number | null
          production_pattern?: string | null
          project_id?: string | null
          reference_creative_ids?: string[] | null
          settings?: Json | null
          started_at?: string | null
          status?: string | null
          total_patterns?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gen_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gen_patterns: {
        Row: {
          appeal_axis_index: number | null
          appeal_axis_text: string | null
          bgm_source: string | null
          bgm_url: string | null
          composition: Json | null
          copy_index: number | null
          copy_text: string | null
          created_at: string | null
          id: string
          job_id: string | null
          narration_audio_url: string | null
          narration_audio_url_b: string | null
          narration_script: string | null
          pattern_id: string
          selected_voice: string | null
          status: string | null
          tonmana_index: number | null
          tonmana_name: string | null
        }
        Insert: {
          appeal_axis_index?: number | null
          appeal_axis_text?: string | null
          bgm_source?: string | null
          bgm_url?: string | null
          composition?: Json | null
          copy_index?: number | null
          copy_text?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          narration_audio_url?: string | null
          narration_audio_url_b?: string | null
          narration_script?: string | null
          pattern_id: string
          selected_voice?: string | null
          status?: string | null
          tonmana_index?: number | null
          tonmana_name?: string | null
        }
        Update: {
          appeal_axis_index?: number | null
          appeal_axis_text?: string | null
          bgm_source?: string | null
          bgm_url?: string | null
          composition?: Json | null
          copy_index?: number | null
          copy_text?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          narration_audio_url?: string | null
          narration_audio_url_b?: string | null
          narration_script?: string | null
          pattern_id?: string
          selected_voice?: string | null
          status?: string | null
          tonmana_index?: number | null
          tonmana_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gen_patterns_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "gen_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      gen_share_links: {
        Row: {
          allow_comment: boolean | null
          allow_download: boolean | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          job_id: string | null
          last_viewed_at: string | null
          note: string | null
          password_hash: string | null
          title: string | null
          token: string
          view_count: number | null
        }
        Insert: {
          allow_comment?: boolean | null
          allow_download?: boolean | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          job_id?: string | null
          last_viewed_at?: string | null
          note?: string | null
          password_hash?: string | null
          title?: string | null
          token: string
          view_count?: number | null
        }
        Update: {
          allow_comment?: boolean | null
          allow_download?: boolean | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          job_id?: string | null
          last_viewed_at?: string | null
          note?: string | null
          password_hash?: string | null
          title?: string | null
          token?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gen_share_links_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "gen_spot_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      gen_spot_assets: {
        Row: {
          asset_type: string
          created_at: string | null
          file_name: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          is_selected: boolean | null
          job_id: string
          metadata: Json | null
          sort_order: number | null
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_selected?: boolean | null
          job_id: string
          metadata?: Json | null
          sort_order?: number | null
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_selected?: boolean | null
          job_id?: string
          metadata?: Json | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gen_spot_assets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "gen_spot_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      gen_spot_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input_data: Json | null
          n8n_execution_id: string | null
          output_data: Json | null
          output_file_url: string | null
          project_id: string
          started_at: string | null
          status: string | null
          tool_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          n8n_execution_id?: string | null
          output_data?: Json | null
          output_file_url?: string | null
          project_id: string
          started_at?: string | null
          status?: string | null
          tool_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          n8n_execution_id?: string | null
          output_data?: Json | null
          output_file_url?: string | null
          project_id?: string
          started_at?: string | null
          status?: string | null
          tool_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gen_spot_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      gen_steps: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_id: string | null
          result: Json | null
          started_at: string | null
          status: string | null
          step_key: string
          step_label: string
          step_number: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          step_key: string
          step_label: string
          step_number: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          step_key?: string
          step_label?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "gen_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "gen_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          display_name: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      kpi_targets: {
        Row: {
          id: string
          key: string
          label: string
          target_value: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          key: string
          label: string
          target_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          key?: string
          label?: string
          target_value?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patterns: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patterns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      process_types: {
        Row: {
          code: string
          created_at: string
          creative_type: string
          description: string | null
          is_active: boolean
          name: string
          sort_order: number
          used_by_brain: boolean
          used_by_check: boolean
          used_by_gen: boolean
        }
        Insert: {
          code: string
          created_at?: string
          creative_type: string
          description?: string | null
          is_active?: boolean
          name: string
          sort_order?: number
          used_by_brain?: boolean
          used_by_check?: boolean
          used_by_gen?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          creative_type?: string
          description?: string | null
          is_active?: boolean
          name?: string
          sort_order?: number
          used_by_brain?: boolean
          used_by_check?: boolean
          used_by_gen?: boolean
        }
        Relationships: []
      }
      product_check_settings: {
        Row: {
          created_at: string | null
          default_size_specs: Json | null
          id: string
          info_lines: string[] | null
          meta: string | null
          product_id: string
          rules_desc: string | null
          sample_text: string | null
          sf_enabled: boolean | null
          updated_at: string | null
          warning: string | null
          webhook_paths: Json | null
        }
        Insert: {
          created_at?: string | null
          default_size_specs?: Json | null
          id?: string
          info_lines?: string[] | null
          meta?: string | null
          product_id: string
          rules_desc?: string | null
          sample_text?: string | null
          sf_enabled?: boolean | null
          updated_at?: string | null
          warning?: string | null
          webhook_paths?: Json | null
        }
        Update: {
          created_at?: string | null
          default_size_specs?: Json | null
          id?: string
          info_lines?: string[] | null
          meta?: string | null
          product_id?: string
          rules_desc?: string | null
          sample_text?: string | null
          sf_enabled?: boolean | null
          updated_at?: string | null
          warning?: string | null
          webhook_paths?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "product_check_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_check_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_with_check_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      production_patterns: {
        Row: {
          created_at: string | null
          default_business_days: number | null
          description: string | null
          id: string
          is_active: boolean | null
          pattern_code: string
          pattern_name: string
          product_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_business_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pattern_code: string
          pattern_name: string
          product_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_business_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pattern_code?: string
          pattern_name?: string
          product_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_patterns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_patterns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_check_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          abbreviation: string | null
          client_id: string | null
          code: string
          color: string | null
          created_at: string | null
          default_bg_color: string | null
          default_display_sec: number | null
          default_switch_sec: number | null
          default_transition: string | null
          external_product_id: string | null
          frame_image_url: string | null
          id: string
          label: string
          logo_image_url: string | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          abbreviation?: string | null
          client_id?: string | null
          code: string
          color?: string | null
          created_at?: string | null
          default_bg_color?: string | null
          default_display_sec?: number | null
          default_switch_sec?: number | null
          default_transition?: string | null
          external_product_id?: string | null
          frame_image_url?: string | null
          id?: string
          label: string
          logo_image_url?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string | null
          client_id?: string | null
          code?: string
          color?: string | null
          created_at?: string | null
          default_bg_color?: string | null
          default_display_sec?: number | null
          default_switch_sec?: number | null
          default_transition?: string | null
          external_product_id?: string | null
          frame_image_url?: string | null
          id?: string
          label?: string
          logo_image_url?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean
          last_login_at: string | null
          notify_check_complete: boolean
          notify_comment: boolean
          notify_invitation: boolean
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          last_login_at?: string | null
          notify_check_complete?: boolean
          notify_comment?: boolean
          notify_invitation?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          last_login_at?: string | null
          notify_check_complete?: boolean
          notify_comment?: boolean
          notify_invitation?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_audit_log: {
        Row: {
          action: string
          created_at: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          project_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          project_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          project_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_briefs: {
        Row: {
          ad_objective: string | null
          created_at: string
          created_by: string | null
          differentiation: string | null
          hint: string | null
          id: string
          is_current: boolean
          lp_summary: string | null
          lp_url: string | null
          ng_words: string[] | null
          note: string | null
          project_id: string
          reference_banner_urls: string[] | null
          reference_creatives: string | null
          source: string
          target_audience: string | null
          target_insight: string | null
          tone_preset: string | null
        }
        Insert: {
          ad_objective?: string | null
          created_at?: string
          created_by?: string | null
          differentiation?: string | null
          hint?: string | null
          id?: string
          is_current?: boolean
          lp_summary?: string | null
          lp_url?: string | null
          ng_words?: string[] | null
          note?: string | null
          project_id: string
          reference_banner_urls?: string[] | null
          reference_creatives?: string | null
          source?: string
          target_audience?: string | null
          target_insight?: string | null
          tone_preset?: string | null
        }
        Update: {
          ad_objective?: string | null
          created_at?: string
          created_by?: string | null
          differentiation?: string | null
          hint?: string | null
          id?: string
          is_current?: boolean
          lp_summary?: string | null
          lp_url?: string | null
          ng_words?: string[] | null
          note?: string | null
          project_id?: string
          reference_banner_urls?: string[] | null
          reference_creatives?: string | null
          source?: string
          target_audience?: string | null
          target_insight?: string | null
          tone_preset?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_briefs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_collaborators: {
        Row: {
          creator_id: string
          expires_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          last_accessed_at: string | null
          notification_enabled: boolean | null
          project_id: string
          share_token: string
        }
        Insert: {
          creator_id: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          notification_enabled?: boolean | null
          project_id: string
          share_token?: string
        }
        Update: {
          creator_id?: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          notification_enabled?: boolean | null
          project_id?: string
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          check_result_id: string | null
          checking_by: string | null
          checking_started_at: string | null
          created_at: string | null
          created_by: string | null
          file_data: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string
          fixed_at: string | null
          fixed_by: string | null
          gdrive_synced_at: string | null
          gdrive_url: string | null
          id: string
          parent_file_id: string | null
          pattern_id: string | null
          process_type: string
          project_id: string | null
          status: string | null
          submission_type: string
          updated_at: string | null
          uploaded_by_creator_id: string | null
          version_number: number | null
        }
        Insert: {
          check_result_id?: string | null
          checking_by?: string | null
          checking_started_at?: string | null
          created_at?: string | null
          created_by?: string | null
          file_data?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type: string
          fixed_at?: string | null
          fixed_by?: string | null
          gdrive_synced_at?: string | null
          gdrive_url?: string | null
          id?: string
          parent_file_id?: string | null
          pattern_id?: string | null
          process_type: string
          project_id?: string | null
          status?: string | null
          submission_type?: string
          updated_at?: string | null
          uploaded_by_creator_id?: string | null
          version_number?: number | null
        }
        Update: {
          check_result_id?: string | null
          checking_by?: string | null
          checking_started_at?: string | null
          created_at?: string | null
          created_by?: string | null
          file_data?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          fixed_at?: string | null
          fixed_by?: string | null
          gdrive_synced_at?: string | null
          gdrive_url?: string | null
          id?: string
          parent_file_id?: string | null
          pattern_id?: string | null
          process_type?: string
          project_id?: string | null
          status?: string | null
          submission_type?: string
          updated_at?: string | null
          uploaded_by_creator_id?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_creator_id_fkey"
            columns: ["uploaded_by_creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          project_id: string
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          project_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          project_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_processes: {
        Row: {
          client_deadline: string | null
          created_at: string
          deadline: string | null
          expected_height: number | null
          expected_width: number | null
          id: string
          is_active: boolean
          is_common: boolean
          process_key: string
          process_label: string
          project_id: string
          skip_size_check: boolean
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          client_deadline?: string | null
          created_at?: string
          deadline?: string | null
          expected_height?: number | null
          expected_width?: number | null
          id?: string
          is_active?: boolean
          is_common?: boolean
          process_key: string
          process_label: string
          project_id: string
          skip_size_check?: boolean
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          client_deadline?: string | null
          created_at?: string
          deadline?: string | null
          expected_height?: number | null
          expected_width?: number | null
          id?: string
          is_active?: boolean
          is_common?: boolean
          process_key?: string
          process_label?: string
          project_id?: string
          skip_size_check?: boolean
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_processes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ad_objective: string | null
          client_contact: string | null
          copyright_text: string | null
          created_at: string | null
          created_by: string | null
          creative_type: string | null
          deadline: string | null
          description: string | null
          differentiation: string | null
          id: string
          lp_scraped_at: string | null
          lp_scraped_content: string | null
          lp_summary: string | null
          lp_url: string | null
          name: string
          ng_words: string[] | null
          ob_am: string | null
          ob_pm: string | null
          ob_qm: string | null
          overall_deadline: string | null
          product_id: string | null
          production_pattern: string | null
          project_code: string | null
          reference_banner_urls: string[] | null
          reference_creatives: string | null
          schedule_business_days: number | null
          sort_order: number | null
          status: string | null
          target_audience: string | null
          target_insight: string | null
          tone_preset: string | null
          total_video_count: number | null
          updated_at: string | null
          video_duration_seconds: number | null
          work_title: string | null
        }
        Insert: {
          ad_objective?: string | null
          client_contact?: string | null
          copyright_text?: string | null
          created_at?: string | null
          created_by?: string | null
          creative_type?: string | null
          deadline?: string | null
          description?: string | null
          differentiation?: string | null
          id?: string
          lp_scraped_at?: string | null
          lp_scraped_content?: string | null
          lp_summary?: string | null
          lp_url?: string | null
          name: string
          ng_words?: string[] | null
          ob_am?: string | null
          ob_pm?: string | null
          ob_qm?: string | null
          overall_deadline?: string | null
          product_id?: string | null
          production_pattern?: string | null
          project_code?: string | null
          reference_banner_urls?: string[] | null
          reference_creatives?: string | null
          schedule_business_days?: number | null
          sort_order?: number | null
          status?: string | null
          target_audience?: string | null
          target_insight?: string | null
          tone_preset?: string | null
          total_video_count?: number | null
          updated_at?: string | null
          video_duration_seconds?: number | null
          work_title?: string | null
        }
        Update: {
          ad_objective?: string | null
          client_contact?: string | null
          copyright_text?: string | null
          created_at?: string | null
          created_by?: string | null
          creative_type?: string | null
          deadline?: string | null
          description?: string | null
          differentiation?: string | null
          id?: string
          lp_scraped_at?: string | null
          lp_scraped_content?: string | null
          lp_summary?: string | null
          lp_url?: string | null
          name?: string
          ng_words?: string[] | null
          ob_am?: string | null
          ob_pm?: string | null
          ob_qm?: string | null
          overall_deadline?: string | null
          product_id?: string | null
          production_pattern?: string | null
          project_code?: string | null
          reference_banner_urls?: string[] | null
          reference_creatives?: string | null
          schedule_business_days?: number | null
          sort_order?: number | null
          status?: string | null
          target_audience?: string | null
          target_insight?: string | null
          tone_preset?: string | null
          total_video_count?: number | null
          updated_at?: string | null
          video_duration_seconds?: number | null
          work_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_check_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_materials: {
        Row: {
          ai_rule_enabled: boolean
          content_text: string | null
          created_at: string
          created_by: string | null
          file_data: string | null
          file_name: string | null
          id: string
          is_active: boolean
          material_type: string
          scope_id: string
          scope_type: string
          sort_order: number
          source_type: string
          source_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_rule_enabled?: boolean
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          file_data?: string | null
          file_name?: string | null
          id?: string
          is_active?: boolean
          material_type: string
          scope_id: string
          scope_type: string
          sort_order?: number
          source_type?: string
          source_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_rule_enabled?: boolean
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          file_data?: string | null
          file_name?: string | null
          id?: string
          is_active?: boolean
          material_type?: string
          scope_id?: string
          scope_type?: string
          sort_order?: number
          source_type?: string
          source_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      revision_comment_files: {
        Row: {
          comment_id: string
          created_at: string
          file_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          file_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_comment_files_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "revision_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_comment_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "project_files"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_comments: {
        Row: {
          comment_text: string
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_audit_log: {
        Row: {
          action_type: string
          ai_confidence: number | null
          ai_reasoning: string
          check_rule_id: string | null
          created_at: string
          field_changed: string | null
          id: string
          level: string
          new_value: string | null
          old_value: string | null
          product_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rule_id: string
          status: string
        }
        Insert: {
          action_type: string
          ai_confidence?: number | null
          ai_reasoning: string
          check_rule_id?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          level: string
          new_value?: string | null
          old_value?: string | null
          product_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id: string
          status?: string
        }
        Update: {
          action_type?: string
          ai_confidence?: number | null
          ai_reasoning?: string
          check_rule_id?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          level?: string
          new_value?: string | null
          old_value?: string | null
          product_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_audit_log_check_rule_id_fkey"
            columns: ["check_rule_id"]
            isOneToOne: false
            referencedRelation: "check_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_audit_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_audit_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_check_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_candidates: {
        Row: {
          admin_notes: string | null
          approved_rule_id: string | null
          category: string | null
          client_id: string | null
          created_at: string | null
          id: string
          process_type: string
          product_id: string
          project_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rule_text: string
          rule_title: string | null
          scope: string
          severity: string | null
          similar_existing_rule_id: string | null
          similarity_score: number | null
          source_correction_ids: string[] | null
          source_count: number | null
          source_material_type: string | null
          source_reference_id: string | null
          source_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_rule_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          process_type: string
          product_id: string
          project_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_text: string
          rule_title?: string | null
          scope?: string
          severity?: string | null
          similar_existing_rule_id?: string | null
          similarity_score?: number | null
          source_correction_ids?: string[] | null
          source_count?: number | null
          source_material_type?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_rule_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          process_type?: string
          product_id?: string
          project_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_text?: string
          rule_title?: string | null
          scope?: string
          severity?: string | null
          similar_existing_rule_id?: string | null
          similarity_score?: number | null
          source_correction_ids?: string[] | null
          source_count?: number | null
          source_material_type?: string | null
          source_reference_id?: string | null
          source_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rule_candidates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_check_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_candidates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_candidates_source_reference_id_fkey"
            columns: ["source_reference_id"]
            isOneToOne: false
            referencedRelation: "reference_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_quality_audit_log: {
        Row: {
          ambiguous_count: number
          ambiguous_rate: number
          audit_date: string
          created_at: string | null
          details: Json | null
          duplicate_count: number
          id: number
          invalid_process_type_count: number
          missing_title_count: number
          quality_ng_count: number
          quality_ok_count: number
          total_rules: number
        }
        Insert: {
          ambiguous_count: number
          ambiguous_rate: number
          audit_date?: string
          created_at?: string | null
          details?: Json | null
          duplicate_count: number
          id?: number
          invalid_process_type_count: number
          missing_title_count: number
          quality_ng_count: number
          quality_ok_count: number
          total_rules: number
        }
        Update: {
          ambiguous_count?: number
          ambiguous_rate?: number
          audit_date?: string
          created_at?: string | null
          details?: Json | null
          duplicate_count?: number
          id?: number
          invalid_process_type_count?: number
          missing_title_count?: number
          quality_ng_count?: number
          quality_ok_count?: number
          total_rules?: number
        }
        Relationships: []
      }
      share_links: {
        Row: {
          allow_comment_read: boolean | null
          allow_comment_write: boolean | null
          allow_download: boolean | null
          check_result_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          password_hash: string | null
          token: string
        }
        Insert: {
          allow_comment_read?: boolean | null
          allow_comment_write?: boolean | null
          allow_download?: boolean | null
          check_result_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          password_hash?: string | null
          token?: string
        }
        Update: {
          allow_comment_read?: boolean | null
          allow_comment_write?: boolean | null
          allow_download?: boolean | null
          check_result_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          password_hash?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_check_result_id_fkey"
            columns: ["check_result_id"]
            isOneToOne: false
            referencedRelation: "check_results"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_logs: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          file_id: string
          id: string
          pattern_id: string | null
          process_type: string
          product_id: string | null
          project_id: string | null
          version_number: number
        }
        Insert: {
          action_type: string
          created_at?: string
          created_by?: string | null
          file_id: string
          id?: string
          pattern_id?: string | null
          process_type: string
          product_id?: string | null
          project_id?: string | null
          version_number?: number
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          file_id?: string
          id?: string
          pattern_id?: string | null
          process_type?: string
          product_id?: string | null
          project_id?: string | null
          version_number?: number
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      products_with_check_settings: {
        Row: {
          abbreviation: string | null
          client_id: string | null
          code: string | null
          color: string | null
          created_at: string | null
          external_product_id: string | null
          id: string | null
          info_lines: string[] | null
          label: string | null
          meta: string | null
          name: string | null
          rules_desc: string | null
          sample_text: string | null
          sf_enabled: boolean | null
          sort_order: number | null
          updated_at: string | null
          warning: string | null
          webhook_paths: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_quality_metrics: {
        Row: {
          ambiguous_count: number | null
          ambiguous_rate_pct: number | null
          client_name: string | null
          duplicate_count: number | null
          invalid_pt_count: number | null
          missing_title_count: number | null
          process_type: string | null
          product_name: string | null
          quality_ng: number | null
          quality_ok: number | null
          quality_ok_rate_pct: number | null
          total_rules: number | null
        }
        Relationships: []
      }
      rule_quality_trend: {
        Row: {
          ambiguous_count: number | null
          ambiguous_rate: number | null
          audit_date: string | null
          duplicate_count: number | null
          invalid_process_type_count: number | null
          missing_title_count: number | null
          quality_ng_count: number | null
          quality_ok_count: number | null
          total_rules: number | null
        }
        Insert: {
          ambiguous_count?: number | null
          ambiguous_rate?: number | null
          audit_date?: string | null
          duplicate_count?: number | null
          invalid_process_type_count?: number | null
          missing_title_count?: number | null
          quality_ng_count?: number | null
          quality_ok_count?: number | null
          total_rules?: number | null
        }
        Update: {
          ambiguous_count?: number | null
          ambiguous_rate?: number | null
          audit_date?: string | null
          duplicate_count?: number | null
          invalid_process_type_count?: number | null
          missing_title_count?: number | null
          quality_ng_count?: number | null
          quality_ok_count?: number | null
          total_rules?: number | null
        }
        Relationships: []
      }
      share_links_safe: {
        Row: {
          allow_comment_read: boolean | null
          allow_comment_write: boolean | null
          allow_download: boolean | null
          check_result_id: string | null
          created_at: string | null
          expires_at: string | null
          has_password: boolean | null
          id: string | null
          token: string | null
        }
        Insert: {
          allow_comment_read?: boolean | null
          allow_comment_write?: boolean | null
          allow_download?: boolean | null
          check_result_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          has_password?: never
          id?: string | null
          token?: string | null
        }
        Update: {
          allow_comment_read?: boolean | null
          allow_comment_write?: boolean | null
          allow_download?: boolean | null
          check_result_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          has_password?: never
          id?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_links_check_result_id_fkey"
            columns: ["check_result_id"]
            isOneToOne: false
            referencedRelation: "check_results"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: boolean
      }
      approve_rule_candidate: {
        Args: { p_candidate_id: string; p_reviewer_id?: string }
        Returns: string
      }
      approve_rule_candidates_bulk: {
        Args: { p_candidate_ids: string[]; p_reviewer_id?: string }
        Returns: {
          candidate_id: string
          new_rule_id: string
        }[]
      }
      audit_check_rules_quality: { Args: never; Returns: Json }
      create_bulk_revision_comment: {
        Args: {
          p_comment_text: string
          p_created_by?: string
          p_file_ids: string[]
          p_project_id: string
          p_severity?: string
        }
        Returns: string
      }
      current_user_role: { Args: never; Returns: string }
      delete_project_cascade: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      ensure_profile:
        | { Args: { p_email: string; p_user_id: string }; Returns: undefined }
        | { Args: { p_email: string; p_user_id: string }; Returns: undefined }
      generate_share_token: { Args: never; Returns: string }
      get_applicable_rules: {
        Args: {
          p_process_type?: string
          p_product_id: string
          p_project_id?: string
        }
        Returns: {
          category: string
          client_id: string
          description: string
          id: string
          is_active: boolean
          is_auto_generated: boolean
          process_type: string
          product_id: string
          project_id: string
          rule_id: string
          scope: string
          severity: string
          sort_order: number
          source_type: string
          title: string
        }[]
      }
      get_expected_size: {
        Args: { p_process_type: string; p_project_id: string }
        Returns: {
          expected_height: number
          expected_width: number
          skip_check: boolean
        }[]
      }
      get_file_comment_counts_for_creator: {
        Args: { p_share_token: string }
        Returns: Json
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          display_name: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          inviter_name: string
          role: string
          status: string
        }[]
      }
      get_profiles_by_ids: {
        Args: { p_ids: string[] }
        Returns: {
          display_name: string
          email: string
          id: string
        }[]
      }
      get_project_comments_for_creator: {
        Args: { p_file_id?: string; p_share_token: string }
        Returns: Json
      }
      get_project_files_for_creator: {
        Args: { p_share_token: string }
        Returns: {
          check_result_id: string | null
          checking_by: string | null
          checking_started_at: string | null
          created_at: string | null
          created_by: string | null
          file_data: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string
          fixed_at: string | null
          fixed_by: string | null
          gdrive_synced_at: string | null
          gdrive_url: string | null
          id: string
          parent_file_id: string | null
          pattern_id: string | null
          process_type: string
          project_id: string | null
          status: string | null
          submission_type: string
          updated_at: string | null
          uploaded_by_creator_id: string | null
          version_number: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "project_files"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_project_for_creator: {
        Args: { p_share_token: string }
        Returns: Json
      }
      get_project_patterns_for_creator: {
        Args: { p_share_token: string }
        Returns: Json
      }
      get_project_processes_for_creator: {
        Args: { p_share_token: string }
        Returns: Json
      }
      get_project_status_summary: { Args: never; Returns: Json }
      get_share_link_by_token: {
        Args: { token_param: string }
        Returns: {
          allow_comment_read: boolean
          allow_comment_write: boolean
          allow_download: boolean
          check_result_id: string
          created_at: string
          expires_at: string
          id: string
          password_hash: string
          token: string
        }[]
      }
      get_shared_check_result: {
        Args: { p_check_result_id: string; p_share_token: string }
        Returns: {
          check_items: Json | null
          check_type: string
          client_name: string
          comparison_round: number
          created_at: string | null
          detected_case: string | null
          id: string
          input_data: Json | null
          input_text: string | null
          input_type: string
          ng_count: number | null
          ok_count: number | null
          overall_status: string | null
          parent_check_result_id: string | null
          process_type: string
          product_code: string
          product_name: string
          raw_response: Json | null
          resolved_items: Json | null
          status: string | null
          total_checks: number | null
          updated_at: string | null
          user_id: string
          warning_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "check_results"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_shared_comments: {
        Args: { p_check_result_id: string; p_share_token: string }
        Returns: {
          annotation_data: Json | null
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          author_email: string
          author_name: string
          check_item_id: string | null
          check_result_id: string
          content: string
          created_at: string
          id: string
          media_timestamp: number | null
          mentions: string[] | null
          parent_id: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      get_workspace_role: { Args: { _user_id: string }; Returns: string }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      is_project_member: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      is_workspace_member_accepted: {
        Args: { _user_id: string }
        Returns: boolean
      }
      lookup_profile_by_email: {
        Args: { p_email: string }
        Returns: {
          display_name: string
          id: string
        }[]
      }
      process_email_notification_queue: { Args: never; Returns: Json }
      recover_stuck_checking_files: {
        Args: never
        Returns: {
          file_name: string
          recovered_id: string
          stuck_minutes: number
        }[]
      }
      reject_rule_candidate: {
        Args: {
          p_candidate_id: string
          p_notes?: string
          p_reviewer_id?: string
        }
        Returns: undefined
      }
      scenes_json_to_composition_text: {
        Args: { p_scenes: Json }
        Returns: string
      }
      send_slack_notification:
        | { Args: { body: Json; channel_type: string }; Returns: undefined }
        | { Args: { message: string }; Returns: undefined }
      send_weekly_rule_improvement_report: { Args: never; Returns: undefined }
      track_creator_access: {
        Args: { p_share_token: string }
        Returns: undefined
      }
      trigger_na_script_generation: {
        Args: {
          p_client_name?: string
          p_composition_text: string
          p_duration_seconds: number
          p_product_name?: string
          p_project_id: string
          p_project_name?: string
          p_spot_job_id: string
        }
        Returns: number
      }
      trigger_storyboard_image_generation: {
        Args: {
          p_appeal_axis?: string
          p_client_name?: string
          p_copy_text?: string
          p_creative_style?: string
          p_delay_ms?: number
          p_product_name?: string
          p_project_id: string
          p_project_name?: string
          p_scenes: Json
          p_spot_job_id: string
        }
        Returns: number
      }
      upload_file_as_creator: {
        Args: {
          p_file_data: string
          p_file_name: string
          p_file_size_bytes?: number
          p_file_type: string
          p_parent_file_id?: string
          p_pattern_id?: string
          p_process_type: string
          p_share_token: string
        }
        Returns: string
      }
      validate_process_type: {
        Args: { p_process_type: string }
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
