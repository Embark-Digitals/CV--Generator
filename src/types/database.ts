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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_runs: {
        Row: {
          completion_tokens: number | null
          created_at: string
          duration_ms: number | null
          error_code: string | null
          id: string
          input_hash: string | null
          kind: Database["public"]["Enums"]["ai_run_kind"]
          model: string
          prompt_tokens: number | null
          status: Database["public"]["Enums"]["ai_run_status"]
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          input_hash?: string | null
          kind: Database["public"]["Enums"]["ai_run_kind"]
          model: string
          prompt_tokens?: number | null
          status?: Database["public"]["Enums"]["ai_run_status"]
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          input_hash?: string | null
          kind?: Database["public"]["Enums"]["ai_run_kind"]
          model?: string
          prompt_tokens?: number | null
          status?: Database["public"]["Enums"]["ai_run_status"]
          user_id?: string
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          ai_run_id: string | null
          confidence: number | null
          created_at: string
          evidence_ids: string[]
          final_text: string | null
          id: string
          job_application_id: string
          original_text: string
          proposed_text: string
          reason: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["suggestion_status"]
          tailored_cv_id: string
          target_record_id: string | null
          target_record_type: string | null
          target_section: string
          updated_at: string
          user_id: string
          validation_passed: boolean
          validation_result: Json
        }
        Insert: {
          ai_run_id?: string | null
          confidence?: number | null
          created_at?: string
          evidence_ids?: string[]
          final_text?: string | null
          id?: string
          job_application_id: string
          original_text?: string
          proposed_text: string
          reason?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          tailored_cv_id: string
          target_record_id?: string | null
          target_record_type?: string | null
          target_section: string
          updated_at?: string
          user_id: string
          validation_passed?: boolean
          validation_result?: Json
        }
        Update: {
          ai_run_id?: string | null
          confidence?: number | null
          created_at?: string
          evidence_ids?: string[]
          final_text?: string | null
          id?: string
          job_application_id?: string
          original_text?: string
          proposed_text?: string
          reason?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["suggestion_status"]
          tailored_cv_id?: string
          target_record_id?: string | null
          target_record_type?: string | null
          target_section?: string
          updated_at?: string
          user_id?: string
          validation_passed?: boolean
          validation_result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_tailored_cv_id_fkey"
            columns: ["tailored_cv_id"]
            isOneToOne: false
            referencedRelation: "tailored_cvs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          job_application_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          job_application_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          job_application_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string
          credential_reference: string | null
          display_order: number
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          name: string
          source: Database["public"]["Enums"]["record_source"]
          source_document_id: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          created_at?: string
          credential_reference?: string | null
          display_order?: number
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name: string
          source?: Database["public"]["Enums"]["record_source"]
          source_document_id?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          created_at?: string
          credential_reference?: string | null
          display_order?: number
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name?: string
          source?: Database["public"]["Enums"]["record_source"]
          source_document_id?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "certifications_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmation_questions: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          job_application_id: string
          job_requirement_id: string | null
          question: string
          status: Database["public"]["Enums"]["question_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          job_application_id: string
          job_requirement_id?: string | null
          question: string
          status?: Database["public"]["Enums"]["question_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          job_application_id?: string
          job_requirement_id?: string | null
          question?: string
          status?: Database["public"]["Enums"]["question_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_questions_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmation_questions_job_requirement_id_fkey"
            columns: ["job_requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_sections: {
        Row: {
          content: Json
          created_at: string
          display_order: number
          id: string
          section_key: string
          tailored_cv_id: string
          title: string | null
          updated_at: string
          user_id: string
          visible: boolean
        }
        Insert: {
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          section_key: string
          tailored_cv_id: string
          title?: string | null
          updated_at?: string
          user_id: string
          visible?: boolean
        }
        Update: {
          content?: Json
          created_at?: string
          display_order?: number
          id?: string
          section_key?: string
          tailored_cv_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cv_sections_tailored_cv_id_fkey"
            columns: ["tailored_cv_id"]
            isOneToOne: false
            referencedRelation: "tailored_cvs"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_versions: {
        Row: {
          accepted_suggestion_ids: string[]
          advert_text_hash: string | null
          created_at: string
          document: Json
          id: string
          job_application_id: string
          locked_at: string | null
          master_snapshot: Json
          status: Database["public"]["Enums"]["cv_status"]
          submitted_at: string | null
          tailored_cv_id: string
          template: string
          updated_at: string
          user_id: string
          version_number: number
          visibility_settings: Json
        }
        Insert: {
          accepted_suggestion_ids?: string[]
          advert_text_hash?: string | null
          created_at?: string
          document: Json
          id?: string
          job_application_id: string
          locked_at?: string | null
          master_snapshot?: Json
          status?: Database["public"]["Enums"]["cv_status"]
          submitted_at?: string | null
          tailored_cv_id: string
          template?: string
          updated_at?: string
          user_id: string
          version_number: number
          visibility_settings?: Json
        }
        Update: {
          accepted_suggestion_ids?: string[]
          advert_text_hash?: string | null
          created_at?: string
          document?: Json
          id?: string
          job_application_id?: string
          locked_at?: string | null
          master_snapshot?: Json
          status?: Database["public"]["Enums"]["cv_status"]
          submitted_at?: string | null
          tailored_cv_id?: string
          template?: string
          updated_at?: string
          user_id?: string
          version_number?: number
          visibility_settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cv_versions_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_versions_tailored_cv_id_fkey"
            columns: ["tailored_cv_id"]
            isOneToOne: false
            referencedRelation: "tailored_cvs"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          created_at: string
          display_order: number
          end_date: string | null
          field_of_study: string | null
          grade: string | null
          id: string
          institution: string
          qualification: string
          source: Database["public"]["Enums"]["record_source"]
          source_document_id: string | null
          start_date: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          created_at?: string
          display_order?: number
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution: string
          qualification: string
          source?: Database["public"]["Enums"]["record_source"]
          source_document_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          created_at?: string
          display_order?: number
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution?: string
          qualification?: string
          source?: Database["public"]["Enums"]["record_source"]
          source_document_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "education_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_bullets: {
        Row: {
          content: string
          created_at: string
          display_order: number
          experience_id: string
          id: string
          source: Database["public"]["Enums"]["record_source"]
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          experience_id: string
          id?: string
          source?: Database["public"]["Enums"]["record_source"]
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          experience_id?: string
          id?: string
          source?: Database["public"]["Enums"]["record_source"]
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "experience_bullets_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          company: string
          created_at: string
          display_order: number
          employment_type: string | null
          end_date: string | null
          id: string
          is_current: boolean
          location: string | null
          source: Database["public"]["Enums"]["record_source"]
          source_document_id: string | null
          start_date: string | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          company: string
          created_at?: string
          display_order?: number
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          source?: Database["public"]["Enums"]["record_source"]
          source_document_id?: string | null
          start_date?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          company?: string
          created_at?: string
          display_order?: number
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          source?: Database["public"]["Enums"]["record_source"]
          source_document_id?: string | null
          start_date?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "experiences_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          created_at: string
          cv_version_id: string | null
          file_name: string
          format: Database["public"]["Enums"]["export_format"]
          id: string
          job_application_id: string | null
          storage_path: string
          tailored_cv_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          cv_version_id?: string | null
          file_name: string
          format: Database["public"]["Enums"]["export_format"]
          id?: string
          job_application_id?: string | null
          storage_path: string
          tailored_cv_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          cv_version_id?: string | null
          file_name?: string
          format?: Database["public"]["Enums"]["export_format"]
          id?: string
          job_application_id?: string | null
          storage_path?: string
          tailored_cv_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exports_cv_version_id_fkey"
            columns: ["cv_version_id"]
            isOneToOne: false
            referencedRelation: "cv_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exports_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exports_tailored_cv_id_fkey"
            columns: ["tailored_cv_id"]
            isOneToOne: false
            referencedRelation: "tailored_cvs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_analysis_runs: {
        Row: {
          ai_run_id: string | null
          alignment_score: number | null
          created_at: string
          id: string
          input_hash: string
          job_application_id: string
          summary: Json
          user_id: string
        }
        Insert: {
          ai_run_id?: string | null
          alignment_score?: number | null
          created_at?: string
          id?: string
          input_hash: string
          job_application_id: string
          summary?: Json
          user_id: string
        }
        Update: {
          ai_run_id?: string | null
          alignment_score?: number | null
          created_at?: string
          id?: string
          input_hash?: string
          job_application_id?: string
          summary?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_analysis_runs_ai_run_id_fkey"
            columns: ["ai_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_analysis_runs_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          advert_document_id: string | null
          advert_source: string | null
          advert_text: string | null
          advert_text_hash: string | null
          applied_at: string | null
          closing_date: string | null
          company: string
          created_at: string
          employment_type: string | null
          id: string
          job_title: string
          location: string | null
          seniority: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_cv_version_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advert_document_id?: string | null
          advert_source?: string | null
          advert_text?: string | null
          advert_text_hash?: string | null
          applied_at?: string | null
          closing_date?: string | null
          company: string
          created_at?: string
          employment_type?: string | null
          id?: string
          job_title: string
          location?: string | null
          seniority?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_cv_version_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advert_document_id?: string | null
          advert_source?: string | null
          advert_text?: string | null
          advert_text_hash?: string | null
          applied_at?: string | null
          closing_date?: string | null
          company?: string
          created_at?: string
          employment_type?: string | null
          id?: string
          job_title?: string
          location?: string | null
          seniority?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_cv_version_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_advert_document_id_fkey"
            columns: ["advert_document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_submitted_version_fkey"
            columns: ["submitted_cv_version_id"]
            isOneToOne: false
            referencedRelation: "cv_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requirements: {
        Row: {
          alignment: Database["public"]["Enums"]["alignment_status"] | null
          alignment_note: string | null
          created_at: string
          description: string
          display_order: number
          evidence_ids: string[]
          id: string
          job_application_id: string
          kind: Database["public"]["Enums"]["requirement_kind"]
          priority: Database["public"]["Enums"]["requirement_priority"]
          source: Database["public"]["Enums"]["record_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          alignment?: Database["public"]["Enums"]["alignment_status"] | null
          alignment_note?: string | null
          created_at?: string
          description: string
          display_order?: number
          evidence_ids?: string[]
          id?: string
          job_application_id: string
          kind?: Database["public"]["Enums"]["requirement_kind"]
          priority?: Database["public"]["Enums"]["requirement_priority"]
          source?: Database["public"]["Enums"]["record_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          alignment?: Database["public"]["Enums"]["alignment_status"] | null
          alignment_note?: string | null
          created_at?: string
          description?: string
          display_order?: number
          evidence_ids?: string[]
          id?: string
          job_application_id?: string
          kind?: Database["public"]["Enums"]["requirement_kind"]
          priority?: Database["public"]["Enums"]["requirement_priority"]
          source?: Database["public"]["Enums"]["record_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requirements_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_visibility_settings: {
        Row: {
          address_mode: Database["public"]["Enums"]["address_visibility"]
          created_at: string
          references_mode: Database["public"]["Enums"]["references_visibility"]
          show_date_of_birth: boolean
          show_drivers_licence: boolean
          show_email: boolean
          show_gender: boolean
          show_nationality: boolean
          show_phone: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          address_mode?: Database["public"]["Enums"]["address_visibility"]
          created_at?: string
          references_mode?: Database["public"]["Enums"]["references_visibility"]
          show_date_of_birth?: boolean
          show_drivers_licence?: boolean
          show_email?: boolean
          show_gender?: boolean
          show_nationality?: boolean
          show_phone?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          address_mode?: Database["public"]["Enums"]["address_visibility"]
          created_at?: string
          references_mode?: Database["public"]["Enums"]["references_visibility"]
          show_date_of_birth?: boolean
          show_drivers_licence?: boolean
          show_email?: boolean
          show_gender?: boolean
          show_nationality?: boolean
          show_phone?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          drivers_licence: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          headline: string | null
          id: string
          last_name: string | null
          nationality: string | null
          phone: string | null
          postal_code: string | null
          professional_summary: string | null
          region: string | null
          source: Database["public"]["Enums"]["record_source"]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          drivers_licence?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          headline?: string | null
          id: string
          last_name?: string | null
          nationality?: string | null
          phone?: string | null
          postal_code?: string | null
          professional_summary?: string | null
          region?: string | null
          source?: Database["public"]["Enums"]["record_source"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          address_line?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          drivers_licence?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          headline?: string | null
          id?: string
          last_name?: string | null
          nationality?: string | null
          phone?: string | null
          postal_code?: string | null
          professional_summary?: string | null
          region?: string | null
          source?: Database["public"]["Enums"]["record_source"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      references: {
        Row: {
          company: string | null
          created_at: string
          display_order: number
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          relationship: string | null
          source: Database["public"]["Enums"]["record_source"]
          source_document_id: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          company?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          source?: Database["public"]["Enums"]["record_source"]
          source_document_id?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          company?: string | null
          created_at?: string
          display_order?: number
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          relationship?: string | null
          source?: Database["public"]["Enums"]["record_source"]
          source_document_id?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "references_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          display_order: number
          id: string
          kind: Database["public"]["Enums"]["skill_kind"]
          name: string
          source: Database["public"]["Enums"]["record_source"]
          source_document_id: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          kind?: Database["public"]["Enums"]["skill_kind"]
          name: string
          source?: Database["public"]["Enums"]["record_source"]
          source_document_id?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          kind?: Database["public"]["Enums"]["skill_kind"]
          name?: string
          source?: Database["public"]["Enums"]["record_source"]
          source_document_id?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "skills_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      tailored_cvs: {
        Row: {
          created_at: string
          document: Json
          id: string
          job_application_id: string
          status: Database["public"]["Enums"]["cv_status"]
          template: string
          title: string
          updated_at: string
          user_id: string
          visibility_overrides: Json
        }
        Insert: {
          created_at?: string
          document?: Json
          id?: string
          job_application_id: string
          status?: Database["public"]["Enums"]["cv_status"]
          template?: string
          title?: string
          updated_at?: string
          user_id: string
          visibility_overrides?: Json
        }
        Update: {
          created_at?: string
          document?: Json
          id?: string
          job_application_id?: string
          status?: Database["public"]["Enums"]["cv_status"]
          template?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility_overrides?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tailored_cvs_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      template_preferences: {
        Row: {
          created_at: string
          font_family: string
          font_size: number
          line_spacing: number
          margin_preset: string
          page_size: string
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          font_family?: string
          font_size?: number
          line_spacing?: number
          margin_preset?: string
          page_size?: string
          template?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          font_family?: string
          font_size?: number
          line_spacing?: number
          margin_preset?: string
          page_size?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      uploaded_documents: {
        Row: {
          created_at: string
          extracted_text: string | null
          file_name: string
          id: string
          job_application_id: string | null
          kind: Database["public"]["Enums"]["document_kind"]
          mime_type: string
          size_bytes: number
          storage_path: string
          text_hash: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          file_name: string
          id?: string
          job_application_id?: string | null
          kind: Database["public"]["Enums"]["document_kind"]
          mime_type: string
          size_bytes: number
          storage_path: string
          text_hash?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          id?: string
          job_application_id?: string | null
          kind?: Database["public"]["Enums"]["document_kind"]
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          text_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_documents_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_confirmed_evidence: {
        Row: {
          confirmation_question_id: string | null
          created_at: string
          description: string
          id: string
          related_record_id: string | null
          related_record_type: string | null
          user_id: string
        }
        Insert: {
          confirmation_question_id?: string | null
          created_at?: string
          description: string
          id?: string
          related_record_id?: string | null
          related_record_type?: string | null
          user_id: string
        }
        Update: {
          confirmation_question_id?: string | null
          created_at?: string
          description?: string
          id?: string
          related_record_id?: string | null
          related_record_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_confirmed_evidence_confirmation_question_id_fkey"
            columns: ["confirmation_question_id"]
            isOneToOne: false
            referencedRelation: "confirmation_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_authorised: { Args: never; Returns: boolean }
    }
    Enums: {
      address_visibility: "full" | "city_only" | "hidden"
      ai_run_kind:
        | "profile_extraction"
        | "job_extraction"
        | "alignment"
        | "suggestion"
        | "assistant"
      ai_run_status:
        | "pending"
        | "success"
        | "error"
        | "timeout"
        | "rate_limited"
      alignment_status:
        | "supported"
        | "partially_supported"
        | "not_evidenced"
        | "needs_confirmation"
      application_status:
        | "considering"
        | "preparing"
        | "ready_to_apply"
        | "applied"
        | "interview"
        | "assessment"
        | "offer"
        | "unsuccessful"
        | "withdrawn"
        | "archived"
      cv_status: "draft" | "ready" | "locked" | "submitted" | "archived"
      document_kind: "source_cv" | "job_advert"
      export_format: "pdf" | "docx"
      question_status: "pending" | "answered" | "dismissed"
      record_source: "cv_import" | "manual" | "ai" | "user_confirmation"
      references_visibility: "full" | "on_request" | "hidden"
      requirement_kind:
        | "qualification"
        | "experience"
        | "skill"
        | "system"
        | "responsibility"
        | "regulatory"
        | "licence"
        | "industry_term"
        | "submission"
        | "other"
      requirement_priority: "required" | "preferred"
      skill_kind: "skill" | "system"
      suggestion_status: "pending" | "accepted" | "rejected" | "manually_edited"
      verification_status:
        | "pending_verification"
        | "verified"
        | "user_confirmed"
        | "rejected"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      address_visibility: ["full", "city_only", "hidden"],
      ai_run_kind: [
        "profile_extraction",
        "job_extraction",
        "alignment",
        "suggestion",
        "assistant",
      ],
      ai_run_status: ["pending", "success", "error", "timeout", "rate_limited"],
      alignment_status: [
        "supported",
        "partially_supported",
        "not_evidenced",
        "needs_confirmation",
      ],
      application_status: [
        "considering",
        "preparing",
        "ready_to_apply",
        "applied",
        "interview",
        "assessment",
        "offer",
        "unsuccessful",
        "withdrawn",
        "archived",
      ],
      cv_status: ["draft", "ready", "locked", "submitted", "archived"],
      document_kind: ["source_cv", "job_advert"],
      export_format: ["pdf", "docx"],
      question_status: ["pending", "answered", "dismissed"],
      record_source: ["cv_import", "manual", "ai", "user_confirmation"],
      references_visibility: ["full", "on_request", "hidden"],
      requirement_kind: [
        "qualification",
        "experience",
        "skill",
        "system",
        "responsibility",
        "regulatory",
        "licence",
        "industry_term",
        "submission",
        "other",
      ],
      requirement_priority: ["required", "preferred"],
      skill_kind: ["skill", "system"],
      suggestion_status: ["pending", "accepted", "rejected", "manually_edited"],
      verification_status: [
        "pending_verification",
        "verified",
        "user_confirmed",
        "rejected",
      ],
    },
  },
} as const
