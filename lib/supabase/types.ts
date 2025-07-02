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
      topics: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string;
          trending: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category: string;
          trending?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: string;
          trending?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_models: {
        Row: {
          id: string;
          name: string;
          provider: 'openai' | 'gemini' | 'claude';
          description: string | null;
          avatar: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          provider: 'openai' | 'gemini' | 'claude';
          description?: string | null;
          avatar?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          provider?: 'openai' | 'gemini' | 'claude';
          description?: string | null;
          avatar?: string | null;
          created_at?: string;
        };
      };
      debates: {
        Row: {
          id: string;
          topic_id: string;
          pro_model_id: string;
          con_model_id: string;
          stage: 'setup' | 'opening' | 'rebuttal' | 'closing' | 'summary';
          current_speaker: 'pro' | 'con';
          winner: 'pro' | 'con' | 'draw' | null;
          summary: string | null;
          duration: number;
          start_time: string;
          end_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          pro_model_id: string;
          con_model_id: string;
          stage?: 'setup' | 'opening' | 'rebuttal' | 'closing' | 'summary';
          current_speaker?: 'pro' | 'con';
          winner?: 'pro' | 'con' | 'draw' | null;
          summary?: string | null;
          duration?: number;
          start_time?: string;
          end_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          pro_model_id?: string;
          con_model_id?: string;
          stage?: 'setup' | 'opening' | 'rebuttal' | 'closing' | 'summary';
          current_speaker?: 'pro' | 'con';
          winner?: 'pro' | 'con' | 'draw' | null;
          summary?: string | null;
          duration?: number;
          start_time?: string;
          end_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      debate_messages: {
        Row: {
          id: string;
          debate_id: string;
          speaker: 'pro' | 'con';
          ai_model_id: string;
          content: string;
          stage: 'setup' | 'opening' | 'rebuttal' | 'closing' | 'summary';
          reactions: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          debate_id: string;
          speaker: 'pro' | 'con';
          ai_model_id: string;
          content: string;
          stage: 'setup' | 'opening' | 'rebuttal' | 'closing' | 'summary';
          reactions?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          debate_id?: string;
          speaker?: 'pro' | 'con';
          ai_model_id?: string;
          content?: string;
          stage?: 'setup' | 'opening' | 'rebuttal' | 'closing' | 'summary';
          reactions?: number;
          created_at?: string;
        };
      };
      evidence: {
        Row: {
          id: string;
          message_id: string;
          url: string;
          title: string;
          source: string;
          snippet: string | null;
          credibility: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          url: string;
          title: string;
          source: string;
          snippet?: string | null;
          credibility?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          url?: string;
          title?: string;
          source?: string;
          snippet?: string | null;
          credibility?: number | null;
          created_at?: string;
        };
      };
      audience_questions: {
        Row: {
          id: string;
          debate_id: string;
          question: string;
          author: string;
          votes: number;
          answered: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          debate_id: string;
          question: string;
          author?: string;
          votes?: number;
          answered?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          debate_id?: string;
          question?: string;
          author?: string;
          votes?: number;
          answered?: boolean;
          created_at?: string;
        };
      };
      trending_topics: {
        Row: {
          id: string;
          keyword: string;
          trend: string;
          source: string;
          category: string;
          description: string | null;
          search_volume: number | null;
          news_count: number | null;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          keyword: string;
          trend: string;
          source: string;
          category: string;
          description?: string | null;
          search_volume?: number | null;
          news_count?: number | null;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          keyword?: string;
          trend?: string;
          source?: string;
          category?: string;
          description?: string | null;
          search_volume?: number | null;
          news_count?: number | null;
          last_updated?: string;
          created_at?: string;
        };
      };
      user_notes: {
        Row: {
          id: string;
          debate_id: string;
          content: string;
          author: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          debate_id: string;
          content: string;
          author?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          debate_id?: string;
          content?: string;
          author?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      debate_stage: 'setup' | 'opening' | 'rebuttal' | 'closing' | 'summary';
      ai_provider: 'openai' | 'gemini' | 'claude';
      speaker_role: 'pro' | 'con';
      debate_winner: 'pro' | 'con' | 'draw';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
