export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      chapters: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          chapter_id: string;
          stem: string;
          acs_code: string | null;
          figure_ref: string | null;
          figure_image_url: string | null;
          display_order: number;
          content_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          chapter_id: string;
          stem: string;
          acs_code?: string | null;
          figure_ref?: string | null;
          figure_image_url?: string | null;
          display_order?: number;
          content_version?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          chapter_id?: string;
          stem?: string;
          acs_code?: string | null;
          figure_ref?: string | null;
          figure_image_url?: string | null;
          display_order?: number;
          content_version?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey";
            columns: ["chapter_id"];
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          }
        ];
      };
      answer_options: {
        Row: {
          id: string;
          question_id: string;
          label: string;
          text: string;
          is_correct: boolean;
          why: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          label: string;
          text: string;
          is_correct?: boolean;
          why?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          label?: string;
          text?: string;
          is_correct?: boolean;
          why?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answer_options_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          }
        ];
      };
      question_content: {
        Row: {
          question_id: string;
          concept_tested: string | null;
          explanation: string | null;
          source_citation: string | null;
          memory_aid: string | null;
          key_takeaway: string | null;
          illustration_svg: string | null;
          audio_url: string | null;
          published: boolean;
          generated_at: string | null;
          created_at: string;
        };
        Insert: {
          question_id: string;
          concept_tested?: string | null;
          explanation?: string | null;
          source_citation?: string | null;
          memory_aid?: string | null;
          key_takeaway?: string | null;
          illustration_svg?: string | null;
          audio_url?: string | null;
          published?: boolean;
          generated_at?: string | null;
          created_at?: string;
        };
        Update: {
          question_id?: string;
          concept_tested?: string | null;
          explanation?: string | null;
          source_citation?: string | null;
          memory_aid?: string | null;
          key_takeaway?: string | null;
          illustration_svg?: string | null;
          audio_url?: string | null;
          published?: boolean;
          generated_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_content_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      attempts: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          selected_label: string;
          is_correct: boolean;
          answered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          selected_label: string;
          is_correct: boolean;
          answered_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_id?: string;
          selected_label?: string;
          is_correct?: boolean;
          answered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_question_id_fkey";
            columns: ["question_id"];
            referencedRelation: "questions";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
