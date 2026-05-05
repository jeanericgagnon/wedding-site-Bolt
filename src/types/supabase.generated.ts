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
      admin_users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      app_action_audit_logs: {
        Row: {
          action_area: string
          action_type: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          summary: string
          target_id: string | null
          target_label: string | null
          wedding_site_id: string
        }
        Insert: {
          action_area: string
          action_type: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          summary: string
          target_id?: string | null
          target_label?: string | null
          wedding_site_id: string
        }
        Update: {
          action_area?: string
          action_type?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          summary?: string
          target_id?: string | null
          target_label?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_action_audit_logs_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      app_error_logs: {
        Row: {
          created_at: string
          fingerprint: string | null
          id: string
          message: string
          metadata: Json
          route: string | null
          severity: string
          source: string
          stack: string | null
          user_id: string | null
          wedding_site_id: string | null
        }
        Insert: {
          created_at?: string
          fingerprint?: string | null
          id?: string
          message: string
          metadata?: Json
          route?: string | null
          severity?: string
          source: string
          stack?: string | null
          user_id?: string | null
          wedding_site_id?: string | null
        }
        Update: {
          created_at?: string
          fingerprint?: string | null
          id?: string
          message?: string
          metadata?: Json
          route?: string | null
          severity?: string
          source?: string
          stack?: string | null
          user_id?: string | null
          wedding_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_error_logs_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_media_assets: {
        Row: {
          alt_text: string | null
          asset_type: string
          attached_section_ids: string[]
          caption: string | null
          filename: string
          height: number | null
          id: string
          mime_type: string
          original_filename: string
          size_bytes: number
          status: string
          tags: string[]
          thumbnail_url: string | null
          updated_at: string
          uploaded_at: string
          url: string
          wedding_site_id: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          asset_type?: string
          attached_section_ids?: string[]
          caption?: string | null
          filename: string
          height?: number | null
          id?: string
          mime_type: string
          original_filename: string
          size_bytes?: number
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_at?: string
          url: string
          wedding_site_id: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          asset_type?: string
          attached_section_ids?: string[]
          caption?: string | null
          filename?: string
          height?: number | null
          id?: string
          mime_type?: string
          original_filename?: string
          size_bytes?: number
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_at?: string
          url?: string
          wedding_site_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "builder_media_assets_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          guest_id: string | null
          id: string
          payload_json: Json
          scheduled_for: string | null
          sent_at: string | null
          site_id: string | null
          status: string
          type: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          guest_id?: string | null
          id?: string
          payload_json?: Json
          scheduled_for?: string | null
          sent_at?: string | null
          site_id?: string | null
          status?: string
          type: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          guest_id?: string | null
          id?: string
          payload_json?: Json
          scheduled_for?: string | null
          sent_at?: string | null
          site_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_setup_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          payload: Json
          session_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          payload?: Json
          session_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          payload?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_setup_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "enhanced_setup_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_setup_facts: {
        Row: {
          confidence: number | null
          created_at: string
          fact_key: string
          fact_value: string | null
          id: string
          is_required: boolean
          session_id: string
          source: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          fact_key: string
          fact_value?: string | null
          id?: string
          is_required?: boolean
          session_id: string
          source?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          fact_key?: string
          fact_value?: string | null
          id?: string
          is_required?: boolean
          session_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_setup_facts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "enhanced_setup_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_setup_sections: {
        Row: {
          approved: boolean
          content: string
          created_at: string
          id: string
          redo_count: number
          section_key: string
          session_id: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          content: string
          created_at?: string
          id?: string
          redo_count?: number
          section_key: string
          session_id: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          content?: string
          created_at?: string
          id?: string
          redo_count?: number
          section_key?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_setup_sections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "enhanced_setup_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      enhanced_setup_sessions: {
        Row: {
          approved_facts: Json
          created_at: string
          current_step: string
          followup_count: number
          generated_sections: Json
          id: string
          intake_mode: string
          intake_text: string | null
          regen_total_count: number
          status: string
          tone: string | null
          transcript: string | null
          updated_at: string
          user_id: string
          wedding_site_id: string
        }
        Insert: {
          approved_facts?: Json
          created_at?: string
          current_step?: string
          followup_count?: number
          generated_sections?: Json
          id?: string
          intake_mode?: string
          intake_text?: string | null
          regen_total_count?: number
          status?: string
          tone?: string | null
          transcript?: string | null
          updated_at?: string
          user_id: string
          wedding_site_id: string
        }
        Update: {
          approved_facts?: Json
          created_at?: string
          current_step?: string
          followup_count?: number
          generated_sections?: Json
          id?: string
          intake_mode?: string
          intake_text?: string | null
          regen_total_count?: number
          status?: string
          tone?: string | null
          transcript?: string | null
          updated_at?: string
          user_id?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_setup_sessions_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invitations: {
        Row: {
          created_at: string
          event_id: string
          guest_id: string
          id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          guest_id: string
          id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          guest_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "itinerary_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invitations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          attending: boolean
          created_at: string | null
          dietary_restrictions: string | null
          event_invitation_id: string
          id: string
          notes: string | null
          responded_at: string | null
          updated_at: string | null
        }
        Insert: {
          attending: boolean
          created_at?: string | null
          dietary_restrictions?: string | null
          event_invitation_id: string
          id?: string
          notes?: string | null
          responded_at?: string | null
          updated_at?: string | null
        }
        Update: {
          attending?: boolean
          created_at?: string | null
          dietary_restrictions?: string | null
          event_invitation_id?: string
          id?: string
          notes?: string | null
          responded_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_invitation_id_fkey"
            columns: ["event_invitation_id"]
            isOneToOne: true
            referencedRelation: "event_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          guest_id: string
          id: string
          new_data: Json | null
          old_data: Json | null
          wedding_site_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          guest_id: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          wedding_site_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          guest_id?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_audit_logs_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_contact_requests: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          guest_id: string
          id: string
          token: string
          used_at: string | null
          wedding_site_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          guest_id: string
          id?: string
          token: string
          used_at?: string | null
          wedding_site_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          guest_id?: string
          id?: string
          token?: string
          used_at?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_contact_requests_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_contact_requests_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_hub_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          referrer: string | null
          site_slug: string
          target: string | null
          user_agent: string | null
          wedding_site_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          referrer?: string | null
          site_slug: string
          target?: string | null
          user_agent?: string | null
          wedding_site_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          referrer?: string | null
          site_slug?: string
          target?: string | null
          user_agent?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_hub_events_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_hub_settings: {
        Row: {
          created_at: string
          custom_message: string | null
          guestbook_enabled: boolean
          language_default: string
          photos_enabled: boolean
          recap_closed_at: string | null
          recap_published_at: string | null
          recap_status: string
          registry_enabled: boolean
          rsvp_enabled: boolean
          schedule_enabled: boolean
          travel_enabled: boolean
          updated_at: string
          updated_by: string | null
          wedding_site_id: string
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          guestbook_enabled?: boolean
          language_default?: string
          photos_enabled?: boolean
          recap_closed_at?: string | null
          recap_published_at?: string | null
          recap_status?: string
          registry_enabled?: boolean
          rsvp_enabled?: boolean
          schedule_enabled?: boolean
          travel_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          wedding_site_id: string
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          guestbook_enabled?: boolean
          language_default?: string
          photos_enabled?: boolean
          recap_closed_at?: string | null
          recap_published_at?: string | null
          recap_status?: string
          registry_enabled?: boolean
          rsvp_enabled?: boolean
          schedule_enabled?: boolean
          travel_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_hub_settings_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: true
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_prospect_optins: {
        Row: {
          created_at: string
          email: string | null
          future_event_email_queue_id: string | null
          future_event_email_queued_at: string | null
          guest_name: string | null
          id: string
          metadata: Json
          phone: string | null
          recap_email_queue_id: string | null
          recap_email_queued_at: string | null
          site_slug: string
          source: string
          wants_own_event_info: boolean
          wants_photo_updates: boolean
          wedding_site_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          future_event_email_queue_id?: string | null
          future_event_email_queued_at?: string | null
          guest_name?: string | null
          id?: string
          metadata?: Json
          phone?: string | null
          recap_email_queue_id?: string | null
          recap_email_queued_at?: string | null
          site_slug: string
          source?: string
          wants_own_event_info?: boolean
          wants_photo_updates?: boolean
          wedding_site_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          future_event_email_queue_id?: string | null
          future_event_email_queued_at?: string | null
          guest_name?: string | null
          id?: string
          metadata?: Json
          phone?: string | null
          recap_email_queue_id?: string | null
          recap_email_queued_at?: string | null
          site_slug?: string
          source?: string
          wants_own_event_info?: boolean
          wants_photo_updates?: boolean
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_prospect_optins_future_event_email_queue_id_fkey"
            columns: ["future_event_email_queue_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_prospect_optins_recap_email_queue_id_fkey"
            columns: ["recap_email_queue_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_prospect_optins_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_qna_items: {
        Row: {
          answer: string | null
          created_at: string
          guest_id: string | null
          id: string
          question: string
          source: string
          status: string
          updated_at: string
          wedding_site_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          guest_id?: string | null
          id?: string
          question: string
          source?: string
          status?: string
          updated_at?: string
          wedding_site_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          guest_id?: string | null
          id?: string
          question?: string
          source?: string
          status?: string
          updated_at?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_qna_items_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_qna_items_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      guestbook_entries: {
        Row: {
          created_at: string
          guest_email: string | null
          guest_name: string | null
          id: string
          is_flagged: boolean
          is_hidden: boolean
          message: string
          moderated_at: string | null
          moderated_by: string | null
          requester_ip: string | null
          user_agent: string | null
          wedding_site_id: string
        }
        Insert: {
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_flagged?: boolean
          is_hidden?: boolean
          message: string
          moderated_at?: string | null
          moderated_by?: string | null
          requester_ip?: string | null
          user_agent?: string | null
          wedding_site_id: string
        }
        Update: {
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_flagged?: boolean
          is_hidden?: boolean
          message?: string
          moderated_at?: string | null
          moderated_by?: string | null
          requester_ip?: string | null
          user_agent?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestbook_entries_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          checked_in_at: string | null
          checkin_notes: string | null
          children_allowed: boolean | null
          created_at: string | null
          email: string | null
          first_name: string | null
          group_name: string | null
          household_id: string | null
          id: string
          invitation_sent_at: string | null
          invite_token: string | null
          invited_to_ceremony: boolean | null
          invited_to_reception: boolean | null
          last_name: string | null
          mailing_address_line1: string | null
          mailing_address_line2: string | null
          mailing_city: string | null
          mailing_country: string | null
          mailing_postal_code: string | null
          mailing_state: string | null
          max_additional_guests: number | null
          max_children: number | null
          meal_preference: string | null
          name: string
          notes: string | null
          phone: string | null
          plus_one_allowed: boolean | null
          plus_one_name: string | null
          reminder_last_sent_at: string | null
          rsvp_received_at: string | null
          rsvp_status: string | null
          sms_consent: boolean
          thank_you_notes: string | null
          thank_you_sent_at: string | null
          wedding_site_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checkin_notes?: string | null
          children_allowed?: boolean | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          group_name?: string | null
          household_id?: string | null
          id?: string
          invitation_sent_at?: string | null
          invite_token?: string | null
          invited_to_ceremony?: boolean | null
          invited_to_reception?: boolean | null
          last_name?: string | null
          mailing_address_line1?: string | null
          mailing_address_line2?: string | null
          mailing_city?: string | null
          mailing_country?: string | null
          mailing_postal_code?: string | null
          mailing_state?: string | null
          max_additional_guests?: number | null
          max_children?: number | null
          meal_preference?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          plus_one_allowed?: boolean | null
          plus_one_name?: string | null
          reminder_last_sent_at?: string | null
          rsvp_received_at?: string | null
          rsvp_status?: string | null
          sms_consent?: boolean
          thank_you_notes?: string | null
          thank_you_sent_at?: string | null
          wedding_site_id: string
        }
        Update: {
          checked_in_at?: string | null
          checkin_notes?: string | null
          children_allowed?: boolean | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          group_name?: string | null
          household_id?: string | null
          id?: string
          invitation_sent_at?: string | null
          invite_token?: string | null
          invited_to_ceremony?: boolean | null
          invited_to_reception?: boolean | null
          last_name?: string | null
          mailing_address_line1?: string | null
          mailing_address_line2?: string | null
          mailing_city?: string | null
          mailing_country?: string | null
          mailing_postal_code?: string | null
          mailing_state?: string | null
          max_additional_guests?: number | null
          max_children?: number | null
          meal_preference?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          plus_one_allowed?: boolean | null
          plus_one_name?: string | null
          reminder_last_sent_at?: string | null
          rsvp_received_at?: string | null
          rsvp_status?: string | null
          sms_consent?: boolean
          thank_you_notes?: string | null
          thank_you_sent_at?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_suggestions: {
        Row: {
          created_at: string
          id: string
          is_hidden: boolean
          prompt_key: string
          site_slug: string
          suggestion_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_hidden?: boolean
          prompt_key: string
          site_slug: string
          suggestion_text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_hidden?: boolean
          prompt_key?: string
          site_slug?: string
          suggestion_text?: string
        }
        Relationships: []
      }
      interactive_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          site_slug: string
          widget_id: string
          widget_kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          site_slug: string
          widget_id: string
          widget_kind: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          site_slug?: string
          widget_id?: string
          widget_kind?: string
        }
        Relationships: []
      }
      internal_ai_usage_events: {
        Row: {
          cached_input_tokens: number
          created_at: string
          estimated_cost_usd: number
          feature: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          provider: string
          raw_usage: Json
          total_tokens: number
          upload_id: string | null
          wedding_site_id: string | null
        }
        Insert: {
          cached_input_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          feature?: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          provider: string
          raw_usage?: Json
          total_tokens?: number
          upload_id?: string | null
          wedding_site_id?: string | null
        }
        Update: {
          cached_input_tokens?: number
          created_at?: string
          estimated_cost_usd?: number
          feature?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider?: string
          raw_usage?: Json
          total_tokens?: number
          upload_id?: string | null
          wedding_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_ai_usage_events_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "photo_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_ai_usage_events_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_events: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          dress_code: string | null
          end_time: string | null
          event_date: string | null
          event_name: string | null
          id: string
          is_private: boolean
          is_visible: boolean
          location_address: string | null
          location_name: string | null
          notes: string | null
          sort_order: number
          start_time: string | null
          title: string
          updated_at: string
          wedding_site_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          dress_code?: string | null
          end_time?: string | null
          event_date?: string | null
          event_name?: string | null
          id?: string
          is_private?: boolean
          is_visible?: boolean
          location_address?: string | null
          location_name?: string | null
          notes?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string
          updated_at?: string
          wedding_site_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          dress_code?: string | null
          end_time?: string | null
          event_date?: string | null
          event_name?: string | null
          id?: string
          is_private?: boolean
          is_visible?: boolean
          location_address?: string | null
          location_name?: string | null
          notes?: string | null
          sort_order?: number
          start_time?: string | null
          title?: string
          updated_at?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_events_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      message_deliveries: {
        Row: {
          attempted_at: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          guest_id: string | null
          id: string
          message_id: string
          provider_message_id: string | null
          recipient_email: string
          recipient_name: string | null
          status: string
        }
        Insert: {
          attempted_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          guest_id?: string | null
          id?: string
          message_id: string
          provider_message_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          status?: string
        }
        Update: {
          attempted_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          guest_id?: string | null
          id?: string
          message_id?: string
          provider_message_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_deliveries_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_deliveries_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audience_filter: string | null
          body: string
          channel: string | null
          created_at: string | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          recipient_count: number | null
          recipient_filter: Json | null
          scheduled_for: string | null
          sending_finished_at: string | null
          sending_started_at: string | null
          sent_at: string | null
          status: string | null
          subject: string
          wedding_site_id: string
        }
        Insert: {
          audience_filter?: string | null
          body: string
          channel?: string | null
          created_at?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          recipient_count?: number | null
          recipient_filter?: Json | null
          scheduled_for?: string | null
          sending_finished_at?: string | null
          sending_started_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          wedding_site_id: string
        }
        Update: {
          audience_filter?: string | null
          body?: string
          channel?: string | null
          created_at?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          recipient_count?: number | null
          recipient_filter?: Json | null
          scheduled_for?: string | null
          sending_finished_at?: string | null
          sending_started_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      name_change_cases: {
        Row: {
          change_reasons: Json
          county_residence: string | null
          created_at: string
          current_first_name: string
          current_last_name: string
          current_middle_name: string | null
          email: string | null
          employment_status: string
          has_real_id_license: boolean
          has_us_passport: boolean
          id: string
          is_us_citizen: boolean
          latest_plan_summary: Json | null
          launch_state: string
          legal_basis: string
          marriage_date: string | null
          marriage_state: string | null
          passport_needs_update: boolean
          phone_last4: string | null
          structured_intake: Json
          target_first_name: string
          target_last_name: string
          target_middle_name: string | null
          updated_at: string
          urgency_level: string
          wedding_site_id: string
          workflow_status: string
        }
        Insert: {
          change_reasons?: Json
          county_residence?: string | null
          created_at?: string
          current_first_name?: string
          current_last_name?: string
          current_middle_name?: string | null
          email?: string | null
          employment_status?: string
          has_real_id_license?: boolean
          has_us_passport?: boolean
          id?: string
          is_us_citizen?: boolean
          latest_plan_summary?: Json | null
          launch_state?: string
          legal_basis?: string
          marriage_date?: string | null
          marriage_state?: string | null
          passport_needs_update?: boolean
          phone_last4?: string | null
          structured_intake?: Json
          target_first_name?: string
          target_last_name?: string
          target_middle_name?: string | null
          updated_at?: string
          urgency_level?: string
          wedding_site_id: string
          workflow_status?: string
        }
        Update: {
          change_reasons?: Json
          county_residence?: string | null
          created_at?: string
          current_first_name?: string
          current_last_name?: string
          current_middle_name?: string | null
          email?: string | null
          employment_status?: string
          has_real_id_license?: boolean
          has_us_passport?: boolean
          id?: string
          is_us_citizen?: boolean
          latest_plan_summary?: Json | null
          launch_state?: string
          legal_basis?: string
          marriage_date?: string | null
          marriage_state?: string | null
          passport_needs_update?: boolean
          phone_last4?: string | null
          structured_intake?: Json
          target_first_name?: string
          target_last_name?: string
          target_middle_name?: string | null
          updated_at?: string
          urgency_level?: string
          wedding_site_id?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "name_change_cases_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: true
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      name_change_documents: {
        Row: {
          created_at: string
          display_name: string
          document_kind: string
          expires_on: string | null
          extracted_snapshot: Json | null
          extraction_confidence: number | null
          file_name_masked: string | null
          id: string
          intake_status: string
          issued_on: string | null
          issuing_authority: string | null
          name_change_case_id: string
          storage_mode: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          document_kind: string
          expires_on?: string | null
          extracted_snapshot?: Json | null
          extraction_confidence?: number | null
          file_name_masked?: string | null
          id?: string
          intake_status?: string
          issued_on?: string | null
          issuing_authority?: string | null
          name_change_case_id: string
          storage_mode?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          document_kind?: string
          expires_on?: string | null
          extracted_snapshot?: Json | null
          extraction_confidence?: number | null
          file_name_masked?: string | null
          id?: string
          intake_status?: string
          issued_on?: string | null
          issuing_authority?: string | null
          name_change_case_id?: string
          storage_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "name_change_documents_name_change_case_id_fkey"
            columns: ["name_change_case_id"]
            isOneToOne: false
            referencedRelation: "name_change_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      name_change_extracted_fields: {
        Row: {
          created_at: string
          document_id: string | null
          field_key: string
          field_label: string
          field_value_masked: string
          id: string
          is_verified: boolean
          name_change_case_id: string
          source_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          field_key: string
          field_label?: string
          field_value_masked?: string
          id?: string
          is_verified?: boolean
          name_change_case_id: string
          source_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          field_key?: string
          field_label?: string
          field_value_masked?: string
          id?: string
          is_verified?: boolean
          name_change_case_id?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "name_change_extracted_fields_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "name_change_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "name_change_extracted_fields_name_change_case_id_fkey"
            columns: ["name_change_case_id"]
            isOneToOne: false
            referencedRelation: "name_change_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      name_change_plan_snapshots: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          name_change_case_id: string
          plan_payload: Json
        }
        Insert: {
          created_at?: string
          engine_version: string
          id?: string
          name_change_case_id: string
          plan_payload: Json
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          name_change_case_id?: string
          plan_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "name_change_plan_snapshots_name_change_case_id_fkey"
            columns: ["name_change_case_id"]
            isOneToOne: false
            referencedRelation: "name_change_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      name_change_reminders: {
        Row: {
          created_at: string
          depends_on_step_id: string
          id: string
          label: string
          name_change_case_id: string
          reason: string
          reminder_key: string
          status: string
          suggested_offset_days: number
          updated_at: string
          urgency: string
        }
        Insert: {
          created_at?: string
          depends_on_step_id?: string
          id?: string
          label?: string
          name_change_case_id: string
          reason?: string
          reminder_key: string
          status?: string
          suggested_offset_days?: number
          updated_at?: string
          urgency?: string
        }
        Update: {
          created_at?: string
          depends_on_step_id?: string
          id?: string
          label?: string
          name_change_case_id?: string
          reason?: string
          reminder_key?: string
          status?: string
          suggested_offset_days?: number
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "name_change_reminders_name_change_case_id_fkey"
            columns: ["name_change_case_id"]
            isOneToOne: false
            referencedRelation: "name_change_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_ai_bucket_corrections: {
        Row: {
          action: string
          chosen_bucket_id: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          previous_bucket_id: string | null
          reason: string | null
          suggested_bucket_id: string | null
          upload_id: string | null
          wedding_site_id: string
        }
        Insert: {
          action: string
          chosen_bucket_id?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          previous_bucket_id?: string | null
          reason?: string | null
          suggested_bucket_id?: string | null
          upload_id?: string | null
          wedding_site_id: string
        }
        Update: {
          action?: string
          chosen_bucket_id?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          previous_bucket_id?: string | null
          reason?: string | null
          suggested_bucket_id?: string | null
          upload_id?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_ai_bucket_corrections_chosen_bucket_id_fkey"
            columns: ["chosen_bucket_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_ai_bucket_corrections_previous_bucket_id_fkey"
            columns: ["previous_bucket_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_ai_bucket_corrections_suggested_bucket_id_fkey"
            columns: ["suggested_bucket_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_ai_bucket_corrections_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "photo_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_ai_bucket_corrections_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_albums: {
        Row: {
          ai_description: string | null
          ai_enabled: boolean
          bucket_type: string
          closes_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          hierarchy_label: string | null
          id: string
          is_active: boolean
          is_moment_bucket: boolean
          itinerary_event_id: string | null
          name: string
          opens_at: string | null
          parent_album_id: string | null
          slug: string | null
          sort_priority: number
          updated_at: string
          upload_token_hash: string | null
          wedding_site_id: string
        }
        Insert: {
          ai_description?: string | null
          ai_enabled?: boolean
          bucket_type?: string
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          hierarchy_label?: string | null
          id?: string
          is_active?: boolean
          is_moment_bucket?: boolean
          itinerary_event_id?: string | null
          name: string
          opens_at?: string | null
          parent_album_id?: string | null
          slug?: string | null
          sort_priority?: number
          updated_at?: string
          upload_token_hash?: string | null
          wedding_site_id: string
        }
        Update: {
          ai_description?: string | null
          ai_enabled?: boolean
          bucket_type?: string
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          hierarchy_label?: string | null
          id?: string
          is_active?: boolean
          is_moment_bucket?: boolean
          itinerary_event_id?: string | null
          name?: string
          opens_at?: string | null
          parent_album_id?: string | null
          slug?: string | null
          sort_priority?: number
          updated_at?: string
          upload_token_hash?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_albums_parent_album_id_fkey"
            columns: ["parent_album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_albums_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_upload_ai_analysis: {
        Row: {
          analyzed_at: string
          blur_score: number
          bucket_confidence: number
          caption: string | null
          created_at: string
          detected_moment: string | null
          error_message: string | null
          id: string
          is_video: boolean
          model: string
          people_count_range: string | null
          photo_album_id: string | null
          provider: string
          quality_score: number
          raw_result: Json
          slideshow_priority: number
          source_hash: string
          status: string
          suggested_bucket_id: string | null
          suggested_bucket_name: string | null
          tags: string[]
          updated_at: string
          upload_id: string
          warnings: string[]
          wedding_site_id: string
        }
        Insert: {
          analyzed_at?: string
          blur_score?: number
          bucket_confidence?: number
          caption?: string | null
          created_at?: string
          detected_moment?: string | null
          error_message?: string | null
          id?: string
          is_video?: boolean
          model?: string
          people_count_range?: string | null
          photo_album_id?: string | null
          provider?: string
          quality_score?: number
          raw_result?: Json
          slideshow_priority?: number
          source_hash: string
          status?: string
          suggested_bucket_id?: string | null
          suggested_bucket_name?: string | null
          tags?: string[]
          updated_at?: string
          upload_id: string
          warnings?: string[]
          wedding_site_id: string
        }
        Update: {
          analyzed_at?: string
          blur_score?: number
          bucket_confidence?: number
          caption?: string | null
          created_at?: string
          detected_moment?: string | null
          error_message?: string | null
          id?: string
          is_video?: boolean
          model?: string
          people_count_range?: string | null
          photo_album_id?: string | null
          provider?: string
          quality_score?: number
          raw_result?: Json
          slideshow_priority?: number
          source_hash?: string
          status?: string
          suggested_bucket_id?: string | null
          suggested_bucket_name?: string | null
          tags?: string[]
          updated_at?: string
          upload_id?: string
          warnings?: string[]
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_upload_ai_analysis_photo_album_id_fkey"
            columns: ["photo_album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_upload_ai_analysis_suggested_bucket_id_fkey"
            columns: ["suggested_bucket_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_upload_ai_analysis_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: true
            referencedRelation: "photo_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_upload_ai_analysis_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_upload_metadata: {
        Row: {
          camera_make: string | null
          camera_model: string | null
          created_at: string
          event_match_confidence: number | null
          event_match_id: string | null
          event_match_reason: string | null
          file_sha256: string
          gps_altitude: number | null
          gps_lat: number | null
          gps_lng: number | null
          has_exif: boolean
          has_gps: boolean
          height: number | null
          id: string
          location_label: string | null
          location_precision: string | null
          metadata_source: string
          orientation: number | null
          perceptual_hash: string | null
          photo_album_id: string | null
          raw_exif: Json
          taken_at: string | null
          updated_at: string
          upload_id: string
          wedding_site_id: string
          width: number | null
        }
        Insert: {
          camera_make?: string | null
          camera_model?: string | null
          created_at?: string
          event_match_confidence?: number | null
          event_match_id?: string | null
          event_match_reason?: string | null
          file_sha256: string
          gps_altitude?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          has_exif?: boolean
          has_gps?: boolean
          height?: number | null
          id?: string
          location_label?: string | null
          location_precision?: string | null
          metadata_source?: string
          orientation?: number | null
          perceptual_hash?: string | null
          photo_album_id?: string | null
          raw_exif?: Json
          taken_at?: string | null
          updated_at?: string
          upload_id: string
          wedding_site_id: string
          width?: number | null
        }
        Update: {
          camera_make?: string | null
          camera_model?: string | null
          created_at?: string
          event_match_confidence?: number | null
          event_match_id?: string | null
          event_match_reason?: string | null
          file_sha256?: string
          gps_altitude?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          has_exif?: boolean
          has_gps?: boolean
          height?: number | null
          id?: string
          location_label?: string | null
          location_precision?: string | null
          metadata_source?: string
          orientation?: number | null
          perceptual_hash?: string | null
          photo_album_id?: string | null
          raw_exif?: Json
          taken_at?: string | null
          updated_at?: string
          upload_id?: string
          wedding_site_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_upload_metadata_event_match_id_fkey"
            columns: ["event_match_id"]
            isOneToOne: false
            referencedRelation: "itinerary_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_upload_metadata_photo_album_id_fkey"
            columns: ["photo_album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_upload_metadata_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: true
            referencedRelation: "photo_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_upload_metadata_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_uploads: {
        Row: {
          album_id: string | null
          caption: string | null
          created_at: string
          drive_file_id: string | null
          drive_sync_deadline_at: string | null
          drive_sync_last_error: string | null
          drive_sync_status: string
          drive_synced_at: string | null
          drive_web_view_link: string | null
          fallback_storage_bucket: string | null
          fallback_storage_path: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          image_url: string | null
          is_flagged: boolean
          is_hidden: boolean
          mime_type: string | null
          moderated_at: string | null
          moderated_by: string | null
          note: string | null
          original_filename: string | null
          photo_album_id: string | null
          recap_curated_at: string | null
          recap_curated_by: string | null
          recap_featured: boolean
          recap_hidden: boolean
          recap_story: boolean
          size_bytes: number | null
          status: string
          storage_path: string | null
          updated_at: string
          uploaded_at: string | null
          wedding_site_id: string
        }
        Insert: {
          album_id?: string | null
          caption?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_sync_deadline_at?: string | null
          drive_sync_last_error?: string | null
          drive_sync_status?: string
          drive_synced_at?: string | null
          drive_web_view_link?: string | null
          fallback_storage_bucket?: string | null
          fallback_storage_path?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          image_url?: string | null
          is_flagged?: boolean
          is_hidden?: boolean
          mime_type?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          note?: string | null
          original_filename?: string | null
          photo_album_id?: string | null
          recap_curated_at?: string | null
          recap_curated_by?: string | null
          recap_featured?: boolean
          recap_hidden?: boolean
          recap_story?: boolean
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string | null
          wedding_site_id: string
        }
        Update: {
          album_id?: string | null
          caption?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_sync_deadline_at?: string | null
          drive_sync_last_error?: string | null
          drive_sync_status?: string
          drive_synced_at?: string | null
          drive_web_view_link?: string | null
          fallback_storage_bucket?: string | null
          fallback_storage_path?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          image_url?: string | null
          is_flagged?: boolean
          is_hidden?: boolean
          mime_type?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          note?: string | null
          original_filename?: string | null
          photo_album_id?: string | null
          recap_curated_at?: string | null
          recap_curated_by?: string | null
          recap_featured?: boolean
          recap_hidden?: boolean
          recap_story?: boolean
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_uploads_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_uploads_photo_album_id_fkey"
            columns: ["photo_album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_uploads_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          thumbnail_url: string | null
          uploaded_at: string | null
          url: string
          wedding_site_id: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          thumbnail_url?: string | null
          uploaded_at?: string | null
          url: string
          wedding_site_id: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          thumbnail_url?: string | null
          uploaded_at?: string | null
          url?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_budget_items: {
        Row: {
          actual_amount: number | null
          actual_cost: number | null
          category: string
          created_at: string
          estimated_amount: number | null
          estimated_cost: number | null
          id: string
          item_name: string
          notes: string | null
          paid_amount: number | null
          updated_at: string
          vendor_id: string | null
          wedding_site_id: string
        }
        Insert: {
          actual_amount?: number | null
          actual_cost?: number | null
          category?: string
          created_at?: string
          estimated_amount?: number | null
          estimated_cost?: number | null
          id?: string
          item_name?: string
          notes?: string | null
          paid_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
          wedding_site_id: string
        }
        Update: {
          actual_amount?: number | null
          actual_cost?: number | null
          category?: string
          created_at?: string
          estimated_amount?: number | null
          estimated_cost?: number | null
          id?: string
          item_name?: string
          notes?: string | null
          paid_amount?: number | null
          updated_at?: string
          vendor_id?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_budget_items_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_tasks: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          linked_event_id: string | null
          linked_vendor_id: string | null
          owner_name: string
          priority: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          wedding_site_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_event_id?: string | null
          linked_vendor_id?: string | null
          owner_name?: string
          priority?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          wedding_site_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_event_id?: string | null
          linked_vendor_id?: string | null
          owner_name?: string
          priority?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_tasks_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_vendors: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          balance_due: number | null
          category: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_total: number | null
          created_at: string
          document_label: string | null
          document_url: string | null
          due_date: string | null
          email: string | null
          id: string
          name: string
          next_payment_due: string | null
          notes: string | null
          updated_at: string
          vendor_type: string
          website: string | null
          wedding_site_id: string
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          balance_due?: number | null
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_total?: number | null
          created_at?: string
          document_label?: string | null
          document_url?: string | null
          due_date?: string | null
          email?: string | null
          id?: string
          name?: string
          next_payment_due?: string | null
          notes?: string | null
          updated_at?: string
          vendor_type?: string
          website?: string | null
          wedding_site_id: string
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          balance_due?: number | null
          category?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_total?: number | null
          created_at?: string
          document_label?: string | null
          document_url?: string | null
          due_date?: string | null
          email?: string | null
          id?: string
          name?: string
          next_payment_due?: string | null
          notes?: string | null
          updated_at?: string
          vendor_type?: string
          website?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_vendors_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      public_submission_events: {
        Row: {
          created_at: string
          id: string
          referrer: string | null
          requester_ip: string | null
          scope: string
          site_slug: string | null
          subject: string | null
          user_agent: string | null
          wedding_site_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referrer?: string | null
          requester_ip?: string | null
          scope: string
          site_slug?: string | null
          subject?: string | null
          user_agent?: string | null
          wedding_site_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referrer?: string | null
          requester_ip?: string | null
          scope?: string
          site_slug?: string | null
          subject?: string | null
          user_agent?: string | null
          wedding_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_submission_events_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      registry_items: {
        Row: {
          availability: string | null
          canonical_url: string | null
          created_at: string | null
          description: string | null
          fund_custom_label: string | null
          fund_custom_url: string | null
          fund_goal_amount: number | null
          fund_paypal_url: string | null
          fund_received_amount: number
          fund_venmo_url: string | null
          fund_zelle_handle: string | null
          hide_when_purchased: boolean
          id: string
          image_url: string | null
          item_name: string
          item_type: string
          item_url: string | null
          last_auto_refreshed_at: string | null
          merchant: string | null
          metadata_confidence_score: number | null
          metadata_fetch_status: string | null
          metadata_last_checked_at: string | null
          metadata_retailer: string | null
          metadata_source_method: string | null
          next_refresh_at: string | null
          notes: string | null
          previous_price_amount: number | null
          price: number | null
          price_amount: number | null
          price_label: string | null
          price_last_changed_at: string | null
          priority: string | null
          purchase_status: string
          purchaser_name: string | null
          quantity_needed: number | null
          quantity_purchased: number | null
          refresh_fail_count: number
          sort_order: number
          store_name: string | null
          updated_at: string
          wedding_site_id: string
        }
        Insert: {
          availability?: string | null
          canonical_url?: string | null
          created_at?: string | null
          description?: string | null
          fund_custom_label?: string | null
          fund_custom_url?: string | null
          fund_goal_amount?: number | null
          fund_paypal_url?: string | null
          fund_received_amount?: number
          fund_venmo_url?: string | null
          fund_zelle_handle?: string | null
          hide_when_purchased?: boolean
          id?: string
          image_url?: string | null
          item_name: string
          item_type?: string
          item_url?: string | null
          last_auto_refreshed_at?: string | null
          merchant?: string | null
          metadata_confidence_score?: number | null
          metadata_fetch_status?: string | null
          metadata_last_checked_at?: string | null
          metadata_retailer?: string | null
          metadata_source_method?: string | null
          next_refresh_at?: string | null
          notes?: string | null
          previous_price_amount?: number | null
          price?: number | null
          price_amount?: number | null
          price_label?: string | null
          price_last_changed_at?: string | null
          priority?: string | null
          purchase_status?: string
          purchaser_name?: string | null
          quantity_needed?: number | null
          quantity_purchased?: number | null
          refresh_fail_count?: number
          sort_order?: number
          store_name?: string | null
          updated_at?: string
          wedding_site_id: string
        }
        Update: {
          availability?: string | null
          canonical_url?: string | null
          created_at?: string | null
          description?: string | null
          fund_custom_label?: string | null
          fund_custom_url?: string | null
          fund_goal_amount?: number | null
          fund_paypal_url?: string | null
          fund_received_amount?: number
          fund_venmo_url?: string | null
          fund_zelle_handle?: string | null
          hide_when_purchased?: boolean
          id?: string
          image_url?: string | null
          item_name?: string
          item_type?: string
          item_url?: string | null
          last_auto_refreshed_at?: string | null
          merchant?: string | null
          metadata_confidence_score?: number | null
          metadata_fetch_status?: string | null
          metadata_last_checked_at?: string | null
          metadata_retailer?: string | null
          metadata_source_method?: string | null
          next_refresh_at?: string | null
          notes?: string | null
          previous_price_amount?: number | null
          price?: number | null
          price_amount?: number | null
          price_label?: string | null
          price_last_changed_at?: string | null
          priority?: string | null
          purchase_status?: string
          purchaser_name?: string | null
          quantity_needed?: number | null
          quantity_purchased?: number | null
          refresh_fail_count?: number
          sort_order?: number
          store_name?: string | null
          updated_at?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registry_items_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_conflicts: {
        Row: {
          attempted_payload: Json | null
          conflict_code: string
          created_at: string | null
          guest_id: string
          id: string
          message: string
          resolved: boolean | null
          resolved_at: string | null
          severity: string
          wedding_site_id: string
        }
        Insert: {
          attempted_payload?: Json | null
          conflict_code: string
          created_at?: string | null
          guest_id: string
          id?: string
          message: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
          wedding_site_id: string
        }
        Update: {
          attempted_payload?: Json | null
          conflict_code?: string
          created_at?: string | null
          guest_id?: string
          id?: string
          message?: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_conflicts_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_conflicts_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_waitlist_entries: {
        Row: {
          created_at: string
          guest_id: string
          id: string
          notes: string | null
          source: string
          status: string
          updated_at: string
          wedding_site_id: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          id?: string
          notes?: string | null
          source?: string
          status?: string
          updated_at?: string
          wedding_site_id: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          id?: string
          notes?: string | null
          source?: string
          status?: string
          updated_at?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_waitlist_entries_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_waitlist_entries_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          attending: boolean
          attending_ceremony: boolean | null
          attending_reception: boolean | null
          children_count: number | null
          conflict_flags: Json | null
          created_at: string | null
          custom_answers: Json
          guest_id: string
          id: string
          meal_choice: string | null
          notes: string | null
          plus_one_count: number | null
          plus_one_name: string | null
          responded_at: string | null
        }
        Insert: {
          attending: boolean
          attending_ceremony?: boolean | null
          attending_reception?: boolean | null
          children_count?: number | null
          conflict_flags?: Json | null
          created_at?: string | null
          custom_answers?: Json
          guest_id: string
          id?: string
          meal_choice?: string | null
          notes?: string | null
          plus_one_count?: number | null
          plus_one_name?: string | null
          responded_at?: string | null
        }
        Update: {
          attending?: boolean
          attending_ceremony?: boolean | null
          attending_reception?: boolean | null
          children_count?: number | null
          conflict_flags?: Json | null
          created_at?: string | null
          custom_answers?: Json
          guest_id?: string
          id?: string
          meal_choice?: string | null
          notes?: string | null
          plus_one_count?: number | null
          plus_one_name?: string | null
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_assignments: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          guest_id: string
          id: string
          is_valid: boolean
          seat_index: number | null
          seating_event_id: string
          table_id: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          guest_id: string
          id?: string
          is_valid?: boolean
          seat_index?: number | null
          seating_event_id: string
          table_id: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          guest_id?: string
          id?: string
          is_valid?: boolean
          seat_index?: number | null
          seating_event_id?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_assignments_seating_event_id_fkey"
            columns: ["seating_event_id"]
            isOneToOne: false
            referencedRelation: "seating_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_assignments_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "seating_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_events: {
        Row: {
          created_at: string
          default_table_capacity: number
          id: string
          itinerary_event_id: string | null
          notes: string
          updated_at: string
          wedding_site_id: string | null
        }
        Insert: {
          created_at?: string
          default_table_capacity?: number
          id?: string
          itinerary_event_id?: string | null
          notes?: string
          updated_at?: string
          wedding_site_id?: string | null
        }
        Update: {
          created_at?: string
          default_table_capacity?: number
          id?: string
          itinerary_event_id?: string | null
          notes?: string
          updated_at?: string
          wedding_site_id?: string | null
        }
        Relationships: []
      }
      seating_layout_versions: {
        Row: {
          assignments: Json
          created_at: string
          created_by: string | null
          id: string
          itinerary_event_id: string | null
          label: string
          restored_at: string | null
          seating_event_id: string
          tables: Json
          wedding_site_id: string
        }
        Insert: {
          assignments?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          itinerary_event_id?: string | null
          label: string
          restored_at?: string | null
          seating_event_id: string
          tables?: Json
          wedding_site_id: string
        }
        Update: {
          assignments?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          itinerary_event_id?: string | null
          label?: string
          restored_at?: string | null
          seating_event_id?: string
          tables?: Json
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_layout_versions_itinerary_event_id_fkey"
            columns: ["itinerary_event_id"]
            isOneToOne: false
            referencedRelation: "itinerary_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_layout_versions_seating_event_id_fkey"
            columns: ["seating_event_id"]
            isOneToOne: false
            referencedRelation: "seating_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_layout_versions_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          layout_height: number
          layout_width: number
          layout_x: number
          layout_y: number
          notes: string
          rotation_deg: number
          seating_event_id: string
          sort_order: number
          table_name: string
          table_shape: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          layout_height?: number
          layout_width?: number
          layout_x?: number
          layout_y?: number
          notes?: string
          rotation_deg?: number
          seating_event_id: string
          sort_order?: number
          table_name: string
          table_shape?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          layout_height?: number
          layout_width?: number
          layout_x?: number
          layout_y?: number
          notes?: string
          rotation_deg?: number
          seating_event_id?: string
          sort_order?: number
          table_name?: string
          table_shape?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seating_tables_seating_event_id_fkey"
            columns: ["seating_event_id"]
            isOneToOne: false
            referencedRelation: "seating_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          bindings: Json
          created_at: string
          data: Json
          id: string
          order: number
          schema_version: number
          site_id: string
          style_overrides: Json
          type: string
          updated_at: string
          variant: string
          visible: boolean
        }
        Insert: {
          bindings?: Json
          created_at?: string
          data?: Json
          id: string
          order?: number
          schema_version?: number
          site_id: string
          style_overrides?: Json
          type: string
          updated_at?: string
          variant?: string
          visible?: boolean
        }
        Update: {
          bindings?: Json
          created_at?: string
          data?: Json
          id?: string
          order?: number
          schema_version?: number
          site_id?: string
          style_overrides?: Json
          type?: string
          updated_at?: string
          variant?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sections_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          content: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_visible: boolean | null
          section_type: string
          title: string | null
          updated_at: string | null
          wedding_site_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          section_type: string
          title?: string | null
          updated_at?: string | null
          wedding_site_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          section_type?: string
          title?: string | null
          updated_at?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_content_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_rsvps: {
        Row: {
          created_at: string
          dietary_notes: string | null
          guest_count: number
          guest_name: string
          id: string
          rsvp_status: string
          wedding_site_id: string
        }
        Insert: {
          created_at?: string
          dietary_notes?: string | null
          guest_count?: number
          guest_name?: string
          id?: string
          rsvp_status?: string
          wedding_site_id: string
        }
        Update: {
          created_at?: string
          dietary_notes?: string | null
          guest_count?: number
          guest_name?: string
          id?: string
          rsvp_status?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_rsvps_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_translations: {
        Row: {
          created_at: string
          id: string
          language: string
          source_hash: string
          status: string
          translated_at: string
          translated_layout_config: Json | null
          translated_published_json: Json | null
          translated_site_json: Json | null
          translated_wedding_data: Json | null
          updated_at: string
          wedding_site_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language: string
          source_hash: string
          status?: string
          translated_at?: string
          translated_layout_config?: Json | null
          translated_published_json?: Json | null
          translated_site_json?: Json | null
          translated_wedding_data?: Json | null
          updated_at?: string
          wedding_site_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          source_hash?: string
          status?: string
          translated_at?: string
          translated_layout_config?: Json | null
          translated_published_json?: Json | null
          translated_site_json?: Json | null
          translated_wedding_data?: Json | null
          updated_at?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_translations_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_credit_transactions: {
        Row: {
          amount_cents: number | null
          created_at: string
          credits_delta: number
          expires_at: string | null
          id: string
          metadata: Json | null
          reason: string
          remaining_credits: number | null
          stripe_checkout_session_id: string | null
          wedding_site_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          credits_delta: number
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          remaining_credits?: number | null
          stripe_checkout_session_id?: string | null
          wedding_site_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          credits_delta?: number
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          remaining_credits?: number | null
          stripe_checkout_session_id?: string | null
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_credit_transactions_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_inbound_rsvp_events: {
        Row: {
          created_at: string
          from_number: string
          guest_id: string | null
          id: string
          interpreted_status: string | null
          message_sid: string | null
          normalized_body: string
          process_error: string | null
          process_result: string
          provider: string
          raw_body: string
          to_number: string | null
          wedding_site_id: string | null
        }
        Insert: {
          created_at?: string
          from_number: string
          guest_id?: string | null
          id?: string
          interpreted_status?: string | null
          message_sid?: string | null
          normalized_body: string
          process_error?: string | null
          process_result?: string
          provider?: string
          raw_body: string
          to_number?: string | null
          wedding_site_id?: string | null
        }
        Update: {
          created_at?: string
          from_number?: string
          guest_id?: string | null
          id?: string
          interpreted_status?: string | null
          message_sid?: string | null
          normalized_body?: string
          process_error?: string | null
          process_result?: string
          provider?: string
          raw_body?: string
          to_number?: string | null
          wedding_site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_inbound_rsvp_events_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_inbound_rsvp_events_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_configs: {
        Row: {
          created_at: string | null
          duration_years: number
          id: string
          is_enabled: boolean
          label: string
          unlock_at: string | null
          unlock_schedule_finalized_at: string | null
          updated_at: string | null
          vault_index: number
          wedding_site_id: string
        }
        Insert: {
          created_at?: string | null
          duration_years?: number
          id?: string
          is_enabled?: boolean
          label?: string
          unlock_at?: string | null
          unlock_schedule_finalized_at?: string | null
          updated_at?: string | null
          vault_index: number
          wedding_site_id: string
        }
        Update: {
          created_at?: string | null
          duration_years?: number
          id?: string
          is_enabled?: boolean
          label?: string
          unlock_at?: string | null
          unlock_schedule_finalized_at?: string | null
          updated_at?: string | null
          vault_index?: number
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_configs_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_entries: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          author_name: string
          content: string
          created_at: string | null
          duration_seconds: number | null
          external_file_id: string | null
          external_file_url: string | null
          id: string
          media_type: string
          mime_type: string | null
          size_bytes: number | null
          storage_provider: string
          title: string | null
          unlock_at: string | null
          vault_config_id: string | null
          vault_year: number
          wedding_site_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          author_name?: string
          content?: string
          created_at?: string | null
          duration_seconds?: number | null
          external_file_id?: string | null
          external_file_url?: string | null
          id?: string
          media_type?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_provider?: string
          title?: string | null
          unlock_at?: string | null
          vault_config_id?: string | null
          vault_year: number
          wedding_site_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          author_name?: string
          content?: string
          created_at?: string | null
          duration_seconds?: number | null
          external_file_id?: string | null
          external_file_url?: string | null
          id?: string
          media_type?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_provider?: string
          title?: string | null
          unlock_at?: string | null
          vault_config_id?: string | null
          vault_year?: number
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_entries_vault_config_id_fkey"
            columns: ["vault_config_id"]
            isOneToOne: false
            referencedRelation: "vault_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_entries_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_profile_inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          vendor_profile_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          vendor_profile_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          vendor_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_profile_inquiries_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_profiles: {
        Row: {
          about: string
          contact_email: string | null
          created_at: string
          created_by: string | null
          descriptor: string | null
          hero_image_url: string | null
          id: string
          image_urls: Json
          instagram_url: string | null
          slug: string
          source_payload: Json
          updated_at: string
          vendor_name: string
          website_url: string | null
        }
        Insert: {
          about: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          descriptor?: string | null
          hero_image_url?: string | null
          id?: string
          image_urls?: Json
          instagram_url?: string | null
          slug: string
          source_payload?: Json
          updated_at?: string
          vendor_name: string
          website_url?: string | null
        }
        Update: {
          about?: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          descriptor?: string | null
          hero_image_url?: string | null
          id?: string
          image_urls?: Json
          instagram_url?: string | null
          slug?: string
          source_payload?: Json
          updated_at?: string
          vendor_name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      wedding_site_collaborator_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          expires_at: string | null
          id: string
          invite_email: string
          invite_name: string | null
          invite_token: string
          invited_at: string
          invited_by: string
          permissions: Json
          revoked_at: string | null
          role: string
          status: string
          updated_at: string
          wedding_site_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          expires_at?: string | null
          id?: string
          invite_email: string
          invite_name?: string | null
          invite_token: string
          invited_at?: string
          invited_by: string
          permissions?: Json
          revoked_at?: string | null
          role: string
          status?: string
          updated_at?: string
          wedding_site_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          expires_at?: string | null
          id?: string
          invite_email?: string
          invite_name?: string | null
          invite_token?: string
          invited_at?: string
          invited_by?: string
          permissions?: Json
          revoked_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_site_collaborator_invites_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_site_collaborators: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          permissions: Json
          role: Database["public"]["Enums"]["collaborator_role"]
          updated_at: string
          user_id: string
          wedding_site_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["collaborator_role"]
          updated_at?: string
          user_id: string
          wedding_site_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["collaborator_role"]
          updated_at?: string
          user_id?: string
          wedding_site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_site_collaborators_wedding_site_id_fkey"
            columns: ["wedding_site_id"]
            isOneToOne: false
            referencedRelation: "wedding_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_sites: {
        Row: {
          active_template_id: string | null
          auto_reminders_enabled: boolean
          billing_type: string | null
          couple_email: string | null
          couple_first_name: string | null
          couple_name_1: string
          couple_name_2: string
          couple_second_name: string | null
          created_at: string | null
          default_language: string
          expected_guest_count: number | null
          guest_access_token: string | null
          hero_image_url: string | null
          hide_from_search: boolean
          id: string
          invitations_sent_date: string | null
          is_destination_wedding: boolean | null
          is_published: boolean
          layout_config: Json | null
          music_playlist_url: string | null
          notification_prefs: Json | null
          onboarding_answers: Json
          paid_at: string | null
          payment_status: string | null
          planning_status: string | null
          privacy_mode: string
          published_at: string | null
          published_json: Json | null
          registry_auto_refresh_enabled: boolean
          registry_monthly_refresh_cap: number
          registry_monthly_refresh_count: number
          registry_monthly_refresh_month: string | null
          registry_refresh_enabled_until: string | null
          registry_refresh_include_purchased: boolean
          registry_refresh_policy_updated_at: string | null
          registry_refresh_policy_updated_by: string | null
          reminder_cadence_days: number
          rsvp_capacity_limit: number | null
          rsvp_custom_questions: Json
          rsvp_meal_config: Json
          rsvp_waitlist_count: number
          rsvp_waitlist_enabled: boolean
          site_expires_at: string | null
          site_json: Json | null
          site_password_hash: string | null
          site_slug: string | null
          site_url: string | null
          sms_credits_balance: number
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          template_id: string | null
          theme_settings: Json | null
          updated_at: string | null
          user_id: string
          vault_google_drive_access_token: string | null
          vault_google_drive_connected: boolean
          vault_google_drive_refresh_token: string | null
          vault_google_drive_root_folder_id: string | null
          vault_google_drive_token_expires_at: string | null
          vault_storage_provider: string
          venue_address: string | null
          venue_date: string | null
          venue_latitude: number | null
          venue_location: string | null
          venue_longitude: number | null
          venue_name: string | null
          wedding_data: Json | null
          wedding_date: string | null
          wedding_location: string | null
        }
        Insert: {
          active_template_id?: string | null
          auto_reminders_enabled?: boolean
          billing_type?: string | null
          couple_email?: string | null
          couple_first_name?: string | null
          couple_name_1: string
          couple_name_2: string
          couple_second_name?: string | null
          created_at?: string | null
          default_language?: string
          expected_guest_count?: number | null
          guest_access_token?: string | null
          hero_image_url?: string | null
          hide_from_search?: boolean
          id?: string
          invitations_sent_date?: string | null
          is_destination_wedding?: boolean | null
          is_published?: boolean
          layout_config?: Json | null
          music_playlist_url?: string | null
          notification_prefs?: Json | null
          onboarding_answers?: Json
          paid_at?: string | null
          payment_status?: string | null
          planning_status?: string | null
          privacy_mode?: string
          published_at?: string | null
          published_json?: Json | null
          registry_auto_refresh_enabled?: boolean
          registry_monthly_refresh_cap?: number
          registry_monthly_refresh_count?: number
          registry_monthly_refresh_month?: string | null
          registry_refresh_enabled_until?: string | null
          registry_refresh_include_purchased?: boolean
          registry_refresh_policy_updated_at?: string | null
          registry_refresh_policy_updated_by?: string | null
          reminder_cadence_days?: number
          rsvp_capacity_limit?: number | null
          rsvp_custom_questions?: Json
          rsvp_meal_config?: Json
          rsvp_waitlist_count?: number
          rsvp_waitlist_enabled?: boolean
          site_expires_at?: string | null
          site_json?: Json | null
          site_password_hash?: string | null
          site_slug?: string | null
          site_url?: string | null
          sms_credits_balance?: number
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          template_id?: string | null
          theme_settings?: Json | null
          updated_at?: string | null
          user_id: string
          vault_google_drive_access_token?: string | null
          vault_google_drive_connected?: boolean
          vault_google_drive_refresh_token?: string | null
          vault_google_drive_root_folder_id?: string | null
          vault_google_drive_token_expires_at?: string | null
          vault_storage_provider?: string
          venue_address?: string | null
          venue_date?: string | null
          venue_latitude?: number | null
          venue_location?: string | null
          venue_longitude?: number | null
          venue_name?: string | null
          wedding_data?: Json | null
          wedding_date?: string | null
          wedding_location?: string | null
        }
        Update: {
          active_template_id?: string | null
          auto_reminders_enabled?: boolean
          billing_type?: string | null
          couple_email?: string | null
          couple_first_name?: string | null
          couple_name_1?: string
          couple_name_2?: string
          couple_second_name?: string | null
          created_at?: string | null
          default_language?: string
          expected_guest_count?: number | null
          guest_access_token?: string | null
          hero_image_url?: string | null
          hide_from_search?: boolean
          id?: string
          invitations_sent_date?: string | null
          is_destination_wedding?: boolean | null
          is_published?: boolean
          layout_config?: Json | null
          music_playlist_url?: string | null
          notification_prefs?: Json | null
          onboarding_answers?: Json
          paid_at?: string | null
          payment_status?: string | null
          planning_status?: string | null
          privacy_mode?: string
          published_at?: string | null
          published_json?: Json | null
          registry_auto_refresh_enabled?: boolean
          registry_monthly_refresh_cap?: number
          registry_monthly_refresh_count?: number
          registry_monthly_refresh_month?: string | null
          registry_refresh_enabled_until?: string | null
          registry_refresh_include_purchased?: boolean
          registry_refresh_policy_updated_at?: string | null
          registry_refresh_policy_updated_by?: string | null
          reminder_cadence_days?: number
          rsvp_capacity_limit?: number | null
          rsvp_custom_questions?: Json
          rsvp_meal_config?: Json
          rsvp_waitlist_count?: number
          rsvp_waitlist_enabled?: boolean
          site_expires_at?: string | null
          site_json?: Json | null
          site_password_hash?: string | null
          site_slug?: string | null
          site_url?: string | null
          sms_credits_balance?: number
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          template_id?: string | null
          theme_settings?: Json | null
          updated_at?: string | null
          user_id?: string
          vault_google_drive_access_token?: string | null
          vault_google_drive_connected?: boolean
          vault_google_drive_refresh_token?: string | null
          vault_google_drive_root_folder_id?: string | null
          vault_google_drive_token_expires_at?: string | null
          vault_storage_provider?: string
          venue_address?: string | null
          venue_date?: string | null
          venue_latitude?: number | null
          venue_location?: string | null
          venue_longitude?: number | null
          venue_name?: string | null
          wedding_data?: Json | null
          wedding_date?: string | null
          wedding_location?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_site_password: {
        Args: { p_password: string; p_slug: string }
        Returns: boolean
      }
      claim_collaborator_invite: {
        Args: { p_invite_token: string }
        Returns: {
          out_invite_id: string
          out_role: string
          out_wedding_site_id: string
        }[]
      }
      dayof_has_site_permission: {
        Args: { permission_key: string; site_id: string }
        Returns: boolean
      }
      dayof_has_site_role: {
        Args: { allowed: string[]; site_id: string }
        Returns: boolean
      }
      dayof_role_for_site: { Args: { site_id: string }; Returns: string }
      dayof_site_payment_active_for_access: {
        Args: { site_id: string }
        Returns: boolean
      }
      generate_secure_token: { Args: { byte_length?: number }; Returns: string }
      hash_site_password: { Args: { p_password: string }; Returns: string }
      increment_registry_purchase: {
        Args: {
          p_increment_by?: number
          p_item_id: string
          p_purchaser_name?: string
        }
        Returns: {
          availability: string | null
          canonical_url: string | null
          created_at: string | null
          description: string | null
          fund_custom_label: string | null
          fund_custom_url: string | null
          fund_goal_amount: number | null
          fund_paypal_url: string | null
          fund_received_amount: number
          fund_venmo_url: string | null
          fund_zelle_handle: string | null
          hide_when_purchased: boolean
          id: string
          image_url: string | null
          item_name: string
          item_type: string
          item_url: string | null
          last_auto_refreshed_at: string | null
          merchant: string | null
          metadata_confidence_score: number | null
          metadata_fetch_status: string | null
          metadata_last_checked_at: string | null
          metadata_retailer: string | null
          metadata_source_method: string | null
          next_refresh_at: string | null
          notes: string | null
          previous_price_amount: number | null
          price: number | null
          price_amount: number | null
          price_label: string | null
          price_last_changed_at: string | null
          priority: string | null
          purchase_status: string
          purchaser_name: string | null
          quantity_needed: number | null
          quantity_purchased: number | null
          refresh_fail_count: number
          sort_order: number
          store_name: string | null
          updated_at: string
          wedding_site_id: string
        }
        SetofOptions: {
          from: "*"
          to: "registry_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      collaborator_role: "owner" | "coordinator" | "viewer" | "planner"
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
      collaborator_role: ["owner", "coordinator", "viewer", "planner"],
    },
  },
} as const
